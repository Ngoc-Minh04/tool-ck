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

import datetime

def get_stock_cache_ttl(trading_ttl: int = 120) -> int:
    """
    Tính toán TTL động cho dữ liệu cổ phiếu:
    - Trong giờ giao dịch (Thứ 2 - Thứ 6, 9h00 - 15h00): cache ngắn trading_ttl (120s)
    - Ngoài giờ giao dịch/Cuối tuần: cache động tới 9h00 sáng của ngày giao dịch tiếp theo
    """
    now = datetime.datetime.now()
    weekday = now.weekday()
    time_in_minutes = now.hour * 60 + now.minute
    
    is_weekday = weekday < 5
    is_trading_hours = 540 <= time_in_minutes <= 900
    
    if is_weekday and is_trading_hours:
        return trading_ttl
        
    target_date = now.date()
    if is_weekday:
        if time_in_minutes < 540:
            target_date = now.date()
        else:
            if weekday == 4:  # Thứ Sáu -> target Thứ Hai
                target_date = now.date() + datetime.timedelta(days=3)
            else:
                target_date = now.date() + datetime.timedelta(days=1)
    else:
        days_to_monday = 7 - weekday
        target_date = now.date() + datetime.timedelta(days=days_to_monday)
        
    target_datetime = datetime.datetime.combine(target_date, datetime.time(9, 0, 0))
    delta_seconds = int((target_datetime - now).total_seconds())
    
    return max(delta_seconds, trading_ttl)

