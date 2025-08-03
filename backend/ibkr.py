# ibkr_service.py
import asyncio
import logging
import httpx
from fastapi import HTTPException
from typing import Callable, Awaitable

from config import GATEWAY_BASE_URL
from rate_control import paced
from state import IBKRState

# Import all the mixin classes
from api.auth import AuthMixin
from api.market import MarketDataMixin
from api.orders import OrdersMixin
from api.account import AccountMixin
from ibkr_websocket.handler import WebSocketHandlerMixin

log = logging.getLogger("ibkr.service")

class IBKRService(
    AuthMixin, 
    MarketDataMixin, 
    OrdersMixin, 
    AccountMixin, 
    WebSocketHandlerMixin
):
    """
    Main Interactive Brokers service class.
    Combines functionality from various mixins for a clean, organized structure.
    """
    def __init__(self, base_url: str = f"{GATEWAY_BASE_URL}/v1/api"):
        self.base_url = base_url.rstrip("/")
        self.state = IBKRState()
        self.http = httpx.AsyncClient(
            base_url=self.base_url, 
            verify=False,
            timeout=httpx.Timeout(30.0),
            headers={"Host": "api.ibkr.com"}
        )
        self._ws_task: asyncio.Task | None = None
        self._current_ws_account: str | None = None
        self._broadcast: Callable[[str], Awaitable[None]] | None = None
    
    def set_broadcast(self, cb: Callable[[str], Awaitable[None]]) -> None:
        """Sets the callback function to broadcast messages to clients."""
        self._broadcast = cb
    
    @property
    def _ibkr_ws_session(self):
        """Safely gets the current IBKR WebSocket session from state."""
        return getattr(self.state, 'ibkr_websocket_session', None)
    
    async def wait_for_connection(self):
        """Awaits until the IBKR WebSocket is connected."""
        while not self.state.ws_connected:
            await asyncio.sleep(0.1)

    # This is the core request helper used by ALL API mixins.
    @paced("dynamic")
    async def _req(self, method: str, ep: str, **kw):
        max_retries = 3
        initial_retry_delay = 0.5
        backoff_factor = 2

        for attempt in range(max_retries):
            current_delay = initial_retry_delay * (backoff_factor ** attempt)
            try:
                r = await self.http.request(method, ep, **kw)
                
                if r.status_code in [404, 503] and attempt < max_retries - 1:
                    log.warning(f"Retrying {r.status_code} for {ep}...")
                    await asyncio.sleep(current_delay)
                    continue

                if r.status_code >= 400:
                    log.error("IBKR %s %s → %s (Status: %s)", method, ep, r.text, r.status_code)
                    r.raise_for_status()
                
                return r.json()

            except httpx.ConnectError as e:
                log.error(f"Connection error on attempt {attempt + 1}: {e}")
                if attempt >= max_retries - 1:
                    raise
                await asyncio.sleep(current_delay)
            except httpx.HTTPStatusError as e:
                log.error(f"HTTP Status Error: {e.response.status_code} - {e.response.text}")
                raise

        raise HTTPException(status_code=500, detail="Request failed after all retries.")