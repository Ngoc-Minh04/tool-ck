from fastapi import APIRouter, Query
import httpx
from app.services.vnstock_service import get_ohlcv, get_stock_info, get_quarterly_financials, Vnstock
from app.services.indicator_service import compute_indicators, compute_backtest, compute_support_resistance
from app.services.prediction_service import predict_price_prophet
from app.services.cache_service import cache_get, cache_set, get_stock_cache_ttl
from app.models.schemas import BacktestRequest
from loguru import logger

router = APIRouter()


@router.get("/predict")
async def predict(ticker: str = Query(...), periods: int = 10, sentiment_score: float = Query(None)):
    """Dự đoán giá N phiên tiếp theo dùng Ensemble Model (Prophet + XGBoost)."""
    # v2: dùng 2 năm dữ liệu để Ensemble Model học chính xác hơn
    key = f"predict_v2:{ticker.upper()}:{periods}:{sentiment_score}"
    cached = await cache_get(key)
    if cached:
        return cached
    from fastapi.concurrency import run_in_threadpool
    ohlcv_data = await run_in_threadpool(get_ohlcv, ticker, "2y", "1D")
    result = await run_in_threadpool(predict_price_prophet, ohlcv_data, periods, sentiment_score)
    result["ticker"] = ticker.upper()
    await cache_set(key, result, ttl=get_stock_cache_ttl(trading_ttl=300))
    return result


@router.get("/{ticker}/predict")
async def predict_path(ticker: str, periods: int = 10, sentiment_score: float = Query(None)):
    return await predict(ticker=ticker, periods=periods, sentiment_score=sentiment_score)



@router.get("/{ticker}/ohlcv")
async def ohlcv_path(ticker: str, period: str = "3mo", interval: str = "1D"):
    return await ohlcv(ticker=ticker, period=period, interval=interval)


@router.get("/ohlcv")
async def ohlcv(ticker: str = Query(...), period: str = "3mo", interval: str = "1D"):
    key = f"ohlcv:{ticker.upper()}:{period}:{interval}"
    cached = await cache_get(key)
    if cached:
        return cached
    data = get_ohlcv(ticker, period, interval)
    await cache_set(key, data, ttl=get_stock_cache_ttl(trading_ttl=120))
    return data


@router.get("/{ticker}/info")
async def info_path(ticker: str):
    return await info(ticker=ticker)


@router.get("/info")
async def info(ticker: str = Query(...)):
    key = f"info:{ticker.upper()}"
    cached = await cache_get(key)
    if cached:
        return cached
    data = get_stock_info(ticker)
    await cache_set(key, data, ttl=get_stock_cache_ttl(trading_ttl=600))
    return data


@router.get("/{ticker}/technicals")
async def technicals_path(ticker: str, period: str = "3mo"):
    return await technicals(ticker=ticker, period=period)


@router.get("/technicals")
async def technicals(ticker: str = Query(...), period: str = "3mo"):
    key = f"tech:{ticker.upper()}:{period}"
    cached = await cache_get(key)
    if cached:
        return cached
    ohlcv_data = get_ohlcv(ticker, period)
    indicators = compute_indicators(ohlcv_data)
    result = {"ticker": ticker.upper(), **indicators}
    await cache_set(key, result, ttl=get_stock_cache_ttl(trading_ttl=120))
    return result


@router.get("/{ticker}/full")
async def full_analysis_path(ticker: str, period: str = "3mo"):
    return await full_analysis(ticker=ticker, period=period)


@router.get("/full")
async def full_analysis(ticker: str = Query(...), period: str = "3mo"):
    key = f"full:{ticker.upper()}:{period}"
    cached = await cache_get(key)
    if cached:
        return cached
    ohlcv_data = get_ohlcv(ticker, period)
    info_data = get_stock_info(ticker)
    tech = compute_indicators(ohlcv_data)
    result = {"ohlcv": ohlcv_data, "info": info_data, "technicals": tech}
    await cache_set(key, result, ttl=get_stock_cache_ttl(trading_ttl=120))
    return result


