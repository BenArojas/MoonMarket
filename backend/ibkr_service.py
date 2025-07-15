# models.py  – pydantic versions
import asyncio
import contextlib
from datetime import datetime
import json
import logging
import math
import re
import ssl
from fastapi import HTTPException
import httpx
from pydantic import BaseModel, Field
from typing import Awaitable, Callable, Optional, List, Dict, Any
import websockets
from utils import safe_float_conversion
from models import AccountDetailsDTO, AccountInfoDTO, AccountSummaryData, BriefAccountInfoDTO, FrontendMarketDataUpdate, LedgerDTO, LedgerEntry, LedgerUpdate, OwnerInfoDTO, PermissionsDTO, PnlRow, PnlUpdate
from cache import account_specific_key_builder, cached, history_cache_key_builder
from rate_control import paced


        
log = logging.getLogger("ibkr.ws")   # dedicate a channel for WS payloads

class IBKRConfig(BaseModel):
    host: str                  = Field(..., examples=["127.0.0.1"])
    port: int                  = Field(..., examples=[4002])

class IBKRState(BaseModel):
    
    ibkr_authenticated: bool = False
    ibkr_session_token: Optional[str] = None
    ws_connected: bool = False
    account_id: Optional[str] = None
    positions: Dict[str, List[Dict[str, Any]]] = Field(default_factory=dict)
    accounts_fetched: bool = False
    accounts_cache: List[Dict[str, Any]] = Field(default_factory=list)
    allocation: Dict[str, Optional[dict]] = Field(default_factory=dict)
    ledger: Dict[str, Optional[dict]] = Field(default_factory=dict)
    combo_positions: list[dict] = Field(default_factory=list)
    watchlists: list[dict] = Field(default_factory=list)
    pnl: Dict[str, Dict[str, PnlRow]] = Field(default_factory=dict) # PnL is often per-account already

class AuthStatusDTO(BaseModel):
    authenticated: bool
    websocket_ready: bool
    message: str

