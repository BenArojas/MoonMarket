# cache.py
import os, json, logging, asyncio
from functools import wraps
from typing import Callable, Awaitable
from aiocache import Cache
from config import REDIS_PASSWORD, REDIS_URL

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

def option_key_builder(*args, **kwargs) -> str:
    """
    Creates a unique cache key for options-related API calls.
    The key includes the function name, conid, month, and optionally strike and right.
    """
    # args[0] is the IBKRService instance
    service_instance = args[0]
    fn_name = f"{service_instance.__class__.__name__}.{kwargs.get('func_name')}"

    # Required parameters from positional args
    conid = args[1]
    month = args[2]

    # Optional parameters (for get_contract_info)
    strike = args[3] if len(args) > 3 else None
    right = args[4] if len(args) > 4 else None

    # Build the key, adding optional parts only if they exist
    key = f"{fn_name}:{conid}:{month}"
    if strike:
        key += f":{strike}"
    if right:
        key += f":{right}"
    
    return key

def snapshot_key_builder(*args, **kwargs) -> str:
    """
    Creates a unique cache key for the snapshot method based on both conids and fields.
    """
    service_instance = args[0]
    fn_name = f"{service_instance.__class__.__name__}.{kwargs.get('func_name')}"

    # --- Get conids (no change here) ---
    conids = kwargs.get('conids')
    if not conids:
        conids = args[1] if len(args) > 1 else None
    if not conids:
        raise ValueError("snapshot_key_builder requires a 'conids' argument.")
    
    # Sort conids for consistency
    sorted_conids = sorted(map(str, conids))

    # --- NEW: Get and process fields ---
    fields_str = kwargs.get('fields')
    if not fields_str:
        fields_str = args[2] if len(args) > 2 else ""

    # Sort fields for consistency (e.g., "31,55" becomes the same key as "55,31")
    sorted_fields = sorted(field.strip() for field in fields_str.split(','))

    # --- The final, corrected key ---
    # Example: "IBKRService.snapshot:265598:31,55,84"
    return f"{fn_name}:{','.join(sorted_conids)}:{','.join(sorted_fields)}"

def history_cache_key_builder(*args, **kwargs) -> str:
    """
    Creates a unique cache key for the IBKRService.history method.
    The key includes the accountId, conid, period, and bar to ensure that
    each unique request for historical data is cached separately.
    """
    # Based on your decorator, args[0] is the IBKRService instance (`self`)
    service_instance = args[0]
    
    # args[1] is the `conid` positional argument
    conid = args[1]

    # The decorator adds 'func_name' to kwargs
    fn_name = f"{service_instance.__class__.__name__}.{kwargs.get('func_name')}"
    
    # The 'period' and 'bar' are passed as keyword arguments
    period = kwargs.get('period')
    bar = kwargs.get('bar')

    # This is a safer way to get the account ID from the instance state
    account_id = getattr(getattr(service_instance, 'state', None), 'selected_account', 'shared')

    # The final key is now unique for every combination of parameters
    return f"{fn_name}:{account_id}:{conid}:{period}:{bar}"

def account_specific_key_builder(*args, **kwargs) -> str:
    """
    Creates a cache key that includes the accountId.
    Assumes 'self' is args[0] and 'accountId' is args[1] or a keyword argument.
    """
    fn_name = args[0].__class__.__name__ + "." + kwargs.get('func_name')
    account_id = kwargs.get('accountId') or (args[1] if len(args) > 1 else None)

    if not account_id:
        raise ValueError("account_specific_key_builder requires an 'accountId' argument.")

    # Create a key like: "IBKRService.ledger:U1234567"
    return f"{fn_name}:{account_id}"

def cached(ttl: int, key_builder: Callable[..., str] | None = None):
    """
    Decorator to cache coroutine results for `ttl` seconds.
    """
    def decorator(fn: Callable[..., Awaitable]):
        @wraps(fn)
        async def wrapper(*args, **kw):

            builder_kw = kw.copy()
            builder_kw['func_name'] = fn.__name__
            key = key_builder(*args, **builder_kw) if key_builder else f"{fn.__name__}:{args[1:]}:{kw}"

            try:
                cached_val = await cache.get(key)
                if cached_val is not None:
                    return json.loads(cached_val)
            except Exception as e:
                log.debug("cache miss %s", e)

            # IMPORTANT: Call the original function with the ORIGINAL, unmodified kwargs
            val = await fn(*args, **kw) 

            try:
                await cache.set(key, json.dumps(val), ttl=ttl)
            except Exception as e:
                log.debug("cache set fail %s", e)
            return val
        return wrapper
    return decorator
