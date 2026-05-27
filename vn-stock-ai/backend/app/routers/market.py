from fastapi import APIRouter
from app.services.vnstock_service import get_market_overview, get_top_movers, get_foreign_flow, get_quick_quotes, get_market_overview_with_foreign
from app.services.cache_service import cache_get, cache_set
from fastapi.concurrency import run_in_threadpool

router = APIRouter()

@router.get("/overview")
async def overview():
    cached = await cache_get("market:overview")
    if cached:
        return cached
    data = await run_in_threadpool(get_market_overview_with_foreign)
    await cache_set("market:overview", data, ttl=40)
    return data

@router.get("/movers")
async def movers():
    cached = await cache_get("market:movers")
    if cached:
        return cached
    data = await run_in_threadpool(get_top_movers)
    await cache_set("market:movers", data, ttl=300)
    return data

@router.get("/foreign")
async def foreign():
    cached = await cache_get("market:foreign")
    if cached:
        return cached
    data = await run_in_threadpool(get_foreign_flow)
    await cache_set("market:foreign", data, ttl=20)
    return data

@router.get("/quick-quotes")
async def quick_quotes(tickers: str = None):
    if tickers:
        ticker_list = [t.strip().upper() for t in tickers.split(",") if t.strip()]
        # Sort tickers to create a consistent cache key
        cache_key = f"market:quick-quotes:{','.join(sorted(ticker_list))}"
        cached = await cache_get(cache_key)
        if cached:
            return cached
            
        data = await run_in_threadpool(get_quick_quotes, ticker_list)
        # Cache for 1 second to handle rapid requests/multiple tabs safely
        await cache_set(cache_key, data, ttl=1)
        return data
        
    cached = await cache_get("market:quick-quotes")
    if cached:
        return cached
    data = await run_in_threadpool(get_quick_quotes)
    await cache_set("market:quick-quotes", data, ttl=15) # cache for 15 seconds
    return data

