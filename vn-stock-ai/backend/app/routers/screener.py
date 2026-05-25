from fastapi import APIRouter, Query
from typing import Optional
from app.services.vnstock_service import get_screener
from app.services.cache_service import cache_get, cache_set

router = APIRouter()

@router.get("")
async def screener(
    exchange: str = Query("HOSE"),
    min_pe: Optional[float] = Query(None),
    max_pe: Optional[float] = Query(None),
    min_roe: Optional[float] = Query(None),
    signal: Optional[str] = Query(None),
):
    key = f"screener:{exchange}:{min_pe}:{max_pe}:{min_roe}:{signal}"
    cached = await cache_get(key)
    if cached:
        return cached
    data = get_screener(exchange, min_pe, max_pe, min_roe, signal)
    await cache_set(key, data, ttl=300)
    return data
