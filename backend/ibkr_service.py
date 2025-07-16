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
from models import AccountDetailsDTO, AccountInfoDTO, AccountSummaryData, BriefAccountInfoDTO, FrontendMarketDataUpdate, LedgerDTO, LedgerEntry, LedgerUpdate, OwnerInfoDTO, PermissionsDTO, PnlRow, PnlUpdate, WebSocketRequest
from cache import account_specific_key_builder, cached, history_cache_key_builder
from rate_control import paced
from websockets.legacy.client import WebSocketClientProtocol


        
log = logging.getLogger("ibkr.ws")   # dedicate a channel for WS payloads

class IBKRConfig(BaseModel):
    host: str                  = Field(..., examples=["127.0.0.1"])
    port: int                  = Field(..., examples=[4002])

class IBKRState(BaseModel):
    shutdown_signal: asyncio.Event = Field(default_factory=asyncio.Event)
    ibkr_websocket_session: WebSocketClientProtocol | None = None
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
    
    
    class Config:
        arbitrary_types_allowed = True

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
    
    @property
    def _ibkr_ws_session(self):
        """Safely gets the current IBKR WebSocket session from state."""
        return getattr(self.state, 'ibkr_websocket_session', None)

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

    # orders -------------------------------------------------------
    @cached(ttl=60) # Cache for 1 minute
    async def get_live_orders(self) -> List[Dict[str, Any]]:
        """ Fetches live orders from IBKR """
        try:
            # The 'force=true' parameter ensures we get a fresh list
            orders_data = await self._req("GET", "/iserver/account/orders", params={"force": "true"})
            return orders_data.get("orders", [])
        except Exception as e:
            log.exception("Failed to fetch live orders: %s", e)
            return []

    async def cancel_order(self, account_id: str, order_id: str) -> Dict[str, Any]:
        """ Cancels an open order """
        try:
            response = await self._req("DELETE", f"/iserver/account/{account_id}/order/{order_id}")
            return response
        except Exception as e:
            log.exception(f"Failed to cancel order {order_id}: {e}")
            raise HTTPException(status_code=500, detail="Could not cancel order")

    async def modify_order(self, account_id: str, order_id: str, new_order_data: Dict[str, Any]) -> Dict[str, Any]:
        """ Modifies an existing order """
        try:
            response = await self._req("POST", f"/iserver/account/{account_id}/order/{order_id}", json=new_order_data)
            return response
        except Exception as e:
            log.exception(f"Failed to modify order {order_id}: {e}")
            raise HTTPException(status_code=500, detail="Could not modify order")
    
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
    
    async def initialize_websocket_task(self, account_id: str):
        """
        Ensures the IBKR WebSocket loop is running.
        If the task already exists, it does nothing.
        If not, it creates it. This is called by the first connecting client.
        """
        # This check prevents starting multiple loops
        if self._ws_task and not self._ws_task.done():
            log.info("WebSocket task is already running.")
            return

        log.info(f"Initializing new WebSocket task for account: {account_id}")
        self._current_ws_account = account_id
        # Create and store the single, long-running task
        self._ws_task = asyncio.create_task(self._websocket_loop(account_id))
        
    async def shutdown_websocket_task(self):
        """Signals the websocket loop to terminate and closes the connection."""
        if not self._ws_task or self._ws_task.done():
            log.info("WebSocket task not running, nothing to shut down.")
            return

        log.info("Shutting down IBKR WebSocket task...")
        self.state.shutdown_signal.set()

        # Gracefully close the active websocket session
        if self.state.ibkr_websocket_session:
            await self.state.ibkr_websocket_session.close(code=1000, reason='User logged out')

        try:
            # Wait for the task to finish its cleanup
            await asyncio.wait_for(self._ws_task, timeout=5.0)
        except asyncio.TimeoutError:
            log.warning("WebSocket task did not shut down gracefully, cancelling.")
            self._ws_task.cancel()
        except asyncio.CancelledError:
            pass # Task was already cancelled, which is fine
        finally:
            self._ws_task = None
            self._current_ws_account = None

        log.info("IBKR WebSocket task has been terminated.")
    
    
    async def _dispatch_book_data(self, msg: Dict[str, Any]):
        """
        Parses BookTrader (price ladder) data and broadcasts it to the frontend.
        """
        try:
            # The raw data is a list of price level objects
            raw_book_data = msg.get("data", [])
            if not raw_book_data:
                return

            processed_book = []
            for level in raw_book_data:
                price_str = level.get("price")
                if not price_str:
                    continue

                # Price can sometimes be in "size @ price" format, so we handle that.
                if "@" in price_str:
                    parts = price_str.split(" @ ")
                    price = float(parts[1])
                else:
                    price = float(price_str)

                processed_level = {
                    "price": price,
                    "bidSize": int(level["bid"]) if level.get("bid") else None,
                    "askSize": int(level["ask"]) if level.get("ask") else None,
                }
                processed_book.append(processed_level)

            # Sort the book with the highest price (lowest ask) at the top
            processed_book.sort(key=lambda x: x["price"], reverse=True)

            # Broadcast the cleaned data to the frontend
            await self._broadcast(json.dumps({
                "type": "book_data", # A unique type for the frontend to identify it
                "data": processed_book
            }))

        except (ValueError, KeyError) as e:
            log.error(f"Error parsing book data: {e} - Data: {msg}")
        
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
        
    
    async def handle_ws_command(self, command: WebSocketRequest):
        """Processes commands by sending messages to the live IBKR WebSocket."""
        ws = self._ibkr_ws_session
        if not ws:
            log.error("Cannot handle command, IBKR WebSocket is not connected.")
            return

        action = command.action
        conid = command.conid
        account_id = command.account_id or self._current_ws_account

        if action == "subscribe_stock" and conid:
            log.info(f"Subscribing to market data for conid: {conid}")
            # Subscribe to Market Data (Quote: Last, Bid, Ask, Changes, etc.)
            smd_cmd = f'smd+{conid}+{{"fields":["31","84","86","82","83","70","71"]}}'
            await ws.send(smd_cmd)
            # Subscribe to Price Ladder (BookTrader/Depth)
            if account_id:
                sbd_cmd = f'sbd+{account_id}+{conid}'
                await ws.send(sbd_cmd)

        elif action == "unsubscribe_stock" and conid:
            log.info(f"Unsubscribing from market data for conid: {conid}")
            await ws.send(f'umd+{conid}+{{}}')
            # Also unsubscribe from the price ladder
            if account_id:
                 await ws.send(f'ubd+{account_id}')

        elif action == "subscribe_portfolio" and account_id:
            log.info(f"Subscribing to portfolio for account: {account_id}")
            account_positions = await self.positions(account_id)
            conids = [str(p["conid"]) for p in account_positions]
            for cid in conids:
                cmd = f'smd+{cid}+{{"fields":["31","7635","83","82"]}}'
                await ws.send(cmd)
                await asyncio.sleep(0.05)  # Throttle subscriptions
        elif action == "unsubscribe_portfolio" and account_id:
            log.info(f"Unsubscribing from portfolio for account: {account_id}")
            account_positions = await self.positions(account_id)
            conids = [str(p["conid"]) for p in account_positions]
            for cid in conids:
                await ws.send(f'umd+{cid}+{{}}')
                await asyncio.sleep(0.05)
            
    async def _websocket_loop(self, account_id: str) -> None:
        """
        Maintains a persistent connection to the IBKR WebSocket.
        It processes incoming market data and sends it to the frontend.
        It does NOT handle subscription logic anymore; that's done by handle_ws_command.
        """
        uri = "wss://localhost:5000/v1/api/ws"
        cookie = f'api={{"session":"{self.state.ibkr_session_token}"}}'
        ssl_ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_CLIENT)
        ssl_ctx.check_hostname = False
        ssl_ctx.verify_mode = ssl.CERT_NONE

        while not self.state.shutdown_signal.is_set():
            try:
                log.info(f"Connecting to IBKR WebSocket for account: {account_id}")
                async with websockets.connect(
                    uri,
                    ssl=ssl_ctx,
                    compression=None,
                    ping_interval=None,
                    additional_headers=[("Cookie", cookie)]
                ) as ws:

                    self.state.ws_connected = True

                    self.state.ibkr_websocket_session = ws
                    log.info("IBKR WebSocket connected.")

                    # --- Initial Subscriptions ---
                    await asyncio.sleep(1) # Give connection a moment to settle
                    # On connect, immediately subscribe to the main portfolio data
                    await ws.send(f'spl+{account_id}')
                    
                    await self.handle_ws_command(
                        WebSocketRequest(action="subscribe_portfolio", account_id=account_id)
                    )

                    # --- Background Tasks (Heartbeat, etc.) ---
                    heartbeat_task = asyncio.create_task(self._ws_heartbeat())
                    allocation_task = asyncio.create_task(self._ws_allocation_refresher(account_id))

                    # --- Main Receive Loop ---
                    # This loop's only job is to listen for data from IBKR and dispatch it.
                    conid_to_pos = {p["conid"]: p for p in await self.positions(account_id)}
                    async for raw in ws:
                        # (Your existing message processing logic goes here)
                        await self._process_ibkr_message(raw, conid_to_pos)

            except Exception as exc:
                log.warning(f"IBKR WS loop error: {exc} – retrying in 15s")
                await asyncio.sleep(15)
            finally:
                self.state.ws_connected = False
                if 'heartbeat_task' in locals() and not heartbeat_task.done():
                    heartbeat_task.cancel()
                if 'allocation_task' in locals() and not allocation_task.done():
                    allocation_task.cancel()
                if hasattr(self.state, 'ibkr_websocket_session'):
                    del self.state.ibkr_websocket_session
                log.info("IBKR WebSocket disconnected. Awaiting reconnect.")
            if not self.state.shutdown_signal.is_set():
                log.info("Will attempt to reconnect in 15 seconds...")
                await asyncio.sleep(15)
        log.info("Exited IBKR WebSocket loop because shutdown was signaled.")

    # NEW: Extracted background tasks for clarity
    async def _ws_heartbeat(self):
        """Sends a heartbeat ping every 30 seconds to keep the session alive."""
        ws = self._ibkr_ws_session
        while self.state.ws_connected:
            try:
                await asyncio.sleep(30)
                await ws.send("tic")
            except (asyncio.CancelledError, websockets.exceptions.ConnectionClosed):
                break # Exit gracefully

    async def _ws_allocation_refresher(self, account_id: str):
        """Periodically refreshes and broadcasts account allocation data."""
        while self.state.ws_connected:
            try:
                log.info(f"Refreshing account allocation for {account_id}...")
                fresh_data = await self.account_allocation(account_id)
                await self._broadcast(json.dumps({
                    "type": "allocation",
                    "data": fresh_data
                }))
                await asyncio.sleep(300) # Refresh every 5 minutes
            except (asyncio.CancelledError, websockets.exceptions.ConnectionClosed):
                break
            except Exception as e:
                log.error(f"Failed to refresh allocation data: {e}")
                await asyncio.sleep(60) # Wait longer on error

    # NEW: Extracted message processor for clarity
    async def _process_ibkr_message(self, raw_message: str | bytes, conid_to_pos: Dict[int, Any]):
        """Parses and dispatches a single message from the IBKR WebSocket."""
        # Your existing logic from the 'for msg in msgs:' loop
        # This keeps the _websocket_loop function clean and focused.
        if isinstance(raw_message, bytes):
            raw_message = raw_message.decode()
        try:
            msgs = json.loads(raw_message)
            if not isinstance(msgs, list):
                msgs = [msgs]

            for msg in msgs:
                topic = msg.get("topic", "")
                if topic.startswith("smd+"):
                    await self._dispatch_tick(msg, conid_to_pos)
                elif topic == "spl":
                    await self._dispatch_pnl(msg)
                # ... etc for your other topics (sld, sbd)
                elif topic.startswith("sbd+"):
                    # You'll need to create this dispatcher
                    await self._dispatch_book_data(msg)

        except (json.JSONDecodeError, UnicodeDecodeError):
            return


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
