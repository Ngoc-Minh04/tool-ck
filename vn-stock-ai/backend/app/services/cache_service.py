import json
from loguru import logger

# Optional Redis - gracefully degrade if not available
_redis = None
_USE_REDIS = False

async def init_redis(redis_url: str):
    global _redis, _USE_REDIS
    try:
        import redis.asyncio as aioredis
        _redis = await aioredis.from_url(redis_url, decode_responses=True)
        await _redis.ping()
        _USE_REDIS = True
        logger.info("Redis connected")
    except Exception as e:
        logger.warning(f"Redis not available, using in-memory cache: {e}")
        _USE_REDIS = False

# In-memory fallback cache
_mem_cache = {}
import time

async def cache_get(key: str):
    if _USE_REDIS and _redis:
        try:
            val = await _redis.get(key)
            return json.loads(val) if val else None
        except:
            pass
    # Memory fallback
    entry = _mem_cache.get(key)
    if entry and time.time() < entry["expires"]:
        return entry["value"]
    return None

async def cache_set(key: str, value, ttl: int = 300):
    if _USE_REDIS and _redis:
        try:
            await _redis.set(key, json.dumps(value, default=str), ex=ttl)
            return
        except:
            pass
    # Memory fallback
    _mem_cache[key] = {"value": value, "expires": time.time() + ttl}
