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
from models import AccountSummaryData, FrontendMarketDataUpdate
from cache import cached
from rate_control import paced

log = logging.getLogger(__name__)

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

    @cached(ttl=15)
    async def snapshot(self, conids, fields="31,84,86"):
        await self.ensure_accounts()
        q = {"conids": ",".join(map(str, conids)), "fields": fields}
        return await self._req("GET", "/iserver/marketdata/snapshot", params=q)

    @cached(ttl=15)
    async def history(self, conid, period="1w", bar="15min"):
        q = {"conid": conid, "period": period, "bar": bar, "outsideRth": "true"}
        return await self._req("GET", "/iserver/marketdata/history", params=q)

    # positions -------------------------------------------------------
    # @cached(ttl=30)
    async def positions(self, acct: str | None = None):
        acct = acct or await self._primary_account()
        return await self._req("GET", f"/portfolio/{acct}/positions")

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

    


    # ---------- WebSocket handling ----------
    async def _websocket_loop(self) -> None:
        """
        *Dial the Client-Portal WS as a **client***
        • subscribe to every position once
        • forward each ‘tick’ to React via self._broadcast(...)
        • keep the socket alive with "tic"
        """
        uri = "wss://localhost:5000/v1/api/ws"
        ssl_ctx = ssl.SSLContext(); ssl_ctx.check_hostname = False
        ssl_ctx.verify_mode = ssl.CERT_NONE

        while True:                                   # reconnect forever
            try:
                cookie = f"api={{'session':'{self.state.ibkr_session_token}'}}"
                self.state.ws_connected = False       # pessimistic

                # log.debug("[WS]  pulling positions via REST")
                self.state.positions = await self.positions()   # REST call
                conids = [str(p["conid"]) for p in self.state.positions]
                log.info("[WS]  %d positions found", len(conids))
                
                self.state.account_summary = await self.account_summary()

                # --- dial -----------------------------------------------------------------
                async with websockets.connect(
                        uri,
                        ssl=ssl_ctx,
                        additional_headers=[("Cookie", cookie)]) as ws:

                    self.state.ws_connected = True
                    # log.info("[WS]  connected – sending initial snapshot")
                    if self.state.account_summary is not None:
                        await self._broadcast(json.dumps({
                            "type": "account_summary",
                            "data": self.state.account_summary.model_dump()
                        }))

                    # ❶ send one snapshot of positions to FE
                    for idx, p in enumerate(self.state.positions, 1):
                        await self._broadcast(
                            FrontendMarketDataUpdate.from_position_row(p).model_dump_json()
                        )
                        # log.info("[WS]  snapshot %d/%d sent", idx, len(self.state.positions))

                    # ❷ subscribe to live price fields 31 (last) & 7295 (mark)
                    for cid in conids:
                        await ws.send(f'smd+{cid}+{{"fields":["31","7295"]}}')
                    log.info("[WS]  subscriptions sent")

                    # ❸ heartbeat helper ---------------------------------------------------
                    async def heartbeat():
                        while True:
                            await ws.send("tic")
                            await asyncio.sleep(30)
                    hb = asyncio.create_task(heartbeat())

                    # ❹ main receive loop --------------------------------------------------
                    async for raw in ws:                      # raw may be str *or* bytes
                        if isinstance(raw, bytes):            # ← new
                            try:
                                raw = raw.decode("utf-8")     # convert to str
                            except UnicodeDecodeError:
                                continue                      # skip non-UTF8 payloads

                        # from here on `raw` is guaranteed to be str
                        if raw in ("sok", "ack", "hb"):       # ignore housekeeping
                            continue

                        try:
                            payloads = json.loads(raw) if raw.startswith("[") else [json.loads(raw)]
                        except json.JSONDecodeError:
                            # log.debug("non-JSON WS frame ignored: %s", raw[:60])
                            continue                    # ignore "sok", "hb", etc.

                        for msg in payloads:
                            if msg.get("topic", "").startswith("smd+"):
                                # minimal example — just forward entire IBKR blob
                                await self._broadcast(json.dumps(msg))
                    hb.cancel()                        # socket closed cleanly
            except Exception as exc:
                log.warning("WS loop error: %s – reconnect in 15 s", exc)
                await asyncio.sleep(15)

    # ---------- graceful shutdown ----------
    async def stop(self):
        if self._ws_task:
            self._ws_task.cancel()
            with contextlib.suppress(Exception):
                await self._ws_task
        await self.http.aclose()
        
