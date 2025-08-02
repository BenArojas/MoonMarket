# rate_control.py
import asyncio
import os
import re
import logging
from functools import wraps
from aiolimiter import AsyncLimiter
from httpx import Response

log = logging.getLogger(__name__)

# Custom exception for rate limiting
class RateLimitExceededException(Exception):
    def __init__(self, endpoint: str, retry_after: int = None):
        self.endpoint = endpoint
        self.retry_after = retry_after
        super().__init__(f"Rate limit exceeded for {endpoint}")

# ------- global + specific limiters -------
GLOBAL = AsyncLimiter(10, 1)            # 10 req / 1 s
ONE_PER_SEC   = AsyncLimiter(1, 1)
ONE_PER_5SEC  = AsyncLimiter(1, 5)
ONE_PER_15MIN = AsyncLimiter(1, 900)    # 1 req per 15 minutes (900 seconds)
FIVE_CONCUR   = AsyncLimiter(5, 1)      # concurrency gate, not RPS

ENDPOINT_LIMITERS = {
    re.compile(r"/iserver/marketdata/snapshot"): GLOBAL,
    re.compile(r"/iserver/marketdata/history"):  FIVE_CONCUR,
    re.compile(r"/iserver/account/(orders|pnl|trades)"): ONE_PER_5SEC,
    re.compile(r"/portfolio/(accounts|subaccounts)"): ONE_PER_5SEC,
    re.compile(r"/pa/(performance|summary|transactions)"): ONE_PER_15MIN,
    re.compile(r"/iserver/scanner/params"): ONE_PER_15MIN,
    re.compile(r"/fyi/"): ONE_PER_SEC,
    re.compile(r"/tickle$"): ONE_PER_SEC,
}

PAID_ENDPOINTS = {
    "/md/regsnapshot",
}

ALLOW_PAID = os.getenv("ALLOW_PAID_ENDPOINTS") == "1"

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
            
            # Check if we can acquire the limiter without blocking
            if not limiter.has_capacity:
                # For 15-minute limits, don't wait - throw an error immediately
                if limiter == ONE_PER_15MIN:
                    raise RateLimitExceededException(
                        endpoint=ep, 
                        retry_after=int(limiter.time_to_next_reset)
                    )
            
            async with limiter:
                try:
                    resp: Response = await fn(self, method, ep, **kw)
                    return resp
                except Exception as e:
                    # Handle 429 with exponential back-off
                    if getattr(e, "response", None) and e.response.status_code == 429:
                        retry_after = int(e.response.headers.get("Retry-After", "15"))
                        
                        # For critical rate limits, don't retry - inform the client
                        if retry_after > 60:  # More than 1 minute
                            raise RateLimitExceededException(
                                endpoint=ep,
                                retry_after=retry_after
                            )
                        
                        log.warning("429 received for %s – sleeping %ss", ep, retry_after)
                        await asyncio.sleep(retry_after)
                        return await wrapper(self, method, ep, **kw)
                    raise
        return wrapper
    return decorator