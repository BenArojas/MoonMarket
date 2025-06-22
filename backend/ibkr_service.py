# models.py  – pydantic versions
import asyncio
import contextlib
import json
import logging
import ssl
import httpx
from pydantic import BaseModel, Field
from typing import Awaitable, Callable, Optional, List, Dict, Any
import websockets
from websocket_md import on_close, on_error, on_message, on_open
from models import AccountSummaryData, FrontendMarketDataUpdate, PnlRow, PnlUpdate
from cache import cached
from rate_control import paced
import websocket


        
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
    account_summary: Optional[AccountSummaryData] = None
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
        #     ws = websocket.WebSocketApp(
        #     url="wss://localhost:5000/v1/api/ws",
        #     on_open=on_open,
        #     on_message=on_message,
        #     on_error=on_error,
        #     on_close=on_close
        # )
        # ws.run_forever(sslopt={"cert_reqs":ssl.CERT_NONE})
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
    async def snapshot(self, conids, fields="31,84,86"):
        await self.ensure_accounts()
        q = {"conids": ",".join(map(str, conids)), "fields": fields}
        return await self._req("GET", "/iserver/marketdata/snapshot", params=q)

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
    
    async def account_summary(self, acct: str | None = None) -> AccountSummaryData:
        acct = acct or await self._primary_account()
        response = await self._req("GET", f"/portfolio/{acct}/summary")

        # Transform to AccountSummaryData model
        mapped_summary = {
            key.lower().replace(' ', '_'): details.get("amount") if isinstance(details, dict) else details
            for key, details in response.items()
            if isinstance(details, dict) and "amount" in details # Only take items with amount
        }
        
        summary = AccountSummaryData(
            net_liquidation=mapped_summary.get("netliquidation"),
            total_cash_value=mapped_summary.get("totalcashvalue"),
            buying_power=mapped_summary.get("buyingpower"),
            additional_details={k:v for k,v in response.items() if k.lower().replace(' ', '_') not in mapped_summary}
        )
        return summary
    
    async def _prime_caches(self):
        # await self.ensure_accounts()
        acct = await self._primary_account()

        # ① positions
        self.state.positions = await self.positions(acct)
        self.state.account_summary = await self.account_summary(acct)
        
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
    @cached(ttl=60)
    async def ledger(self, acct: str | None = None):
        acct = acct or await self._primary_account()
        data = await self._req("GET", f"/portfolio/{acct}/ledger")
        self.state.ledger = data
        return data


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
        """
        # ── 1. identify the contract ──────────────────────────────────────────
        topic: str = msg["topic"]            # e.g. "smd+450017186"
        cid:   int = int(topic.split("+", 1)[1])

        # ── 2. mandatory fields ───────────────────────────────────────────────
        price_str = str(msg.get("31", "nan")).lstrip("ABCDEFGHIJKLMNOPQRSTUVWXYZ")
        last = float(price_str or "nan") # If price_str is empty, this becomes float("nan")

        update = FrontendMarketDataUpdate(
            conid      = cid,
            symbol     = conid_to_pos.get(cid, {}).get("contractDesc", str(cid)),
            last_price = last,
        )

        # ── 3. enrich with static position data (if we have it) ───────────────
        if (pos := conid_to_pos.get(cid)):
            qty  = pos["position"]
            cost = pos["avgCost"]

            update.quantity          = qty
            update.avg_bought_price  = cost
            update.value             = last * qty
            update.unrealized_pnl    = (last - cost) * qty   # ← requested calc

        # ── 4. ship it to the front-end ───────────────────────────────────────
        await self._broadcast(update.model_dump_json())
        
    
    

    
    async def _websocket_loop(self) -> None:
        uri     = "wss://localhost:5000/v1/api/ws"
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
                        cmd = f'smd+{cid}+{{"fields":["31","7295"]}}'
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


