# cache.py
import os, json, logging, asyncio
from functools import wraps
from typing import Callable, Awaitable
from aiocache import Cache
from auth_secrets import REDIS_URL, REDIS_PASSWORD

log = logging.getLogger(__name__)
try:
    redis_url = REDIS_URL
    if redis_url:
        cache = Cache(
        Cache.REDIS,
        endpoint=redis_url,
        port=13792,                
        password=REDIS_PASSWORD,  
        timeout=3,       
        )
    else:
        log.info("redis url not found")
        cache = Cache(Cache.MEMORY)
except ImportError:
    raise RuntimeError("Install aiocache[redis] for caching layer")


def cached(ttl: int, key_builder: Callable[..., str] | None = None):
    """
    Decorator to cache coroutine results for `ttl` seconds.
    """
    def decorator(fn: Callable[..., Awaitable]):
        @wraps(fn)
        async def wrapper(*args, **kw):
            key = key_builder(*args, **kw) if key_builder else f"{fn.__name__}:{args[1:]}:{kw}"
            try:
                cached_val = await cache.get(key)
                if cached_val is not None:
                    return json.loads(cached_val)
            except Exception as e:
                log.debug("cache miss %s", e)
            # compute
            val = await fn(*args, **kw)
            try:
                await cache.set(key, json.dumps(val), ttl=ttl)
            except Exception as e:
                log.debug("cache set fail %s", e)
            return val
        return wrapper
    return decorator
