from app import app

@app.get("/api/test-redis")
async def test_redis():
    try:
        redis_client = app.state.redis
        await redis_client.set("test", "It works!")
        value = await redis_client.get("test")
        return {"redis_test": value}
    except Exception as e:
        return {"error": str(e)}
    
    
@app.get("/api/metrics/cache", include_in_schema=False)
async def cache_metrics():
    try:
        redis = app.state.redis
        info = await redis.info()
        return {
            "used_memory": info['used_memory_human'],
            "connected_clients": info['connected_clients'],
            "uptime": info['uptime_in_seconds'],
            "hits": info['keyspace_hits'],
            "misses": info['keyspace_misses']
        }
    except Exception as e:
        return {"error": str(e)}
    
@app.get("/api/health")
async def health_check():
    try:
        # Test Redis connection
        await app.state.redis.ping()
        redis_status = "healthy"
    except Exception as e:
        redis_status = f"unhealthy: {str(e)}"

    return {
        "status": "ok",
        "redis": redis_status
    }