@router.post("/backtest")
async def backtest(body: BacktestRequest):
    try:
        ohlcv_data = get_ohlcv(body.ticker, body.period)
        result = compute_backtest(ohlcv_data, body.strategy, body.initial_capital)
        return {"ticker": body.ticker, "strategy": body.strategy, **result}
    except ValueError as ve:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        from fastapi import HTTPException
        logger.error(f"Backtest error: {e}")
        raise HTTPException(status_code=500, detail="Không thể chạy thử nghiệm chiến thuật.")


@router.get("/support-resistance")
async def support_resistance(ticker: str = Query(...), period: str = "3mo"):
    """Tính vùng hỗ trợ và kháng cự tự động từ Pivot Points + price clusters"""
    key = f"sr:{ticker.upper()}:{period}"
    cached = await cache_get(key)
    if cached:
        return cached
    ohlcv_data = get_ohlcv(ticker, period)
    if not ohlcv_data:
        return {"supports": [], "resistances": [], "pivot_points": {}}
    result = compute_support_resistance(ohlcv_data)
    await cache_set(key, result, ttl=get_stock_cache_ttl(trading_ttl=120))
    return result


@router.get("/news")
async def stock_news(ticker: str = Query(...)):
    """Lấy tin tức liên quan mã CK từ vnstock (FiinGroup) hoặc fallback CafeF"""
    key = f"news:{ticker.upper()}"
    cached = await cache_get(key)
    if cached:
        return cached
    
    # 1. Thử lấy từ vnstock (FiinGroup)
    try:
        from app.services.vnstock_service import get_company_news
        news = get_company_news(ticker)
        if news:
            await cache_set(key, news, ttl=1800)
            return news
    except Exception as e:
        logger.warning(f"Failed to get news from vnstock for {ticker}: {e}")
        
    # 2. Fallback: Scrape từ CafeF
    try:
        url = f"https://s.cafef.vn/Ajax/PageNew.ashx?symbol={ticker.upper()}&tintuc=1"
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "application/json, text/javascript, */*; q=0.01",
            "Referer": "https://cafef.vn/",
            "X-Requested-With": "XMLHttpRequest"
        }
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.get(url, headers=headers)
            if r.status_code != 200:
                logger.warning(f"CafeF returned status code {r.status_code} for {ticker}")
                return []
            
            try:
                data = r.json()
            except Exception as json_err:
                logger.warning(f"Failed to parse CafeF response as JSON for {ticker}: {json_err}. Raw response: {r.text[:100]}")
                return []

            news = [
                {
                    "title": item.get("Title", ""),
                    "url": item.get("Url", ""),
                    "time": item.get("PublishDate", ""),
                }
                for item in data.get("Data", [])[:10]
            ]
        await cache_set(key, news, ttl=1800)
        return news
    except Exception as e:
        logger.error(f"news error {ticker}: {e}")
        return []



@router.get("/peers")
async def stock_peers(ticker: str = Query(...)):
    """Cổ phiếu cùng ngành để so sánh"""
    key = f"peers:{ticker.upper()}"
    cached = await cache_get(key)
    if cached:
        return cached
    try:
        listing = Vnstock().stock(symbol="ACB", source="VCI").listing
        all_stocks = listing.symbols_by_industries()
        
        current_stock = all_stocks[all_stocks["symbol"] == ticker.upper()]
        if not current_stock.empty:
            industry_code = current_stock.iloc[0]["industry_code"]
            industry_name = current_stock.iloc[0]["industry_name"]
            peers = all_stocks[all_stocks["industry_code"] == industry_code]["symbol"].tolist()
        else:
            industry_name = ""
            peers = []
            
        peers = [p for p in peers if p != ticker.upper()][:10]
        result = {
            "ticker": ticker.upper(),
            "industry": industry_name,
            "peers": peers,
        }
        await cache_set(key, result, ttl=86400)
        return result
    except Exception as e:
        logger.error(f"peers error {ticker}: {e}")
        return {"ticker": ticker.upper(), "industry": "", "peers": []}


@router.get("/{ticker}/quarterly")
async def quarterly_path(ticker: str):
    return await quarterly(ticker=ticker)


@router.get("/quarterly")
async def quarterly(ticker: str = Query(...)):
    key = f"quarterly:{ticker.upper()}"
    cached = await cache_get(key)
    if cached:
        return cached
    data = get_quarterly_financials(ticker)
    await cache_set(key, data, ttl=3600)
    return data
