# rate_control.py
import asyncio, os, re, logging
from functools import wraps
from aiolimiter import AsyncLimiter
from httpx import Response

log = logging.getLogger(__name__)

# ------- global + specific limiters -------
GLOBAL = AsyncLimiter(10, 1)            # 10 req / 1 s
ONE_PER_SEC   = AsyncLimiter(1, 1)
ONE_PER_5SEC  = AsyncLimiter(1, 5)
FIVE_CONCUR   = AsyncLimiter(5, 1)      # concurrency gate, not RPS

ENDPOINT_LIMITERS = {
    re.compile(r"/iserver/marketdata/snapshot"): GLOBAL,   # already 10/s
    re.compile(r"/iserver/marketdata/history"):  FIVE_CONCUR,
    re.compile(r"/iserver/account/(orders|pnl|trades)"): ONE_PER_5SEC,
    re.compile(r"/portfolio/(accounts|subaccounts)"): ONE_PER_5SEC,
    re.compile(r"/fyi/"): ONE_PER_SEC,
    re.compile(r"/tickle$"): ONE_PER_SEC,
}

PAID_ENDPOINTS = {
    "/md/regsnapshot",
}

ALLOW_PAID = os.getenv("ALLOW_PAID_ENDPOINTS") == "1"

# ------- decorator -------
def paced(endpoint: str):
    """
    Decorator for IBKRService._make_request – injects pacing, 429 retry,
    and paid-endpoint guard.
    """
    limiter = next((l for pat, l in ENDPOINT_LIMITERS.items() if pat.search(endpoint)), GLOBAL)

    def decorator(fn):
        @wraps(fn)
        async def wrapper(self, method: str, ep: str, **kw) -> Response:
            # paid-call guard
            if any(ep.startswith(p) for p in PAID_ENDPOINTS) and not ALLOW_PAID:
                raise RuntimeError(f"Paid IBKR endpoint blocked: {ep}")

            async with limiter:
                try:
                    resp: Response = await fn(self, method, ep, **kw)
                    return resp
                except Exception as e:
                    # Handle 429 with exponential back-off
                    if getattr(e, "response", None) and e.response.status_code == 429:
                        retry = int(e.response.headers.get("Retry-After", "15"))
                        log.warning("429 received for %s – sleeping %ss", ep, retry)
                        await asyncio.sleep(retry)
                        return await wrapper(self, method, ep, **kw)
                    raise
        return wrapper
    return decorator