class IBKRService:
    def __init__(self, base_url: str = "https://localhost:5000/v1/api"):
        self.base_url = base_url.rstrip("/")
        self.state = IBKRState()
        self.http = httpx.AsyncClient(base_url=self.base_url, verify=False,
                                      timeout=httpx.Timeout(30.0),
                                      headers={"Host": "api.ibkr.com"})
        self._ws_task: asyncio.Task | None = None
        self._current_ws_account: str | None = None
    
    def set_broadcast(self, cb: Callable[[str], Awaitable[None]]) -> None:
        self._broadcast = cb

    # ---------- low-level helpers ----------
    @paced("dynamic")
    async def _req(self, method: str, ep: str, **kw):
        max_retries = 3
        retry_delay = 2  # seconds

        for attempt in range(max_retries):
            try:
                r = await self.http.request(method, ep, **kw)
                
                # Check for 503 specifically on the history endpoint
                if r.status_code == 503 and "/iserver/marketdata/history" in ep:
                    if attempt < max_retries - 1:
                        log.warning(f"Received 503 for {ep}. Retrying in {retry_delay}s... ({attempt + 1}/{max_retries})")
                        await asyncio.sleep(retry_delay)
                        continue # Go to the next iteration of the loop to retry
                    else:
                        log.error(f"Failed to fetch {ep} after {max_retries} attempts due to 503 error.")

                if r.status_code >= 400:
                    log.error("IBKR %s %s → %s", method, ep, r.text)
                
                r.raise_for_status()
                return r.json()

            except httpx.ConnectError as e:
                log.error(f"Connection error on attempt {attempt + 1}: {e}")
                if attempt < max_retries - 1:
                    await asyncio.sleep(retry_delay)
                else:
                    raise # Re-raise the exception if all retries fail
        
        # This part will be reached if all retries fail with 503
        raise HTTPException(status_code=503, detail="The data provider is temporarily unavailable.")

    # ---------- auth flow ----------
    async def sso_validate(self) -> bool:
        try:
            await self._req("GET", "/sso/validate")
            return True
        except httpx.HTTPStatusError as exc:
            if exc.response.status_code == 401:
                return False
            raise

    async def tickle(self) -> bool:
        data = await self._req("POST", "/tickle")
        self.state.ibkr_authenticated = True
        self.state.ibkr_session_token = data.get("session")
        return True
    
    async def ensure_accounts(self):
        # if not self.state.accounts_fetched:
        #     log.info("Priming IBKR session by calling /iserver/accounts")
        self.state.accounts_cache = await self._req("GET", "/iserver/accounts")
        self.state.accounts_fetched = True

    async def auth_status(self) -> dict:
        """Calls the official /iserver/auth/status endpoint to get the true session status."""
        try:
            # This is the dedicated endpoint for checking authentication status.
            return await self._req("POST", "/iserver/auth/status")
        except Exception as e:
            log.warning(f"Could not retrieve auth status from IBKR: {e}")
            # If the call itself fails (e.g., network error, 401),
            # return a default "not authenticated" structure.
            return {"authenticated": False, "connected": False, "message": "Failed to contact auth server."}
    
    async def check_and_authenticate(self) -> AuthStatusDTO:
        """
        Checks auth status using the official /iserver/auth/status endpoint.
        This is the most reliable and direct method.
        """
        # 1. Get the official status from the new method.
        status = await self.auth_status()
        
        # 2. The official endpoint tells us everything we need.
        is_authenticated = status.get("authenticated", False)
        is_connected = status.get("connected", False)

        # A session is only truly usable if it's both authenticated AND connected.
        is_session_valid = is_authenticated and is_connected
        
        # 3. Update our internal state to match the ground truth.
        self.state.ibkr_authenticated = is_session_valid
        if not is_session_valid:
            self.state.ibkr_session_token = None

        # 4. Return the status to the frontend.
        return AuthStatusDTO(
            authenticated=is_session_valid,
            websocket_ready=self.state.ws_connected,
            message=status.get("message", "Status checked.")
        )
        
    async def logout(self):
        """
        Logs out from the IBKR session and clears the local service state.
        """
        try:
            log.info("Calling IBKR API to terminate session...")
            # Your existing API call to IBKR
            response = await self._req("POST", "/logout")
            log.info("Successfully logged out from IBKR API.")
            return response
        except Exception as e:
            log.error(f"Error during IBKR API logout call: {e}")
            # We still proceed to the finally block to ensure local state is cleared
            raise
        finally:
            # This block runs NO MATTER WHAT, guaranteeing a clean state.
            log.info("Clearing local IBKR session state.")
            self.state.ibkr_authenticated = False
            self.state.ibkr_session_token = None
            self.state.accounts_cache.clear()
    
    # scanner ----------------------------------------------------------

    @cached(ttl=3600)
    async def get_scanner_params(self):
        """Fetches the available parameters for the market scanner."""
        log.info("Fetching IServer scanner parameters...")
        return await self._req("GET", "/iserver/scanner/params")

    async def run_scanner(self, scanner_payload: dict):
        """
        Runs a market scan with the given payload.
        :param scanner_payload: A dict like {"instrument": "STK", "type": "TOP_PERC_GAIN", ...}
        """
        log.info("Running IServer scanner with payload: %s", scanner_payload)
        return await self._req("POST", "/iserver/scanner/run", json=scanner_payload)
    # market ----------------------------------------------------------
    @cached(ttl=3600, key_builder=account_specific_key_builder)
    async def get_conid(self, symbol: str, sec_type: str = "STK") -> str | None:
        try:
            res = await self._req(
                "GET",
                "/iserver/secdef/search",
                params={"symbol": symbol, "secType": sec_type},
            )
            return res[0]["conid"] if res else None
        except httpx.HTTPStatusError as exc:
            log.warning("secdef search failed %s %s", exc.response.status_code, symbol)
            return None

    async def check_market_data_availability(self, conid):
        """Check what market data is available for a contract"""
        q = {"conids": str(conid), "fields": "6509"}  # Just get availability field
        response = await self._req("GET", "/iserver/marketdata/snapshot", params=q)
        if response and len(response) > 0 and "6509" in response[0]:
            availability = response[0]["6509"]
            log.info(f"Market data availability for {conid}: {availability}")
            return availability
        return None

    @cached(ttl=150, key_builder=account_specific_key_builder)
    async def snapshot(self, conids, fields="31,84,86,7635,7741,83,70,71"):
        """
        Get market data snapshot for given contract IDs.
        
        Fields:
        - 31: Last Price
        - 84: Bid Price  
        - 86: Ask Price
        - 7635: Mark Price (calculated fair value - best for options)
        """
    
        # Make pre-flight request first
        await self.ensure_accounts()
        q = {"conids": ",".join(map(str, conids)), "fields": fields}
        
        # First request - often returns minimal data
        initial_response = await self._req("GET", "/iserver/marketdata/snapshot", params=q)
        
        # Wait a moment and make second request for actual data
        await asyncio.sleep(1)
        final_response = await self._req("GET", "/iserver/marketdata/snapshot", params=q)
        
        return final_response
    
    def _extract_price_from_snapshot(self, snapshot_data: dict) -> float:
        """
        Extract price for websocket updates - returns NaN if no price available
        (maintains backward compatibility with existing websocket code)
        """
        price = _extract_best_price_from_snapshot(snapshot_data)
        return price if price is not None else float('nan')

    @cached(ttl=150, key_builder=history_cache_key_builder)
    async def history(self, conid, period="1w", bar="15min"):
        await self.ensure_accounts()
        q = {"conid": conid, "period": period, "bar": bar, "outsideRth": "true"}
        return await self._req("GET", "/iserver/marketdata/history", params=q)

    # positions -------------------------------------------------------
    # @cached(ttl=30)
    async def positions(self, account_id: str):
        all_positions = []
        page_id = 0
        while True:
            # The API uses pageId as a path parameter
            pos_page = await self._req("GET", f"/portfolio/{account_id}/positions/{page_id}")
            if not pos_page:
                # No more positions on this page, we're done.
                break 
            all_positions.extend(pos_page)
            page_id += 1

        return all_positions

    # account ---------------------------------------------------------
    
    async def get_available_accounts(self) -> List[BriefAccountInfoDTO]:
        """
        Calls the /portfolio/accounts endpoint and formats the response
        into a simple list for the UI.
        """
        raw_accounts = await self._req("GET", "/portfolio/accounts")
        
        # Ensure raw_accounts is a list before proceeding
        if not isinstance(raw_accounts, list):
            log.warning(f"Expected a list from /portfolio/accounts, but got {type(raw_accounts)}")
            return []
            
        accounts_list = []
        for acc in raw_accounts:
            accounts_list.append(BriefAccountInfoDTO(
                accountId=acc.get("accountId", ""),
                accountTitle=acc.get("accountTitle", "Untitled Account"),
                displayName=acc.get("displayName", "")
            ))
            
        return accounts_list

    
    async def get_account_details(self, acct: str | None = None) -> AccountDetailsDTO:
        """Fetch complete account details from multiple endpoints"""
        # Run all three API calls concurrently
        results = await asyncio.gather(
            self._req("GET", f"/acesws/{acct}/signatures-and-owners"),
            self._req("GET", "/portfolio/accounts"),
            self._req("GET", "/iserver/accounts"),
            return_exceptions=True # Prevents one failure from stopping others
        )

        owner_resp, portfolio_resp, accounts_resp = results
        
        # --- Process owner_resp ---
        if isinstance(owner_resp, Exception):
            log.error(f"Failed to fetch owner info: {owner_resp}")
            owner_info = OwnerInfoDTO(userName="", entityName="", roleId="")
        else:
            owner_data = {}
            if owner_resp.get("users"):
                user = owner_resp["users"][0]
                entity = user.get("entity", {})
                owner_data = {
                    "userName": user.get("userName"),
                    "entityName": entity.get("entityName"),
                    "roleId": user.get("roleId")
                }

            owner_info = OwnerInfoDTO(
                userName=owner_data.get("userName", ""),
                entityName=owner_data.get("entityName", ""),
                roleId=owner_data.get("roleId", "")
            )
            
        # --- Process portfolio_resp ---
        if isinstance(portfolio_resp, Exception):
            log.error(f"Failed to fetch account info: {portfolio_resp}")
            account_info = AccountInfoDTO(
                accountId=acct, accountTitle="", accountType="", 
                tradingType="", baseCurrency="USD", ibEntity="", 
                clearingStatus="", isPaper=False
            )
        else:
            account_data = next((acc for acc in portfolio_resp if acc.get("accountId") == acct), {})
            account_info = AccountInfoDTO(
                accountId=account_data.get("accountId", acct),
                accountTitle=account_data.get("accountTitle", ""),
                accountType=account_data.get("type", ""),
                tradingType=account_data.get("tradingType", ""),
                baseCurrency=account_data.get("currency", "USD"),
                ibEntity=account_data.get("ibEntity", ""),
                clearingStatus=account_data.get("clearingStatus", ""),
                isPaper=account_data.get("isPaper", False)
            )

        # --- Process accounts_resp ---
        if isinstance(accounts_resp, Exception):
            log.error(f"Failed to fetch permissions: {accounts_resp}")
            permissions = PermissionsDTO(
                allowFXConv=False, allowCrypto=False, 
                allowEventTrading=False, supportsFractions=False
            )
        else:
            permissions_data = accounts_resp.get("allowFeatures", {})
            acct_props = accounts_resp.get("acctProps", {}).get(acct, {})
            permissions = PermissionsDTO(
                allowFXConv=permissions_data.get("allowFXConv", False),
                allowCrypto=permissions_data.get("allowCrypto", False),
                allowEventTrading=permissions_data.get("allowEventTrading", False),
                supportsFractions=acct_props.get("supportsFractions", False)
            )

        return AccountDetailsDTO(
            owner=owner_info,
            account=account_info,
            permissions=permissions
        )
    
    async def account_performance(self,accountId: str, period: str = "1Y") -> list[dict]:
        """
        Fetches historical account NAV data from /pa/performance for the primary account
        and transforms it into the format required by the frontend chart.

        :param period: The period for which to fetch data (e.g., "1D", "1M", "1Y").
        :return: A list of dictionaries, e.g., [{'time': 1609459200, 'value': 100500.75}, ...]
        """
        

        # Use the primary account ID fetched and stored in app_state
        payload = {
            "acctIds": [accountId], 
            "period": period
        }
        headers = {"Content-Type": "application/json"}

        return await self._req(
            "POST", 
            "/pa/performance",
            json=payload,  
            headers=headers
            )
        
    async def account_watchlists(self):
        params ={
            "SC": "USER_WATCHLIST"
        }
        response = await self._req("GET", "/iserver/watchlists", params = params)
        if not response: return None
        # Extract just ID and name from user_lists
        watchlists = {}
        if 'data' in response and 'user_lists' in response['data']:
            for watchlist in response['data']['user_lists']:
                watchlists[watchlist['id']] = watchlist['name']
        
        return watchlists
    
    # ---------------------------------------------------------------- asset alloc
    @cached(ttl=300, key_builder=account_specific_key_builder)
    async def account_allocation(self, account_id: str ):
        data = await self._req("GET", f"/portfolio/{account_id}/allocation")
        self.state.allocation = data        # keep latest for WS/REST reuse
        return data

    # ------------------------------------------------------------- combo pos
    @cached(ttl=300, key_builder=account_specific_key_builder)
    async def combo_positions(self, acct: str | None = None, nocache: bool = False):
        params = {"nocache": str(nocache).lower()}
        data = await self._req("GET", f"/portfolio/{acct}/combo/positions", params=params)
        self.state.combo_positions = data
        return data

    # --------------------------------------------------------------- ledger
    @cached(ttl=300, key_builder=account_specific_key_builder)
    async def ledger(self, account_id: str) -> LedgerDTO:
        """
        Fetches the complete ledger for a given account.
        The response format is massaged into our LedgerDTO.
        """
        # The raw ledger data from IBKR is a dict with currency keys
        raw_data = await self._req("GET", f"/portfolio/{account_id}/ledger")
        
        base_currency = raw_data.get("BASE", {}).get("currency", "USD")
        ledgers = []
        
        for currency, data in raw_data.items():
            # Skip if essential data is missing
            if "cashbalance" not in data and "settledcash" not in data:
                continue
                
            ledgers.append(LedgerEntry(
                currency=data.get("currency", currency),
                cashBalance=data.get("cashbalance", 0.0),
                settledCash=data.get("settledcash", 0.0),
                unrealizedPnl=data.get("unrealizedpnl", 0.0),
                dividends=data.get("dividends", 0.0),
                exchangeRate=data.get("exchangerate", 1.0)
            ))
            
        return LedgerDTO(baseCurrency=base_currency, ledgers=ledgers)


    # ---------- WebSocket handling ----------
    
    def _parse_option_symbol(self, description: str) -> str:
        """
        Parses a long IBKR option description into a clean, readable format.
        Example In: 'IBIT   JUL2025 65 C [IBIT  250731C00065000 100]'
        Example Out: 'IBIT JUL2025 $65.00 C'
        """
        # This new, simpler regex parses the readable part of the string.
        # It captures: 1:Underlying, 2:Expiry, 3:Strike, 4:Type(C/P)
        match = re.search(r"^([A-Z]+)\s+([A-Z]{3}\d{4})\s+([\d\.]+)\s+([CP])", description)

        if match:
            try:
                underlying = match.group(1)
                expiry = match.group(2)  # This is already "JUL2025"
                strike = float(match.group(3))
                option_type = match.group(4)
                
                return f"{underlying} {expiry} ${strike:.2f} {option_type}"
            except (ValueError, IndexError):
                # If parsing fails for any reason, fall back to the original
                return description
        
        # If the regex doesn't match at all, return the original string
        return description
    
    async def stop_websocket(self):
        """Stops the currently running WebSocket task."""
        if self._ws_task and not self._ws_task.done():
            self._ws_task.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await self._ws_task
            log.info(f"WebSocket task for account {self._current_ws_account} stopped.")
        self._ws_task = None
        self._current_ws_account = None

    async def start_websocket_for_account(self, account_id: str):
        """Stops any existing WS task and starts a new one for the given account."""
        await self.stop_websocket() # Ensure any old connection is closed

        log.info(f"Starting WebSocket task for account: {account_id}")
        self._current_ws_account = account_id
        # The _websocket_loop now needs to receive the account_id
        self._ws_task = asyncio.create_task(self._websocket_loop(account_id))
        
    async def _dispatch_ledger(self, msg: dict) -> None:
        """
        Convert an 'sld' frame into a Frontend Ledger payload by parsing the 'result' list.
        """
        # 1. Get data from the 'result' key, not 'args'
        result_list = msg.get("result")
        if not isinstance(result_list, list):
            return

        # 2. Filter out partial updates and find the base currency
        # A full update will have the 'cashbalance' field.
        full_ledger_items = [item for item in result_list if 'cashbalance' in item]
        if not full_ledger_items:
            # This was a partial update with only timestamps, so we ignore it.
            return

        base_currency = "USD" # Default base currency
        base_entry = next((item for item in full_ledger_items if item.get("secondKey") == "BASE"), None)
        if base_entry:
            # If there's a BASE summary, we can determine the actual base currency
            # For simplicity, we'll assume USD if not found, but you could make this more robust.
            pass # Sticking with USD for now.

        # 3. Parse the valid ledger items using our Pydantic model
        try:
            parsed_ledgers = [LedgerEntry(**item) for item in full_ledger_items]
            
            # 4. Construct the final DTO that the frontend expects
            ledger_dto = LedgerDTO(
                baseCurrency=base_currency,
                ledgers=parsed_ledgers
            )
            
            # 5. Broadcast the correctly formatted update
            await self._broadcast(
                LedgerUpdate(data=ledger_dto).model_dump_json(by_alias=True) # Use by_alias to serialize correctly
            )
        except Exception as e:
            log.error(f"Failed to parse or dispatch ledger data: {e} - Data was: {full_ledger_items}")
        
    async def _dispatch_pnl(self, msg: dict) -> None:
        """
        Convert an 'spl' frame (either list- or dict-style) into Frontend PnL payload.
        """
        args = msg.get("args")    # may be list OR dict

        rows: dict[str, PnlRow] = {}

        if isinstance(args, dict):
            for k, v in args.items():
                if isinstance(v, dict):
                    # --- ADD THIS CHECK ---
                    # Only try to parse if a key data point exists
                    if "dpl" in v: 
                        rows[k] = PnlRow(**v)

        elif isinstance(args, list):
            for v in args:
                if isinstance(v, dict):
                    # --- AND ADD THIS CHECK ---
                    if "dpl" in v:
                        key = v.get("key") or v.get("acctId")
                        if key:
                            rows[key] = PnlRow(**v)

        if rows:
            await self._broadcast(
                PnlUpdate(type="pnl", data=rows).model_dump_json()
            )

        
    async def _dispatch_tick(
    self,
    msg: Dict[str, Any],
    conid_to_pos: Dict[int, Dict[str, Any]],
) -> None:
        # 1. Get the price from the real-time message. If there's no price, ignore it.
        last_price = self._extract_price_from_snapshot(msg)
        if math.isnan(last_price):
            return

        # 2. Get the contract ID (conid) from the message
        cid = int(msg["topic"].split("+", 1)[1])

        # 3. Make sure we have the full position details for this conid
        if (pos := conid_to_pos.get(cid)):
            
            # 4. Now that we have the details, figure out the correct name
            asset_class = pos.get("assetClass", "STK")
            raw_description = pos.get("contractDesc") or str(cid)

            if asset_class == 'OPT':
                # If it's an option, parse it
                symbol_name = self._parse_option_symbol(raw_description)
            else:
                # Otherwise, just use the stock ticker
                symbol_name = raw_description

            # 5. Get the rest of the data
            qty = pos.get("position")
            cost = pos.get("avgPrice")
            daily_change_pct = safe_float_conversion(msg.get("83"))
            change_amount = safe_float_conversion(msg.get("82"))
            multiplier = 100 if asset_class == "OPT" else 1
            
            # 6. Build the final update object with the correct name
            update = FrontendMarketDataUpdate(
                conid=cid,
                symbol=symbol_name,
                last_price=last_price,
                quantity=qty,
                avg_bought_price=cost,
                daily_change_percent=daily_change_pct,
                daily_change_amount=change_amount,
            )
            
            if qty is not None and cost is not None:
                update.value = last_price * qty * multiplier
                update.unrealized_pnl = (last_price - cost) * qty * multiplier

            # 7. Send the update to the frontend
            await self._broadcast(update.model_dump_json())
        
    
    
    async def _websocket_loop(self, account_id: str) -> None:
        uri = "wss://localhost:5000/v1/api/ws"
        cookie  = f'api={{"session":"{self.state.ibkr_session_token}"}}'

        ssl_ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_CLIENT)
        ssl_ctx.check_hostname = False
        ssl_ctx.verify_mode    = ssl.CERT_NONE

        while True:                           # reconnect forever
            try:
                # Fetch fresh positions for this account every time the WS connects/reconnects
                log.info(f"Fetching positions for WebSocket stream: {account_id}")
                account_positions = await self.positions(account_id)
                self.state.positions[account_id] = account_positions # Update the state
                conids = [str(p["conid"]) for p in account_positions]
                conid_to_pos: dict[int, dict] = {p["conid"]: p for p in account_positions}

                async with websockets.connect(
                    uri,
                    ssl=ssl_ctx,
                    compression=None,                 # match websocket-client default
                    ping_interval=None,               # we do heartbeat ourselves
                    additional_headers=[("Cookie", cookie)]
                ) as ws:

                    self.state.ws_connected = True

                    # —— ① give Gateway a moment (matches time.sleep(3)) ——
                    await asyncio.sleep(2)

                    # —— ② account-level streams (optional) ————————————
                    await ws.send(f"ssd+{account_id}")
                    await asyncio.sleep(0.05)
                    await ws.send(f"sld+{account_id}")
                    await asyncio.sleep(0.05)
                    await ws.send(f"spl+{account_id}")
                    await asyncio.sleep(0.05)

                    # —— ③ market-data subscriptions ————————————————
                    for cid in conids:
                        cmd = f'smd+{cid}+{{"fields":["31","7635","83","82"]}}'
                        await ws.send(cmd)
                        await asyncio.sleep(0.05)     # throttle

                    # —— ④ heartbeat task ————————————————————————————
                    async def heartbeat():
                        try:
                            while True:
                                await asyncio.sleep(30)
                                await ws.send("tic")
                        except asyncio.CancelledError:
                            # This is expected when the task is cancelled, exit gracefully
                            pass
                        except websockets.exceptions.ConnectionClosed:
                            # Connection died unexpectedly, exit gracefully
                            pass
                    
                    async def allocation_refresher(account_id: str):
                        """
                        Immediately fetches and broadcasts allocation data, then enters
                        a loop to refresh it periodically.
                        """
                        # 1. Fetch and broadcast the data IMMEDIATELY upon startup.
                        try:
                            log.info(f"Fetching initial allocation for {account_id}...")
                            initial_data = await self.account_allocation(account_id)
                            await self._broadcast(json.dumps({
                                "type": "allocation",
                                "data": initial_data
                            }))
                        except Exception as e:
                            log.error(f"Failed to fetch initial allocation data: {e}")

                        # 2. Now, enter the periodic refresh loop.
                        while True:
                            await asyncio.sleep(300) # Refresh every 5 minutes
                            try:
                                log.info(f"Refreshing account allocation for {account_id}...")
                                fresh_data = await self.account_allocation(account_id)
                                await self._broadcast(json.dumps({
                                    "type": "allocation",
                                    "data": fresh_data
                                }))
                            except Exception as e:
                                log.error(f"Failed to refresh allocation data: {e}")
                        
                    hb = asyncio.create_task(heartbeat())
                    alloc_task = asyncio.create_task(allocation_refresher(account_id))

                    # —— ⑤ receive loop ————————————————————————————
                    try:
                        async for raw in ws:
                            if isinstance(raw, bytes):
                                try:
                                    raw = raw.decode()
                                except UnicodeDecodeError:
                                    continue
                            try:
                                msgs = json.loads(raw)
                                if not isinstance(msgs, list):
                                    msgs = [msgs]
                            except json.JSONDecodeError:
                                continue

                            for msg in msgs:
                                topic = msg.get("topic", "")
                                if topic.startswith("smd+"):
                                    await self._dispatch_tick(msg, conid_to_pos)
                                elif topic == "spl":               
                                    await self._dispatch_pnl(msg)
                                elif topic.startswith("sld"):
                                    await self._dispatch_ledger(msg)
                                elif topic in ("system", "sts", "act", "tic", "hb"):
                                    continue
                                elif topic == "error":
                                    log.warning("[IBKR-ERR] %s", msg)
                    finally:
                        # This will run when the loop exits for any reason
                        # (e.g., connection closed, or an outer exception)
                        hb.cancel()
                        alloc_task.cancel()

            except Exception as exc:
                log.warning("WS loop error: %s – retry in 15 s", exc)
                await asyncio.sleep(15)
            finally:
                self.state.ws_connected = False


def _extract_best_price_from_snapshot(snapshot_data: dict) -> float | None:
    """
    Extract the best available price from snapshot data in a prioritized order.
    Priority: Last Price (31) -> Mark Price (7635) 
    """
    # 1. Last Price (highest priority)
    last_price = safe_float_conversion(snapshot_data.get("31"))
    if last_price is not None:
        return last_price

    # 2. Mark Price (often best for options)
    mark_price = safe_float_conversion(snapshot_data.get("7635"))
    if mark_price is not None:
        return mark_price
