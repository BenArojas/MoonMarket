# models.py  – pydantic versions
import asyncio
import contextlib
import time
import json
import logging
import math
import re
import ssl
from fastapi import HTTPException
import httpx
from pydantic import BaseModel, Field
from typing import Awaitable, Callable, Optional, List, Dict, Any, Set
import websockets
from utils import calculate_days_to_expiry, safe_float_conversion
from models import AccountDetailsDTO, AccountInfoDTO, AccountPermissions, BriefAccountInfoDTO, FrontendMarketDataUpdate, LedgerDTO, LedgerEntry, LedgerUpdate, OwnerInfoDTO, PermissionsDTO, PnlRow, PnlUpdate, WebSocketRequest
from cache import account_specific_key_builder, cached, history_cache_key_builder, option_key_builder, snapshot_key_builder
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
    active_stock_conid: Optional[int] = None
    chart_subscriptions: Dict[int, str] = Field(default_factory=dict) # Key: conid, Value: serverId
    pnl_subscribed: bool = False
    
    portfolio_subscriptions: Set[int] = Field(default_factory=set)
    
    
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
    
    async def wait_for_connection(self):
        """
        An awaitable helper that waits until the IBKR WebSocket is connected.
        """
        while not self.state.ws_connected:
            await asyncio.sleep(0.1)

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
        
    @cached(ttl=3600) 
    async def search(self, symbol, name=False, secType=""):
        # Initialize the query with only the symbol
        q = {"symbol": symbol}
        
        # Only add the 'name' parameter if it's True
        if name:
            q["name"] = str(name).lower()

        # Add 'secType' if provided
        if secType:
            q["secType"] = secType
            
        return await self._req("GET", "/iserver/secdef/search", params=q)
    
    @cached(ttl=3600) # Cache for 1 hour
    async def search_detailed(self, conid: int):
        """
        Performs a detailed search for a single conid to get derivative info like months.
        Note: The API seems to use /secdef/search for this, not /trsrv/secdef.
        """
        # We search by symbol, but since we have the conid, we can find the symbol first
        # This is a bit of a workaround if a direct conid search for months isn't available.
        # A more direct method might be needed if this is unreliable.
        # For now, we assume we need to re-search to get the 'sections' part of the response.
        # A better approach if available would be a direct info call that returns months.
        # Let's assume we need to find the symbol from the conid first.
        # This is complex, so for now, we will create a placeholder. The best way is to search for the conid
        # in the positions or get it from the quote page.
        # The /trsrv/secdef endpoint is a good alternative.
        
        # Let's use the /trsrv/secdef endpoint as it's cleaner.
        response = await self._req("GET", f"/trsrv/secdef?conids={conid}")
        return response.get('secdef', [])[0] if response.get('secdef') else None

    
    @cached(ttl=3600, key_builder=option_key_builder)
    async def get_strikes_for_month(self, conid: int, month: str) -> dict:
        """Calls /iserver/secdef/strikes to get all potential strikes."""
        params = {"conid": conid, "secType": "OPT", "month": month}
        return await self._req("GET", "/iserver/secdef/strikes", params=params)
    
    @cached(ttl=3600, key_builder=option_key_builder)
    async def get_contract_info(self, conid: int, month: str, strike: float, right: str) -> list:
        """Calls /iserver/secdef/info to validate a single contract and get its conId."""
        params = {"conid": conid, "secType": "OPT", "month": month, "strike": strike, "right": right}
        # This can return an empty list if the contract is invalid
        return await self._req("GET", "/iserver/secdef/info", params=params)

    async def check_market_data_availability(self, conid):
        """Check what market data is available for a contract"""
        q = {"conids": str(conid), "fields": "6509"}  # Just get availability field
        response = await self._req("GET", "/iserver/marketdata/snapshot", params=q)
        if response and len(response) > 0 and "6509" in response[0]:
            availability = response[0]["6509"]
            log.info(f"Market data availability for {conid}: {availability}")
            return availability
        return None

    # fields="31,84,86,7635,7741,83,70,71"
    # @cached(ttl=150, key_builder=snapshot_key_builder)
    async def snapshot(self, conids, fields, timeout=5, interval=1):
        """
        Get market data snapshot, polling until ALL requested fields are available 
        or a timeout occurs.
        """
        await self.ensure_accounts()
        q = {"conids": ",".join(map(str, conids)), "fields": fields}
        
        start_time = time.time()
        requested_fields = fields.split(',')
        
        log.info(f"Starting snapshot poll for conids: {conids} with fields: {fields}")

        while time.time() - start_time < timeout:
            response = await self._req("GET", "/iserver/marketdata/snapshot", params=q)
            
            if response and isinstance(response, list):
                all_data_present = True
                conids_in_response = {str(item.get('conid')) for item in response}

                if not set(map(str, conids)).issubset(conids_in_response):
                    all_data_present = False
                else:
                    for item in response:
                        # --- THIS IS THE FIX ---
                        # Use all() to confirm every requested field exists in the response item.
                        if not all(field in item for field in requested_fields):
                            all_data_present = False
                            break 
                
                if all_data_present:
                    log.info(f"Successfully received complete snapshot for conids: {conids}")
                    return response

            log.info(f"All requested fields not yet available. Retrying in {interval}s...")
            await asyncio.sleep(interval)

        log.warning(f"Snapshot request for conids {conids} timed out after {timeout}s.")
        return response
    
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
    async def get_live_orders(self) -> List[Dict[str, Any]]:
        """ Fetches live orders from IBKR using the two-call method. """
        try:
            # 1. First call with force=true to clear the cache. We ignore the response.
            await self._req("GET", "/iserver/account/orders", params={"force": "true"})

            # 2. Second call without 'force' to get the actual live orders.
            orders_data = await self._req("GET", "/iserver/account/orders")
            
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
        """
        Modifies an existing order by fetching the original, merging changes,
        and submitting the complete order object as required by the IBKR API.
        """
        try:
            # Step 1: Fetch all live orders to find the one we need to modify.
            log.info(f"Attempting to find original order for modification: {order_id}")
            live_orders = await self.get_live_orders()
            original_order = next((o for o in live_orders if str(o.get("orderId")) == order_id), None)

            if not original_order:
                log.error(f"Could not find live order with ID {order_id} to modify.")
                raise HTTPException(status_code=404, detail=f"Live order with ID {order_id} not found.")

            # Step 2: Build the modification payload by starting with the original order's essential data.
            # This ensures we always include the required 'conid'.
            order_payload = {
                "conid": original_order.get("conid"),
                "orderType": original_order.get("origOrderType"),
                "side": original_order.get("side"),
                "tif": original_order.get("timeInForce"),
                "quantity": original_order.get("totalSize"), # Default to original quantity
                "price": original_order.get("price") # Default to original price
            }

            # Step 3: Merge the new values (price, quantity) from the frontend request.
            # This will overwrite the defaults if new values were provided.
            order_payload.update(new_order_data)


            # Step 4: Submit the complete, modified order object to the IBKR API.
            response = await self._req("POST", f"/iserver/account/{account_id}/order/{order_id}", json=order_payload)
            return response

        except HTTPException as http_exc:
            # Re-raise HTTPException to show proper status codes to the client
            raise http_exc
        except Exception as e:
            log.exception(f"An unexpected error occurred while modifying order {order_id}: {e}")
            raise HTTPException(status_code=500, detail="Could not modify order")
    
    async def preview_order(self, account_id: str, order: Dict[str, Any]) -> Dict[str, Any]:
        """ Gets a preview of an order without submitting it. """
        
        account_positions = self.state.positions.get(account_id, [])

        # --- NEW SAFEGUARD ---
        if not account_positions:
            account_positions = await self.positions(account_id)
        try:

            payload = {"orders": [order]}
            response = await self._req(
                "POST",
                f"/iserver/account/{account_id}/orders/whatif",
                json=payload
            )
            custom_warning = None
            order_side = order.get("side", "").upper()
            
            if order_side == "SELL":
                order_conid = order.get("conid")
                order_quantity = order.get("quantity", 0)
                
                current_position = next((p for p in account_positions if p.get("conid") == order_conid), None)
                
                if current_position is None:
                    custom_warning = "You are selling a stock you don't currently own. This will open a short position."
                else:
                    shares_owned = current_position.get("position", 0)
                    if order_quantity > shares_owned:
                        short_amount = order_quantity - shares_owned
                        custom_warning = (
                            f"Warning: You are trying to sell {order_quantity} shares but you only own {shares_owned}. "
                            f"This will sell all your shares and open a new short position of {short_amount} shares."
                        )

            if custom_warning:
                existing_warning = response.get("warn")
                if existing_warning:
                    response["warn"] = f"{custom_warning}\n\n{existing_warning}"
                else:
                    response["warn"] = custom_warning
            
            return response
        except Exception as e:
            log.exception(f"Failed to preview order: {e}")
            raise HTTPException(status_code=500, detail="Could not preview order")

    async def place_order(self, account_id: str, orders: List[Dict[str, Any]]) -> Dict[str, Any]:
        """ Places one or more orders """
        try:
            # The payload is now the list of orders itself
            payload = {"orders": orders}
            response = await self._req("POST", f"/iserver/account/{account_id}/orders", json=payload)
            return response
        except Exception as e:
            log.exception(f"Failed to place order: {e}")
            raise HTTPException(status_code=500, detail="Could not place order")
            
    async def reply_to_confirmation(self, reply_id: str, confirmed: bool) -> Dict[str, Any]:
        """ Replies to an order confirmation message """
        try:
            payload = {"confirmed": confirmed}
            response = await self._req("POST", f"/iserver/reply/{reply_id}", json=payload)
            return response
        except Exception as e:
            log.exception(f"Failed to reply to confirmation {reply_id}: {e}")
            raise HTTPException(status_code=500, detail="Could not reply to order confirmation")
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
        
        self.state.positions[account_id] = all_positions
        return all_positions

    async def get_position_by_conid(self, account_id: str, conid: int) -> Optional[dict]:
        """
        Finds a specific position for a given account ID and conid
        from the locally stored portfolio state.
        
        Args:
            account_id: The account to search within.
            conid: The contract ID of the position to find.
            
        Returns:
            A dictionary representing the position if found, otherwise None.
        """
        # First, get the list of all positions for the specified account.
        # self.state.positions is assumed to be a dict like: {'U123...': [pos1, pos2]}
        account_positions = self.state.positions.get(account_id)
        if account_positions is None:
            account_positions = await self.positions(account_id)
        
        if not account_positions:
            # If there are no positions for this account, we can't find it.
            return None
        
        # Loop through the positions for that account to find the matching conid.
        for pos in account_positions:
            if pos.get("conid") == conid:
                # Return the entire position dictionary upon finding a match.
                return pos
                
        # If the loop completes without finding the conid, return None.
        return None
    
    async def get_related_positions(self, account_id: str, stock_conid: int, stock_ticker: str) -> Dict[str, Any]:
        """
        Finds the main stock position and all related option positions for a given ticker.

        Returns:
            A dictionary with 'stock' and 'options' keys.
            e.g., {"stock": {...}, "options": [{...}, {...}]}
        """
        all_positions = self.state.positions.get(account_id)
        if all_positions is None:
            all_positions = await self.positions(account_id)
        
        stock_position = None
        option_positions = []

        for pos in all_positions:
            # Check for the main stock position by its unique conid
            if pos.get("conid") == stock_conid:
                stock_position = pos
            
            # Check for related options by asset class and ticker symbol in the description
            elif pos.get("assetClass") == "OPT" and stock_ticker in pos.get("contractDesc", ""):
                # Add the days to expiration for convenience
                pos["daysToExpire"] = calculate_days_to_expiry(pos.get("contractDesc", ""))
                option_positions.append(pos)
        
        return {"stock": stock_position, "options": option_positions}

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

    @cached(ttl=1200, key_builder=account_specific_key_builder)
    async def get_account_permissions(self, account_id: str) -> AccountPermissions:
        """
        Fetches and parses trading permissions for a specific account.
        """
        try:
            data = await self._req("GET", "/iserver/accounts")
            
            acct_props = data.get("acctProps", {}).get(account_id, {})
            allow_features = data.get("allowFeatures", {})
            
            # --- FIX #1: Get allowed_assets from the correct dictionary ('allowFeatures') ---
            allowed_assets = allow_features.get("allowedAssetTypes", "")
            
            # This will now correctly evaluate to True if "OPT" is in the string
            allow_options = "OPT" in allowed_assets.split(',')

            # This will now correctly evaluate to True if the string is not empty
            can_trade = bool(allowed_assets)

            # --- FIX #2: Infer margin status from allowed asset types ---
            # The 'tradingType' field isn't in this API response.
            # We can infer margin if assets like FUT or CFD are permitted.
            is_margin = "FUT" in allowed_assets or "CFD" in allowed_assets
            
            return AccountPermissions(
                canTrade=can_trade,
                allowOptionsTrading=allow_options,
                allowCryptoTrading=allow_features.get("allowCrypto", False),
                isMarginAccount=is_margin,
                supportsFractions=acct_props.get("supportsFractions", False)
            )
        except Exception as e:
            log.exception(f"Failed to parse account permissions for {account_id}: {e}")
            return AccountPermissions(
                canTrade=False, allowOptionsTrading=False, allowCryptoTrading=False,
                isMarginAccount=False, supportsFractions=False
            )

    
    @cached(ttl=120, key_builder=account_specific_key_builder) 
    async def get_account_summary(self, account_id: str) -> Dict[str, Any]:
        """ Fetches account summary details like cash, net liquidation value, etc. """
        try:
            # This is a standard endpoint to get account values
            response = await self._req("GET", f"/portfolio/{account_id}/summary")
            return response
        except Exception as e:
            log.exception(f"Failed to fetch account summary for {account_id}: {e}")
            raise HTTPException(status_code=500, detail="Could not fetch account summary")
    
    # @cached(ttl=120) 
    async def get_pnl(self) -> Dict[str, Any]:
        """
        Fetches the partitioned PnL data using the official endpoint.
        The response contains PnL data for all accounts in the session.
        """
        try:
            return await self._req("GET", "/iserver/account/pnl/partitioned")
        except Exception as e:
            log.exception(f"Failed to fetch partitioned PnL: {e}")
            return {} # Return an empty dict on failure

    
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
    @cached(ttl=1500, key_builder=account_specific_key_builder)
    async def account_allocation(self, account_id: str ):
        data = await self._req("GET", f"/portfolio/{account_id}/allocation")
        self.state.allocation = data       
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
            await self._broadcast({
                "type": "book_data", # A unique type for the frontend to identify it
                "data": processed_book
            })

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
                LedgerUpdate(data=ledger_dto).model_dump(by_alias=True) # Use by_alias to serialize correctly
            )
        except Exception as e:
            log.error(f"Failed to parse or dispatch ledger data: {e} - Data was: {full_ledger_items}")
        
    async def _dispatch_pnl(self, msg: dict) -> None:
        """
        Convert an 'spl' frame (either list- or dict-style) into Frontend PnL payload.
        """
        args = msg.get("args")    # may be list OR dict

        rows: dict[str, PnlRow] = {}
        log.info(msg)

        if isinstance(args, dict):
            for k, v in args.items():
                if isinstance(v, dict):

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
                PnlUpdate(type="pnl", data=rows).model_dump()
            )
    
    async def _dispatch_chart_data(self, msg: dict) -> None:
        """
        Parses a historical market data message ('smh') and broadcasts
        a formatted chart update to the frontend.
        """
        topic = msg.get("topic", "")
        if not topic:
            return

        try:
            # Extract the conid from the topic string, e.g., "smh+265598"
            conid = int(topic.split('+')[1])
            server_id = msg.get("serverId")
            chart_bars = msg.get("data", [])

            # When we get the first message, it includes the serverId.
            # We must store it so we can unsubscribe later.
            if conid and server_id:
                self.state.chart_subscriptions[conid] = server_id

            # Format the bar data into the structure our frontend chart expects
            formatted_bars = [
                {
                    "time": bar["t"] // 1000,
                    "open": bar["o"],
                    "high": bar["h"],
                    "low": bar["l"],
                    "close": bar["c"],
                    "volume": bar["v"],
                }
                for bar in chart_bars if "t" in bar # Ensure the bar is valid
            ]
            
            # Only broadcast if there's actual data to send
            if formatted_bars:
                await self._broadcast({
                    "type": "chart_update",
                    "conid": conid,
                    "data": formatted_bars
                })
        except (IndexError, ValueError) as e:
            log.error(f"Could not parse conid from chart data topic '{topic}': {e}")
        except Exception as e:
            log.error(f"Error dispatching chart data: {e}")


        
    async def _dispatch_tick(
    self,
    msg: Dict[str, Any],
) -> None:
        account_id = self._current_ws_account
        if not account_id: return
        all_positions = self.state.positions.get(account_id)
        if all_positions is None:
            all_positions = await self.positions(account_id)
        conid_to_pos = {p["conid"]: p for p in all_positions}
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
            await self._broadcast(update.model_dump())
    
    async def _dispatch_active_stock_update(self, msg: Dict[str, Any]) -> None:
        """
        Creates and sends ONE rich, detailed update for the single active stock,
        including a timestamp so the frontend can build the live chart bar.
        """
        last_price = self._extract_price_from_snapshot(msg)
        if math.isnan(last_price):
            return

        conid = int(msg["topic"].split("+", 1)[1])

        # Construct ONE message with all the data the frontend needs
        update_payload = {
            "type": "active_stock_update",
            "timestamp": int(time.time()), # The crucial timestamp
            "conid": conid,
            "lastPrice": last_price,
            "changeAmount": safe_float_conversion(msg.get("82")),
            "changePercent": safe_float_conversion(msg.get("83")),
            "bid": safe_float_conversion(msg.get("84")),
            "ask": safe_float_conversion(msg.get("86")),
            "dayHigh": safe_float_conversion(msg.get("70")),
            "dayLow": safe_float_conversion(msg.get("71")),
        }
        
        # Filter out null values to keep the payload clean
        final_payload = {k: v for k, v in update_payload.items() if v is not None}

        await self._broadcast(final_payload)

        
    
    async def handle_ws_command(self, command: WebSocketRequest):
        """Processes commands by sending messages to the live IBKR WebSocket."""
        # Use self.state.ibkr_websocket_session consistently
        ws = self.state.ibkr_websocket_session 
        if not self.state.ws_connected or not ws:
            log.warning("Cannot handle command, IBKR WebSocket is not ready yet.")
            return

        action = command.action
        conid = command.conid
        account_id = command.account_id or self._current_ws_account

        if action == "subscribe_stock" and conid:
            log.info(f"Subscribing to market data for conid: {conid}")
            # Set the active stock conid BEFORE subscribing
            self.state.active_stock_conid = conid
            
            # Subscribe to Market Data (Quote: Last, Bid, Ask, etc.)
            smd_cmd = f'smd+{conid}+{{"fields":["31","84","86","82","83","70","71"]}}'
            await ws.send(smd_cmd)
            
            # Subscribe to Price Ladder (BookTrader/Depth)
            if account_id:
                sbd_cmd = f'sbd+{account_id}+{conid}'
                await ws.send(sbd_cmd)

        elif action == "unsubscribe_stock" and conid:
            log.info(f"Unsubscribing from market data for conid: {conid}")
            # Clear the active stock conid
            self.state.active_stock_conid = None
            await ws.send(f'umd+{conid}+{{}}')
            if account_id:
                await ws.send(f'ubd+{account_id}')
                
        elif action == "GET_INITIAL_ALLOCATION":
            await self._send_initial_allocation(account_id)
            
        elif action == "subscribe_portfolio" and account_id:
            log.info(f"Subscribing to portfolio for account: {account_id}")
            account_positions = await self.positions(account_id)
            conids = [str(p["conid"]) for p in account_positions]
            
            self.state.portfolio_subscriptions.update(conids)

            for cid in conids:
                cmd = f'smd+{cid}+{{"fields":["31","7635","83","82"]}}'
                await ws.send(cmd)
                await asyncio.sleep(0.05)

        elif action == "unsubscribe_portfolio" and account_id:
            log.info(f"Unsubscribing from portfolio for account: {account_id}")
            account_positions = await self.positions(account_id)
            conids = [str(p["conid"]) for p in account_positions]
            for cid in conids:
                self.state.portfolio_subscriptions.discard(cid)
                await ws.send(f'umd+{cid}+{{}}')
                await asyncio.sleep(0.05)
                
        else:
            log.warning(f"Unknown or incomplete WebSocket command received: {action}")
            
    async def _websocket_loop(self, account_id: str) -> None:
        """
        Maintains a persistent connection to the IBKR WebSocket.
        Its ONLY job is to connect, run background tasks, and process incoming messages.
        """
        uri = "wss://localhost:5000/v1/api/ws"
        cookie = f'api={{"session":"{self.state.ibkr_session_token}"}}'
        ssl_ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_CLIENT)
        ssl_ctx.check_hostname = False
        ssl_ctx.verify_mode = ssl.CERT_NONE

        while not self.state.shutdown_signal.is_set():
            # Define tasks as None before the try block
            heartbeat_task = None
            allocation_task = None
            try:
                log.info(f"Connecting to IBKR WebSocket for account: {account_id}")
                async with websockets.connect(
                    uri,
                    ssl=ssl_ctx,
                    compression=None,
                    ping_interval=None,
                    additional_headers=[("Cookie", cookie)]
                ) as ws:
                    # --- Connection is live ---
                    self.state.ws_connected = True
                    self.state.ibkr_websocket_session = ws
                    log.info("✅ IBKR WebSocket connection established.")

                    # --- Start Background Tasks ---
                    heartbeat_task = asyncio.create_task(self._ws_heartbeat())
                    allocation_task = asyncio.create_task(self._ws_allocation_refresher(account_id))

                    # --- Main Receive Loop ---
                    async for raw in ws:
                        await self._process_ibkr_message(raw)

            except Exception as exc:
                log.warning(f"IBKR WS loop error: {exc}")
            
            finally:
                # --- Cleanup on Disconnect ---
                log.info("Cleaning up IBKR WebSocket connection...")
                self.state.ws_connected = False
                self.state.ibkr_websocket_session = None
                self.state.pnl_subscribed = False # Reset the flag

                # Safely cancel background tasks
                if heartbeat_task and not heartbeat_task.done():
                    heartbeat_task.cancel()
                if allocation_task and not allocation_task.done():
                    allocation_task.cancel()

                # Attempt to reconnect if not shutting down
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
                await self._broadcast({
                    "type": "allocation",
                    "data": fresh_data
                })
                await asyncio.sleep(300) # Refresh every 5 minutes
            except (asyncio.CancelledError, websockets.exceptions.ConnectionClosed):
                break
            except Exception as e:
                log.error(f"Failed to refresh allocation data: {e}")
                await asyncio.sleep(60) # Wait longer on error
    
    async def _send_initial_allocation(self, account_id: str):
        """
        Checks for cached allocation data, fetches if absent, and broadcasts it.
        This ensures new connections get data immediately.
        """
        log.info("Preparing to send initial allocation data...")
        # The account_allocation method uses a cache, so this is efficient.
        # It will only hit the network if the cache is empty or stale.
        try:
            data_to_send = await self.account_allocation(account_id)
            
            await self._broadcast({
                "type": "allocation",
                "data": data_to_send
            })
            log.info("Successfully sent initial allocation data.")
        except Exception as e:
            log.error(f"Could not send initial allocation data: {e}")

    async def _process_ibkr_message(self, raw_message: str | bytes):
        """Parses and dispatches a single message from the IBKR WebSocket."""
        if isinstance(raw_message, bytes):
            raw_message = raw_message.decode()
        try:
            msgs = json.loads(raw_message)
            if not isinstance(msgs, list):
                msgs = [msgs]

            for msg in msgs:
                if not isinstance(msg, dict):
                    continue
                topic = msg.get("topic", "")
                
                if topic.startswith("smd+"):
                    conid = int(topic.split("+", 1)[1])
                    if self.state.active_stock_conid and conid == self.state.active_stock_conid:
                        await self._dispatch_active_stock_update(msg)
                    else:
                        await self._dispatch_tick(msg)
                
                elif topic == "spl":
                    await self._dispatch_pnl(msg)
                    
                elif topic.startswith("sbd+"):
                    await self._dispatch_book_data(msg)
                    
                elif topic.startswith("smh+"):
                    await self._dispatch_chart_data(msg)

        except (json.JSONDecodeError, UnicodeDecodeError):
            # This can happen with heartbeat messages, safe to ignore.
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
