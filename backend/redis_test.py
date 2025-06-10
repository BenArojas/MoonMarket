import asyncio
from aiocache import Cache
from auth_secrets import REDIS_URL, REDIS_PASSWORD


async def test():
    cache = Cache(
      Cache.REDIS,
      endpoint=REDIS_URL,
      port=13792,
      password=REDIS_PASSWORD,
      timeout=5,    # give it a few seconds
    )
    try:
        # aiocache exposes the raw client here
        pong = await cache.client.ping()
        print("Redis PING →", pong)
    except Exception as e:
        print("Redis ping failed:", e)

asyncio.run(test())
