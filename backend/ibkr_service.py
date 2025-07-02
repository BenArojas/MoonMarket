# models.py  – pydantic versions
import asyncio
import contextlib
import json
import logging
import math
import ssl
import httpx
from pydantic import BaseModel, Field
from typing import Awaitable, Callable, Optional, List, Dict, Any
import websockets
from utils import safe_float_conversion
from models import AccountDetailsDTO, AccountInfoDTO, AccountSummaryData, FrontendMarketDataUpdate, LedgerDTO, LedgerEntryDTO, OwnerInfoDTO, PermissionsDTO, PnlRow, PnlUpdate
from cache import cached
from rate_control import paced


        
log = logging.getLogger("ibkr.ws")   # dedicate a channel for WS payloads

class IBKRConfig(BaseModel):
    host: str                  = Field(..., examples=["127.0.0.1"])
    port: int                  = Field(..., examples=[4002])
    client_id: int             = Field(..., examples=[1])
    tls: bool                  = False
    auth_token: Optional[str]  = None   # if you ever need OAuth

class IBKRState(BaseModel):
    ibkr_authenticated: bool = False
    ibkr_session_token: Optional[str] = None
    ws_connected: bool = False
    account_id: Optional[str] = None
    positions: List[Dict[str, Any]] = Field(default_factory=list)
    accounts_fetched: bool = False
    accounts_cache: List[Dict[str, Any]] = Field(default_factory=list)
    allocation: Optional[dict] = None         # assetClass/sector/group
    ledger: Optional[dict] = None             # raw PER-CURRENCY map
    combo_positions: list[dict] = Field(default_factory=list)
    watchlists: list[dict] = Field(default_factory=list)
    pnl: Dict[str, PnlRow] = Field(default_factory=dict)

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
    
    def set_broadcast(self, cb: Callable[[str], Awaitable[None]]) -> None:
        self._broadcast = cb

    # ---------- low-level helpers ----------
    @paced("dynamic")  
    async def _req(self, method: str, ep: str, **kw):
        r = await self.http.request(method, ep, **kw)
        if r.status_code >= 400:
            log.error("IBKR %s %s → %s", method, ep, r.text)
        r.raise_for_status()
        return r.json()

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
        if not self.state.accounts_fetched:
            log.info("Priming IBKR session by calling /iserver/accounts")
            self.state.accounts_cache = await self._req("GET", "/iserver/accounts")
            self.state.accounts_fetched = True

    async def check_and_authenticate(self) -> AuthStatusDTO:
        """
        Called from the /auth/status endpoint.
        Returns AuthStatusDTO; if authenticated for the
        first time it also spins up the WebSocket task.
        """
        if not await self.sso_validate():
            log.info("[SVC]  ➜  not validated – ask user to login")
            return AuthStatusDTO(authenticated=False, websocket_ready=False, message= "Please log in via https://localhost:5000")

        log.info("[SVC]  SSO validated – tickling session …")
        await self.tickle()
        await self._prime_caches()

        if self.state.ibkr_authenticated and not self.state.ws_connected:
            # first time we’re authenticated → launch WS
            log.info("[SVC]  first-time auth – launching WS task")
            self._ws_task = asyncio.create_task(self._websocket_loop())
        self.state.ws_connected = True
        log.info("IBKR WS task started.")

        return AuthStatusDTO(authenticated=True, websocket_ready=self.state.ws_connected,
                             message="Authenticated & session active")
        
    async def logout(self):
        return await self._req("POST", "/logout")
    
    # scanner ----------------------------------------------------------

    @cached(ttl=3600) # Params don't change often, cache for an hour
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
    @cached(ttl=3600)
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

    @cached(ttl=150)
    async def snapshot(self, conids, fields="31,84,86,7635,7741,83"):
        """
        Get market data snapshot for given contract IDs.
        
        Fields:
        - 31: Last Price
        - 84: Bid Price  
        - 86: Ask Price
        - 7635: Mark Price (calculated fair value - best for options)
        """
        await self.ensure_accounts()
        q = {"conids": ",".join(map(str, conids)), "fields": fields}
        return await self._req("GET", "/iserver/marketdata/snapshot", params=q)
    
    def _extract_price_from_snapshot(self, snapshot_data: dict) -> float:
        """
        Extract price for websocket updates - returns NaN if no price available
        (maintains backward compatibility with existing websocket code)
        """
        price = _extract_best_price_from_snapshot(snapshot_data)
        return price if price is not None else float('nan')

    @cached(ttl=150)
    async def history(self, conid, period="1w", bar="15min"):
        await self.ensure_accounts()
        q = {"conid": conid, "period": period, "bar": bar, "outsideRth": "true"}
        return await self._req("GET", "/iserver/marketdata/history", params=q)

    # positions -------------------------------------------------------
    # @cached(ttl=30)
    async def positions(self, acct: str | None = None):
        acct = acct or await self._primary_account()
        all_positions = []
        page_id = 0
        while True:
            # The API uses pageId as a path parameter
            pos_page = await self._req("GET", f"/portfolio/{acct}/positions/{page_id}")
            if not pos_page:
                # No more positions on this page, we're done.
                break 
            all_positions.extend(pos_page)
            page_id += 1

        return all_positions

    # account ---------------------------------------------------------
    async def _primary_account(self) -> str | None:
        if self.state.account_id:
            return self.state.account_id
        data = await self._req("GET", "/portfolio/accounts")
        self.state.account_id = data[0]["accountId"]
        return self.state.account_id
    
    async def get_account_details(self, acct: str | None = None) -> AccountDetailsDTO:
        """Fetch complete account details from multiple endpoints"""
        acct = acct or await self._primary_account()
        
        # 1. Get owner info from signatures-and-owners
        try:
            owner_resp = await self._req("GET", f"/acesws/{acct}/signatures-and-owners")
            owner_data = owner_resp.get("owners", [{}])[0] if owner_resp.get("owners") else {}
            owner_info = OwnerInfoDTO(
                userName=owner_data.get("userName", ""),
                entityName=owner_data.get("entityName", ""),
                roleId=owner_data.get("roleId", "")
            )
        except Exception as e:
            log.error(f"Failed to fetch owner info: {e}")
            owner_info = OwnerInfoDTO(userName="", entityName="", roleId="")

        # 2. Get account info from portfolio/accounts
        try:
            portfolio_resp = await self._req("GET", "/portfolio/accounts")
            account_data = {}
            if isinstance(portfolio_resp, list):
                account_data = next((acc for acc in portfolio_resp if acc.get("accountId") == acct), {})
            elif isinstance(portfolio_resp, dict):
                account_data = portfolio_resp
                
            account_info = AccountInfoDTO(
                accountId=account_data.get("accountId", acct),
                accountTitle=account_data.get("accountTitle", ""),
                accountType=account_data.get("accountType", ""),
                tradingType=account_data.get("tradingType", ""),
                baseCurrency=account_data.get("baseCurrency", "USD"),
                ibEntity=account_data.get("ibEntity", ""),
                clearingStatus=account_data.get("clearingStatus", ""),
                isPaper=account_data.get("isPaper", False)
            )
        except Exception as e:
            log.error(f"Failed to fetch account info: {e}")
            account_info = AccountInfoDTO(
                accountId=acct, accountTitle="", accountType="", 
                tradingType="", baseCurrency="USD", ibEntity="", 
                clearingStatus="", isPaper=False
            )

        # 3. Get permissions from iserver/accounts
        try:
            accounts_resp = await self._req("GET", "/iserver/accounts")
            permissions_data = accounts_resp.get("allowFeatures", {})
            acct_props = accounts_resp.get("acctProps", {}).get(acct, {})

            permissions = PermissionsDTO(
                allowFXConv=permissions_data.get("allowFXConv", False),
                allowCrypto=permissions_data.get("allowCrypto", False),
                allowEventTrading=permissions_data.get("allowEventTrading", False),
                supportsFractions=acct_props.get("supportsFractions", False)
            )
        except Exception as e:
            log.error(f"Failed to fetch permissions: {e}")
            permissions = PermissionsDTO(
                allowFXConv=False, allowCrypto=False, 
                allowEventTrading=False, supportsFractions=False
            )

        return AccountDetailsDTO(
            owner=owner_info,
            account=account_info,
            permissions=permissions
        )
    
    async def _prime_caches(self):
        # await self.ensure_accounts()
        acct = await self._primary_account()
        await self.ensure_accounts()
        # ① positions
        self.state.positions = await self.positions(acct)
        
        self.state.allocation = await self.account_allocation(acct)

        # ③ initial P&L
        pnl_raw = await self._req("GET", "/iserver/account/pnl/partitioned")
        self.state.pnl = pnl_raw.get("upnl", {})
    
    async def account_performance(self, period: str = "1Y", acct: str | None = None) -> list[dict]:
        """
        Fetches historical account NAV data from /pa/performance for the primary account
        and transforms it into the format required by the frontend chart.

        :param period: The period for which to fetch data (e.g., "1D", "1M", "1Y").
        :return: A list of dictionaries, e.g., [{'time': 1609459200, 'value': 100500.75}, ...]
        """
        
        acct = acct or await self._primary_account()

        # Use the primary account ID fetched and stored in app_state
        payload = {
            "acctIds": [acct], 
            "period": period
        }
        headers = {"Content-Type": "application/json"}

        return await self._req(
            "POST", 
            "/pa/performance",
            json=payload,  
            headers=headers
            )
        
    async def account_watchlists(self, acct: str | None = None):
        acct = acct or await self._primary_account()
        if not acct: return None
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
    @cached(ttl=300)
    async def account_allocation(self, acct: str | None = None):
        acct = acct or await self._primary_account()
        data = await self._req("GET", f"/portfolio/{acct}/allocation")
        self.state.allocation = data        # keep latest for WS/REST reuse
        return data

    # ------------------------------------------------------------- combo pos
    @cached(ttl=300)
    async def combo_positions(self, acct: str | None = None, nocache: bool = False):
        acct = acct or await self._primary_account()
        params = {"nocache": str(nocache).lower()}
        data = await self._req("GET", f"/portfolio/{acct}/combo/positions", params=params)
        self.state.combo_positions = data
        return data

    # --------------------------------------------------------------- ledger
    @cached(ttl=300)
    async def ledger(self, account_id: str | None = None) -> LedgerDTO:
        """
        Fetches the complete ledger for a given account.
        The response format is massaged into our LedgerDTO.
        """
        account_id = account_id or await self._primary_account()
        # The raw ledger data from IBKR is a dict with currency keys
        raw_data = await self._req("GET", f"/portfolio/{account_id}/ledger")
        
        base_currency = raw_data.get("BASE", {}).get("currency", "USD")
        ledgers = []
        
        for currency, data in raw_data.items():
            # Skip if essential data is missing
            if "cashbalance" not in data and "settledcash" not in data:
                continue
                
            ledgers.append(LedgerEntryDTO(
                currency=data.get("currency", currency),
                cashBalance=data.get("cashbalance", 0.0),
                settledCash=data.get("settledcash", 0.0),
                unrealizedPnl=data.get("unrealizedpnl", 0.0),
                dividends=data.get("dividends", 0.0),
                exchangeRate=data.get("exchangerate", 1.0)
            ))
            
        return LedgerDTO(baseCurrency=base_currency, ledgers=ledgers)


    # ---------- WebSocket handling ----------
    async def _dispatch_pnl(self, msg: dict) -> None:
        """
        Convert an 'spl' frame (either list- or dict-style) into Frontend PnL payload.
        """
        args = msg.get("args")    # may be list OR dict

        rows: dict[str, PnlRow] = {}

        # — shape A: dict keyed by rowKey ————————————————
        if isinstance(args, dict):
            for k, v in args.items():
                if isinstance(v, dict):
                    rows[k] = PnlRow(**v)

        # — shape B: legacy list of dicts ————————————————
        elif isinstance(args, list):
            for v in args:
                if isinstance(v, dict):
                    key = v.get("key") or v.get("acctId")   # fallback
                    if key:
                        rows[key] = PnlRow(**v)

        if rows:                                           # only broadcast if we parsed something
            await self._broadcast(
                PnlUpdate(type="pnl", data=rows).model_dump_json()
            )

        
    async def _dispatch_tick(
    self,
    msg: Dict[str, Any],
    conid_to_pos: Dict[int, Dict[str, Any]],
) -> None:
        """
        Convert a raw `smd+…` frame from IBKR into FrontendMarketDataUpdate
        and broadcast it to connected WebSocket clients.
        
        This version is robust: it ignores ticks without price data.
        """
        # ── 1. identify the contract ──────────────────────────────────────────
        topic: str = msg["topic"]
        cid: int = int(topic.split("+", 1)[1])

        # ── 2. Extract price from the tick message ────────────────────────────
        last = self._extract_price_from_snapshot(msg)
        # Extract daily percentage change (field 83)
        daily_change_pct = safe_float_conversion(msg.get("83"))
        change_amount = safe_float_conversion(msg.get("82"))

        # ─── SOLUTION: GUARD CLAUSE ───────────────────────────────────────────
        # If no price could be extracted from this specific tick message (e.g., it was
        # just a volume update), stop processing and do not broadcast anything.
        if math.isnan(last):
            return
        # ──────────────────────────────────────────────────────────────────────

        # ── 3. Create the base update object ──────────────────────────────────
        symbol_name = conid_to_pos.get(cid, {}).get("fullName", str(cid))
        
        update = FrontendMarketDataUpdate(
            conid=cid,
            symbol=symbol_name,
            last_price=last,
            daily_change_percent=daily_change_pct,  
            daily_change_amount=change_amount,     
        )

        # ── 4. Enrich with static position data (if we have it) ───────────────
        if (pos := conid_to_pos.get(cid)):
            # log.info(pos)
            qty = pos.get("position")
            cost = pos.get("avgPrice")
            
            asst_cls = pos.get("assetClass")
            if asst_cls == "OPT":
                multiplier = 100
            else:
                multiplier = 1

            update.quantity = qty
            update.avg_bought_price = cost

            # Calculate PnL - this code now only runs if `last` is a valid number
            if qty is not None and cost is not None:
                # The core change is to always use the multiplier.
                calc_value = last * qty * multiplier
                
                # This is the correct PnL calculation for both stocks and options
                calc_pnl_correct = (last - cost) * qty * multiplier

                update.value = calc_value
                update.unrealized_pnl = calc_pnl_correct
        
        # ── 5. Ship it to the front-end ───────────────────────────────────────
        await self._broadcast(update.model_dump_json())
        
    
    
    async def _websocket_loop(self) -> None:
        uri = "wss://localhost:5000/v1/api/ws"
        cookie  = f'api={{"session":"{self.state.ibkr_session_token}"}}'

        ssl_ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_CLIENT)
        ssl_ctx.check_hostname = False
        ssl_ctx.verify_mode    = ssl.CERT_NONE

        while True:                           # reconnect forever
            try:
                acct_id = self.state.account_id or await self._primary_account()
                if not self.state.positions:
                    self.state.positions = await self.positions(acct_id)

                conids   = [str(p["conid"]) for p in self.state.positions]
                conid_to_pos: dict[int, dict] = {p["conid"]: p for p in self.state.positions}

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
                    await ws.send(f"ssd+{acct_id}")
                    await asyncio.sleep(0.05)
                    await ws.send(f"sld+{acct_id}")
                    await asyncio.sleep(0.05)
                    await ws.send(f"spl+{acct_id}")
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
                    
                    async def allocation_refresher():
                        """Periodically re-fetches allocation data and broadcasts it."""
                        acct_id = self.state.account_id or await self._primary_account()
                        while True:
                            await asyncio.sleep(300) # Refresh every 5 minutes
                            try:
                                log.info("Refreshing account allocation...")
                                # This function updates self.state.allocation automatically
                                fresh_data = await self.account_allocation(acct_id)
                                
                                # Now broadcast it to all clients
                                await self._broadcast(json.dumps({
                                    "type": "allocation",
                                    "data": fresh_data
                                }))

                            except Exception as e:
                                log.error("Failed to refresh allocation data: %s", e)
                        
                    hb = asyncio.create_task(heartbeat())
                    alloc_task = asyncio.create_task(allocation_refresher())

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
