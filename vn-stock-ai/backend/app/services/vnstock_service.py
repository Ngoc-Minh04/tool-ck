import sys
import io

class SafeStreamWrapper:
    def __init__(self, original_stream):
        self.original_stream = original_stream
    def write(self, data):
        try:
            self.original_stream.write(data)
        except UnicodeEncodeError:
            try:
                self.original_stream.write(data.encode('ascii', errors='replace').decode('ascii'))
            except:
                pass
    def flush(self):
        self.original_stream.flush()
    def __getattr__(self, name):
        return getattr(self.original_stream, name)

sys.stdout = SafeStreamWrapper(sys.stdout)
sys.stderr = SafeStreamWrapper(sys.stderr)

import pandas as pd
from loguru import logger
import random
from datetime import date, timedelta
import os
import json
import tempfile

CACHE_FILE = os.path.join(tempfile.gettempdir(), "market_cache.json")

def _write_cache(key: str, data):
    cache = {}
    if os.path.exists(CACHE_FILE):
        try:
            with open(CACHE_FILE, "r", encoding="utf-8") as f:
                cache = json.load(f)
        except Exception:
            pass
    cache[key] = data
    try:
        with open(CACHE_FILE, "w", encoding="utf-8") as f:
            json.dump(cache, f, ensure_ascii=False, indent=2)
    except Exception as e:
        logger.error(f"Write cache error: {e}")

def _read_cache(key: str, default=None):
    if not os.path.exists(CACHE_FILE):
        return default
    try:
        with open(CACHE_FILE, "r", encoding="utf-8") as f:
            cache = json.load(f)
            return cache.get(key, default)
    except Exception as e:
        logger.error(f"Read cache error: {e}")
        return default

def is_market_active() -> bool:
    import datetime
    now = datetime.datetime.now()
    day = now.weekday()  # 0=T2, 1=T3, 2=T4, 3=T5, 4=T6, 5=T7, 6=CN
    time_in_minutes = now.hour * 60 + now.minute
    
    # Giờ Việt Nam (GTM+7):
    # - Thứ Hai đến thứ Sáu (day <= 4)
    # - Phiên Sáng: 09:00 - 11:30 (540 phút đến 690 phút)
    # - Phiên Chiều: 13:00 - 15:15 (780 phút đến 915 phút)
    is_weekday = day >= 0 and day <= 4
    is_morning = time_in_minutes >= 540 and time_in_minutes <= 690
    is_afternoon = time_in_minutes >= 780 and time_in_minutes <= 915
    
    return is_weekday and (is_morning or is_afternoon)


def _get_vnstock():
    """Lazy import — thử vnstock (v4) rồi vnstock3, fallback None nếu cả hai lỗi."""
    for pkg in ("vnstock", "vnstock3"):
        try:
            import importlib
            mod = importlib.import_module(pkg)
            return mod.Vnstock
        except Exception as e:
            logger.debug(f"{pkg} import failed: {e}")
    logger.warning("Tất cả vnstock package đều lỗi — sẽ dùng mock data.")
    return None


def Vnstock():
    """Wrapper tương thích cho code cũ dùng Vnstock()."""
    cls = _get_vnstock()
    if cls is None:
        raise ImportError("vnstock/vnstock3 đều không khả dụng")
    return cls()



_ohlcv_cache = {}
OHLCV_CACHE_TTL = 30  # 30 seconds

def get_ohlcv(ticker: str, period: str = "3mo", interval: str = "1D") -> list:
    import time
    key = (ticker.upper(), period, interval)
    now = time.time()
    if key in _ohlcv_cache:
        data, ts = _ohlcv_cache[key]
        if now - ts < OHLCV_CACHE_TTL:
            return data

    period_map = {"1mo": 30, "3mo": 90, "6mo": 180, "1y": 365, "2y": 730, "3y": 1095}
    try:
        from vnstock.api.quote import Quote
        q = Quote(symbol=ticker.upper(), source="VCI")
        days = period_map.get(period, 90)
        end = date.today().strftime("%Y-%m-%d")
        start = (date.today() - timedelta(days=days)).strftime("%Y-%m-%d")
        df = q.history(start=start, end=end, interval=interval)
        df = df.rename(columns={"time": "date", "open": "open", "high": "high",
                                 "low": "low", "close": "close", "volume": "volume"})
        records = df[["date", "open", "high", "low", "close", "volume"]].to_dict("records")
        # Ensure date is string
        for r in records:
            r["date"] = str(r["date"])[:10]
            for col in ("open", "high", "low", "close"):
                if r.get(col) is not None:
                    r[col] = float(r[col]) * 1000
        _ohlcv_cache[key] = (records, now)
        return records
    except BaseException as e:
        logger.error(f"get_ohlcv error {ticker}: {e}")
        mock_data = _mock_ohlcv(ticker, period_map.get(period, 90))
        _ohlcv_cache[key] = (mock_data, now)
        return mock_data


def get_stock_info(ticker: str) -> dict:
    try:
        from vnstock.api.company import Company
        from vnstock.api.financial import Finance
        
        c = Company(symbol=ticker.upper(), source="VCI")
        f = Finance(symbol=ticker.upper(), source="VCI")
        
        # company overview
        overview_df = c.overview()
        overview = overview_df.iloc[0].to_dict() if not overview_df.empty else {}
        
        # financial ratios
        ratio = f.ratio(period="quarter", lang="en")
        
        latest = {}
        if not ratio.empty:
            period_cols = [c for c in ratio.columns if c not in ('item', 'item_en', 'item_id')]
            if period_cols:
                latest_col = period_cols[-1]
                latest = dict(zip(ratio['item_id'], ratio[latest_col]))
        
        # Safe float converters
        def safe_float(val):
            if val is None:
                return None
            try:
                return float(val)
            except (ValueError, TypeError):
                return None

        # ROE/ROA are often represented as decimals (e.g. 0.18) in raw ratio data, convert to %
        roe_val = safe_float(latest.get("roe"))
        if roe_val is not None and abs(roe_val) <= 1.0:
            roe_val = roe_val * 100

        roa_val = safe_float(latest.get("roa"))
        if roa_val is not None and abs(roa_val) <= 1.0:
            roa_val = roa_val * 100

        return {
            "ticker": ticker.upper(),
            "company_name": str(overview.get("organ_short_name", overview.get("organ_name", ticker))),
            "industry": str(overview.get("sector", "N/A")),
            "pe": safe_float(latest.get("pe_ratio")),
            "pb": safe_float(latest.get("pb_ratio")),
            "eps": safe_float(latest.get("eps")),
            "roe": roe_val,
            "roa": roa_val,
            "market_cap": safe_float(overview.get("market_cap")),
            "foreign_net": get_stock_foreign_net(ticker),
        }
    except BaseException as e:
        logger.error(f"get_stock_info error {ticker}: {e}")
        return {"ticker": ticker.upper(), "company_name": ticker,
                "industry": "N/A", "pe": None, "pb": None,
                "eps": None, "roe": None, "roa": None, "market_cap": None,
                "foreign_net": 0.0}


def _estimate_index_breadth(index_name: str, change_pct: float) -> dict:
    import random
    import datetime
    
    now = datetime.datetime.now()
    time_bucket = (now.hour * 60 + now.minute) // 5  # Thay đổi mỗi 5 phút
    seed = sum(ord(c) for c in index_name) + int(now.strftime("%Y%m%d")) + time_bucket
    rng = random.Random(seed)
    
    if index_name == "VNINDEX":
        total = 400
    elif index_name in ("VN30", "HNX30"):
        total = 30
    else:  # UPCOM
        total = 800
        
    unchanged = rng.randint(int(total * 0.08), int(total * 0.15))
    remaining = total - unchanged
    
    clamped = max(-3.0, min(3.0, change_pct))
    advance_ratio = 0.5 + (clamped / 6.0) * 0.8
    advance_ratio += rng.uniform(-0.04, 0.04)
    advance_ratio = max(0.05, min(0.95, advance_ratio))
    
    advance = int(remaining * advance_ratio)
    decline = remaining - advance
    
    if index_name in ("VN30", "HNX30"):
        diff = 30 - (advance + decline + unchanged)
        unchanged += diff
        
    return {
        "advance": advance,
        "decline": decline,
        "unchanged": unchanged
    }


def get_market_overview() -> list:
    # Nếu ngoài giờ giao dịch, ưu tiên dùng dữ liệu cache của phiên hôm trước
    if not is_market_active():
        cached_indices = _read_cache("indices")
        if cached_indices:
            for ci in cached_indices:
                ci["is_live"] = False
            return cached_indices
            
        # Nếu cache rỗng, thử gọi API thật để lấy chỉ số đóng cửa thực tế của phiên gần nhất
        try:
            from concurrent.futures import ThreadPoolExecutor
            indices = ["VNINDEX", "VN30", "HNX30", "UPCOM"]
            
            def fetch_index_outside(idx):
                try:
                    from vnstock.api.quote import Quote
                    query_symbol = "UPCOMINDEX" if idx == "UPCOM" else idx
                    q = Quote(symbol=query_symbol, source="VCI")
                    end = date.today().strftime("%Y-%m-%d")
                    start = (date.today() - timedelta(days=7)).strftime("%Y-%m-%d")
                    df = q.history(start=start, end=end, interval="1D")
                    if df is not None and not df.empty:
                        last = df.iloc[-1]
                        prev = df.iloc[-2] if len(df) > 1 else last
                        change = float(last["close"]) - float(prev["close"])
                        pct = (change / float(prev["close"])) * 100 if prev["close"] else 0
                        breadth = _estimate_index_breadth(idx, pct)
                        return {
                            "index": idx,
                            "close": round(float(last["close"]), 2),
                            "change": round(change, 2),
                            "change_pct": round(pct, 2),
                            "volume": int(last.get("volume", 0)),
                            "advance": breadth["advance"],
                            "decline": breadth["decline"],
                            "unchanged": breadth["unchanged"],
                            "is_live": False
                        }
                except Exception:
                    pass
                return _mock_index(idx)
                
            with ThreadPoolExecutor(max_workers=4) as executor:
                result = list(executor.map(fetch_index_outside, indices))
                
            # Cập nhật cache nếu lấy được giá trị thực tế
            any_real = any(r.get("close") != 100 for r in result)
            if any_real:
                _write_cache("indices", result)
            return result
        except Exception as e:
            logger.warning(f"Failed to fetch market indices for cache: {e}")
            
        return [_mock_index(idx) for idx in ["VNINDEX", "VN30", "HNX30", "UPCOM"]]

    from concurrent.futures import ThreadPoolExecutor
    indices = ["VNINDEX", "VN30", "HNX30", "UPCOM"]

    def fetch_index(idx):
        try:
            from vnstock.api.quote import Quote
            query_symbol = "UPCOMINDEX" if idx == "UPCOM" else idx
            q = Quote(symbol=query_symbol, source="VCI")
            end = date.today().strftime("%Y-%m-%d")
            start = (date.today() - timedelta(days=7)).strftime("%Y-%m-%d")
            df = q.history(start=start, end=end, interval="1D")
            if df is not None and not df.empty:
                last = df.iloc[-1]
                prev = df.iloc[-2] if len(df) > 1 else last
                change = float(last["close"]) - float(prev["close"])
                pct = (change / float(prev["close"])) * 100 if prev["close"] else 0
                
                # Ước lượng số mã tăng/giảm/đứng giá dựa trên tỷ lệ biến động thực tế của chỉ số
                breadth = _estimate_index_breadth(idx, pct)
                
                return {
                    "index": idx,
                    "close": round(float(last["close"]), 2),
                    "change": round(change, 2),
                    "change_pct": round(pct, 2),
                    "volume": int(last.get("volume", 0)),
                    "advance": breadth["advance"],
                    "decline": breadth["decline"],
                    "unchanged": breadth["unchanged"],
                    "is_live": True
                }
        except BaseException as idx_err:
            logger.error(f"Market index {idx} error: {idx_err}")
        
        # Đọc từ cache trước khi fallback sang mock
        cached_indices = _read_cache("indices", [])
        if cached_indices:
            for ci in cached_indices:
                if ci.get("index") == idx:
                    ci_copy = ci.copy()
                    ci_copy["is_live"] = False
                    return ci_copy
                    
        return _mock_index(idx)

    with ThreadPoolExecutor(max_workers=4) as executor:
        result = list(executor.map(fetch_index, indices))
    
    # Cập nhật cache nếu có dữ liệu thật
    has_live = any(r.get("is_live") for r in result)
    if has_live:
        _write_cache("indices", result)
        
    return result


_last_foreign_flow = []

def get_stock_foreign_net(ticker: str) -> float:
    global _last_foreign_flow
    ticker_upper = ticker.upper()
    if _last_foreign_flow:
        for item in _last_foreign_flow:
            if item.get("ticker") == ticker_upper:
                return float(item.get("net_value", 0.0))
    
    # Fallback to direct API request
    try:
        from vnstock.api.trading import Trading
        import pandas as pd
        t = Trading(symbol=ticker_upper, source="VCI", show_log=False)
        df = t.price_board(symbols_list=[ticker_upper])
        if df is not None and not df.empty:
            row = df.iloc[0]
            buy_val = row.get(('match', 'foreign_buy_value'))
            sell_val = row.get(('match', 'foreign_sell_value'))
            
            def safe_val(v):
                if v is None or pd.isna(v):
                    return 0.0
                return float(v)
                
            return safe_val(buy_val) - safe_val(sell_val)
    except Exception as e:
        logger.error(f"get_stock_foreign_net error {ticker_upper}: {e}")
    return 0.0


def get_top_movers() -> dict:
    """Lay danh sach top movers (tang, giam, volume) voi gia tri live tu vnstock"""
    mock_res = _mock_movers()
    gainers = mock_res["top_gain"]
    losers = mock_res["top_loss"]
    volumes = mock_res["top_volume"]
    
    all_tickers = list(set([item["ticker"] for item in gainers + losers + volumes]))
    try:
        quotes = get_quick_quotes(all_tickers)
        quotes_map = {q["ticker"]: q for q in quotes if q.get("is_live")}
    except Exception as e:
        logger.warning(f"Failed to fetch quick quotes for top movers: {e}")
        quotes_map = {}
        
    def update_list(lst):
        res = []
        for item in lst:
            it = item.copy()
            ticker = it["ticker"]
            if ticker in quotes_map:
                q = quotes_map[ticker]
                it["close"] = q["price"]
                it["change_pct"] = q["pct"]
                it["volume"] = q["vol"] * 1000
            res.append(it)
        return res
        
    return {
        "top_gain": update_list(gainers),
        "top_loss": update_list(losers),
        "top_volume": update_list(volumes)
    }



def get_foreign_flow(df = None) -> list:
    global _last_foreign_flow
    
    mock_fallback = [
        {"ticker": "VCB", "buy_value": 85.4e9, "sell_value": 12.1e9, "net_value": 73.3e9},
        {"ticker": "FPT", "buy_value": 62.1e9, "sell_value": 8.5e9, "net_value": 53.6e9},
        {"ticker": "ACB", "buy_value": 48.7e9, "sell_value": 15.2e9, "net_value": 33.5e9},
        {"ticker": "HPG", "buy_value": 22.3e9, "sell_value": 94.6e9, "net_value": -72.3e9},
        {"ticker": "SSI", "buy_value": 18.9e9, "sell_value": 74.5e9, "net_value": -55.6e9},
        {"ticker": "VHM", "buy_value": 31.2e9, "sell_value": 74.3e9, "net_value": -43.1e9},
        {"ticker": "MBB", "buy_value": 35.8e9, "sell_value": 5.2e9, "net_value": 30.6e9},
        {"ticker": "CTG", "buy_value": 15.6e9, "sell_value": 54.5e9, "net_value": -38.9e9},
    ]

    # Nếu ngoài giờ giao dịch, ưu tiên dùng dữ liệu cache của phiên hôm trước
    if not is_market_active():
        cached_foreign = _read_cache("foreign")
        if cached_foreign:
            return cached_foreign
        if _last_foreign_flow:
            return _last_foreign_flow
            
        # Nếu cache trống, thử gọi API thật 1 lần để lấy giao dịch khối ngoại đóng cửa của phiên gần nhất
        try:
            tickers = ["VCB", "BID", "CTG", "FPT", "HPG", "VIC", "VNM", "ACB", "MBB", "TCB", "SSI", "MWG", "GAS", "VHM", "VRE"]
            from vnstock.api.trading import Trading
            t = Trading(symbol=tickers[0], source="VCI", show_log=False)
            df_live = t.price_board(symbols_list=tickers)
            if df_live is not None and not df_live.empty:
                results = []
                for idx_row, row in df_live.iterrows():
                    ticker = row.get(('listing', 'symbol'))
                    if not ticker or pd.isna(ticker):
                        continue
                    ticker = str(ticker).upper()
                    
                    def safe_val(v, default=0.0):
                        if v is None or pd.isna(v):
                            return default
                        return float(v)
                        
                    buy_val = safe_val(row.get(('match', 'foreign_buy_value')), 0.0)
                    sell_val = safe_val(row.get(('match', 'foreign_sell_value')), 0.0)
                    net_val = buy_val - sell_val
                    results.append({
                        "ticker": ticker,
                        "buy_value": buy_val,
                        "sell_value": sell_val,
                        "net_value": net_val,
                        "is_live": False
                    })
                if len(results) > 0 and sum(abs(r["buy_value"]) + abs(r["sell_value"]) for r in results) > 0:
                    _write_cache("foreign", results)
                    _last_foreign_flow = results
                    return results
        except Exception as e:
            logger.warning(f"Failed to fetch foreign flow for cache: {e}")
            
        return mock_fallback

    import pandas as pd
    tickers = ["VCB", "BID", "CTG", "FPT", "HPG", "VIC", "VNM", "ACB", "MBB", "TCB", "SSI", "MWG", "GAS", "VHM", "VRE"]
    
    cache_lookup = {r["ticker"]: r for r in _last_foreign_flow} if _last_foreign_flow else {}
    mock_lookup = {r["ticker"]: r for r in mock_fallback}
    
    results = []
    try:
        if df is None:
            from vnstock.api.trading import Trading
            t = Trading(symbol=tickers[0], source="VCI", show_log=False)
            df = t.price_board(symbols_list=tickers)
        if df is not None and not df.empty:
            for idx_row, row in df.iterrows():
                ticker = row.get(('listing', 'symbol'))
                if not ticker or pd.isna(ticker):
                    continue
                ticker = str(ticker).upper()
                
                def safe_val(v, default=0.0):
                    if v is None or pd.isna(v):
                        return default
                    return float(v)
                    
                buy_val = safe_val(row.get(('match', 'foreign_buy_value')), 0.0)
                sell_val = safe_val(row.get(('match', 'foreign_sell_value')), 0.0)
                net_val = buy_val - sell_val
                results.append({
                    "ticker": ticker,
                    "buy_value": buy_val,
                    "sell_value": sell_val,
                    "net_value": net_val,
                    "is_live": True
                })
    except BaseException as e:
        logger.warning(f"Failed to fetch foreign flow batch: {e}")

    # Điền bổ sung các mã lỗi/thiếu bằng cache hoặc mock
    fetched_tickers = {r["ticker"] for r in results}
    for ticker in tickers:
        if ticker not in fetched_tickers:
            if ticker in cache_lookup:
                results.append(cache_lookup[ticker])
            elif ticker in mock_lookup:
                mock_copy = mock_lookup[ticker].copy()
                mock_copy["is_live"] = False
                results.append(mock_copy)
            else:
                results.append({
                    "ticker": ticker,
                    "buy_value": 0.0,
                    "sell_value": 0.0,
                    "net_value": 0.0,
                    "is_live": False
                })

    # Kiểm tra xem có dữ liệu giao dịch thực tế không (tổng giá trị mua/bán > 0)
    has_live_data = len(results) > 0 and sum(abs(r["buy_value"]) + abs(r["sell_value"]) for r in results) > 0
    if has_live_data:
        _write_cache("foreign", results)
        _last_foreign_flow = results
        return results
        
    cached_foreign = _read_cache("foreign")
    if cached_foreign:
        return cached_foreign
        
    if _last_foreign_flow:
        return _last_foreign_flow
        
    return mock_fallback


def get_screener(exchange: str = "HOSE", min_pe: float = None, max_pe: float = None,
                min_roe: float = None, signal: str = None) -> list:
    """Screener co ban - tra ve danh sach co phieu loc voi gia tri live va chi so tinh toan dong"""
    popular = [
        {"ticker": "VCB", "close": 64400, "change_pct": 1.10, "pe": 16.8, "pb": 4.1, "roe": 25.5, "volume": 2140000, "exchange": "HOSE"},
        {"ticker": "BID", "close": 43600, "change_pct": 1.40, "pe": 16.2, "pb": 2.3, "roe": 14.2, "volume": 3560000, "exchange": "HOSE"},
        {"ticker": "CTG", "close": 35250, "change_pct": 1.29, "pe": 14.6, "pb": 1.2, "roe": 8.3, "volume": 4210000, "exchange": "HOSE"},
        {"ticker": "FPT", "close": 74500, "change_pct": 1.36, "pe": 11.6, "pb": 2.4, "roe": 18.7, "volume": 1870000, "exchange": "HOSE"},
        {"ticker": "HPG", "close": 24250, "change_pct": 0.62, "pe": 8.2, "pb": 1.7, "roe": 23.5, "volume": 8940000, "exchange": "HOSE"},
        {"ticker": "ACB", "close": 24800, "change_pct": 5.31, "pe": 7.5, "pb": 1.8, "roe": 27.7, "volume": 5670000, "exchange": "HOSE"},
        {"ticker": "MBB", "close": 25500, "change_pct": 2.82, "pe": 7.6, "pb": 1.4, "roe": 19.2, "volume": 6120000, "exchange": "HOSE"},
        {"ticker": "TCB", "close": 32900, "change_pct": 1.08, "pe": 20.5, "pb": 3.3, "roe": 21.5, "volume": 3450000, "exchange": "HOSE"},
        {"ticker": "VNM", "close": 59100, "change_pct": 0.00, "pe": 22.1, "pb": 8.8, "roe": 40.8, "volume": 980000, "exchange": "HOSE"},
        {"ticker": "VIC", "close": 213000, "change_pct": -2.65, "pe": 98.6, "pb": 6.8, "roe": 5.0, "volume": 1230000, "exchange": "HOSE"},
        {"ticker": "GAS", "close": 82500, "change_pct": 0.61, "pe": 17.7, "pb": 4.5, "roe": 25.4, "volume": 680000, "exchange": "HOSE"},
        {"ticker": "SSI", "close": 28000, "change_pct": 2.00, "pe": 10.1, "pb": 1.5, "roe": 14.7, "volume": 4300000, "exchange": "HOSE"},
    ]
    
    tickers = [s["ticker"] for s in popular]
    try:
        quotes = get_quick_quotes(tickers)
        quotes_map = {q["ticker"]: q for q in quotes if q.get("is_live")}
    except Exception as e:
        logger.warning(f"Failed to fetch quick quotes for screener: {e}")
        quotes_map = {}
        
    result = []
    for s in popular:
        ticker = s["ticker"]
        item = s.copy()
        if ticker in quotes_map:
            q = quotes_map[ticker]
            live_price = q["price"]
            if live_price > 0:
                old_close = s["close"]
                ratio = live_price / old_close if old_close else 1.0
                
                item["close"] = live_price
                item["change_pct"] = q["pct"]
                item["volume"] = q["vol"] * 1000
                if s["pe"] is not None:
                    item["pe"] = round(s["pe"] * ratio, 1)
                if s["pb"] is not None:
                    item["pb"] = round(s["pb"] * ratio, 1)
                item["is_live"] = True
        result.append(item)

    if min_pe is not None:
        result = [s for s in result if s["pe"] is not None and s["pe"] >= min_pe]
    if max_pe is not None:
        result = [s for s in result if s["pe"] is not None and s["pe"] <= max_pe]
    if min_roe is not None:
        result = [s for s in result if s["roe"] is not None and s["roe"] >= min_roe]
    if exchange and exchange != "ALL":
        result = [s for s in result if s["exchange"] == exchange]
    return result


# ===== MOCK HELPERS =====
def _mock_ohlcv(ticker: str, days: int) -> list:
    seed = sum(ord(c) for c in ticker)
    rng = random.Random(seed)
    base = 20.0 + (seed % 80)
    records = []
    current_date = date.today() - timedelta(days=days)
    while current_date <= date.today():
        if current_date.weekday() < 5:
            change = rng.gauss(0, 0.015)
            base = max(base * (1 + change), 1.0)
            high = base * (1 + abs(rng.gauss(0, 0.008)))
            low = base * (1 - abs(rng.gauss(0, 0.008)))
            open_ = rng.uniform(low, high)
            records.append({
                "date": current_date.strftime("%Y-%m-%d"),
                "open": round(open_ * 1000, 2),
                "high": round(high * 1000, 2),
                "low": round(low * 1000, 2),
                "close": round(base * 1000, 2),
                "volume": rng.randint(500000, 8000000)
            })
        current_date += timedelta(days=1)
    return records


def _mock_index(name: str) -> dict:
    defaults = {
        "VNINDEX": {"close": 1185.42, "change": 3.21, "change_pct": 0.27},
        "VN30": {"close": 1223.78, "change": -1.85, "change_pct": -0.15},
        "HNX30": {"close": 235.61, "change": 0.95, "change_pct": 0.40},
        "UPCOM": {"close": 93.24, "change": 0.12, "change_pct": 0.13},
    }
    d = defaults.get(name, {"close": 100, "change": 0, "change_pct": 0})
    seed = sum(ord(c) for c in name) + int(date.today().strftime("%Y%m%d"))
    rng = random.Random(seed)
    return {
        "index": name,
        "close": d["close"],
        "change": d["change"],
        "change_pct": d["change_pct"],
        "volume": rng.randint(200_000_000, 800_000_000),
        "advance": rng.randint(150, 250),
        "decline": rng.randint(80, 180),
        "unchanged": rng.randint(20, 50),
    }


def _mock_movers() -> dict:
    gainers = [
        {"ticker": "DIG", "close": 18500, "change_pct": 6.90, "volume": 12_500_000},
        {"ticker": "PDR", "close": 22400, "change_pct": 5.45, "volume": 8_200_000},
        {"ticker": "NVL", "close": 15600, "change_pct": 4.70, "volume": 6_800_000},
        {"ticker": "KDH", "close": 32100, "change_pct": 3.88, "volume": 3_400_000},
        {"ticker": "DXG", "close": 17800, "change_pct": 3.50, "volume": 5_100_000},
    ]
    losers = [
        {"ticker": "HPG", "close": 24600, "change_pct": -4.30, "volume": 15_200_000},
        {"ticker": "HSG", "close": 18900, "change_pct": -3.85, "volume": 9_800_000},
        {"ticker": "SSI", "close": 28500, "change_pct": -2.95, "volume": 7_300_000},
        {"ticker": "VIX", "close": 16200, "change_pct": -2.70, "volume": 11_500_000},
        {"ticker": "HCM", "close": 21400, "change_pct": -2.10, "volume": 4_600_000},
    ]
    volumes = [
        {"ticker": "STB", "close": 31500, "change_pct": 1.25, "volume": 25_400_000},
        {"ticker": "MBB", "close": 26500, "change_pct": 0.75, "volume": 18_300_000},
        {"ticker": "HPG", "close": 24600, "change_pct": -4.30, "volume": 15_200_000},
        {"ticker": "VPB", "close": 18900, "change_pct": 0.50, "volume": 14_800_000},
        {"ticker": "ACB", "close": 24800, "change_pct": 1.22, "volume": 13_200_000},
    ]
    return {"top_gain": gainers, "top_loss": losers, "top_volume": volumes}


def _mock_foreign_flow() -> list:
    return [
        {"ticker": "VCB", "buy_value": 85.4e9, "sell_value": 12.1e9, "net_value": 73.3e9},
        {"ticker": "FPT", "buy_value": 62.1e9, "sell_value": 8.5e9, "net_value": 53.6e9},
        {"ticker": "ACB", "buy_value": 48.7e9, "sell_value": 15.2e9, "net_value": 33.5e9},
        {"ticker": "HPG", "buy_value": 22.3e9, "sell_value": 94.6e9, "net_value": -72.3e9},
        {"ticker": "SSI", "buy_value": 18.9e9, "sell_value": 74.5e9, "net_value": -55.6e9},
        {"ticker": "VHM", "buy_value": 31.2e9, "sell_value": 74.3e9, "net_value": -43.1e9},
        {"ticker": "MBB", "buy_value": 35.8e9, "sell_value": 5.2e9, "net_value": 30.6e9},
        {"ticker": "CTG", "buy_value": 15.6e9, "sell_value": 54.5e9, "net_value": -38.9e9},
    ]


_last_live_quotes = {}

def get_quick_quotes(ticker_list: list = None, df = None) -> list:
    import pandas as pd
    
    default_tickers = ["VCB", "BID", "CTG", "FPT", "HPG", "VIC", "VNM", "ACB", "MBB", "TCB", "SSI", "MWG", "GAS", "VHM", "VRE"]
    tickers = ticker_list if ticker_list is not None else default_tickers

    fallbacks = {
        'VCB': { 'ticker': 'VCB', 'exchange': 'HOSE', 'price': 85200.0, 'change': 400.0, 'pct': 0.47, 'vol': 2140, 'cap': '530.6T', 'ref': 84800.0, 'ceil': 90700.0, 'floor': 78900.0, 'high': 85500.0, 'low': 84500.0, 'open': 84800.0 },
        'BID': { 'ticker': 'BID', 'exchange': 'HOSE', 'price': 42500.0, 'change': -300.0, 'pct': -0.7, 'vol': 3560, 'cap': '245T', 'ref': 42800.0, 'ceil': 45750.0, 'floor': 39850.0, 'high': 43000.0, 'low': 42400.0, 'open': 42800.0 },
        'CTG': { 'ticker': 'CTG', 'exchange': 'HOSE', 'price': 28700.0, 'change': 100.0, 'pct': 0.35, 'vol': 4210, 'cap': '185T', 'ref': 28600.0, 'ceil': 30600.0, 'floor': 26600.0, 'high': 28900.0, 'low': 28500.0, 'open': 28600.0 },
        'FPT': { 'ticker': 'FPT', 'exchange': 'HOSE', 'price': 132000.0, 'change': 1500.0, 'pct': 1.15, 'vol': 1870, 'cap': '145T', 'ref': 130500.0, 'ceil': 139600.0, 'floor': 121400.0, 'high': 132500.0, 'low': 130000.0, 'open': 130500.0 },
        'HPG': { 'ticker': 'HPG', 'exchange': 'HOSE', 'price': 24600.0, 'change': -500.0, 'pct': -1.99, 'vol': 8940, 'cap': '140T', 'ref': 25100.0, 'ceil': 26850.0, 'floor': 23350.0, 'high': 25200.0, 'low': 24500.0, 'open': 25100.0 },
        'VIC': { 'ticker': 'VIC', 'exchange': 'HOSE', 'price': 38900.0, 'change': 200.0, 'pct': 0.52, 'vol': 1230, 'cap': '135T', 'ref': 38700.0, 'ceil': 41400.0, 'floor': 36000.0, 'high': 39100.0, 'low': 38600.0, 'open': 38700.0 },
        'VNM': { 'ticker': 'VNM', 'exchange': 'HOSE', 'price': 68500.0, 'change': -200.0, 'pct': -0.29, 'vol': 980, 'cap': '125T', 'ref': 68700.0, 'ceil': 73500.0, 'floor': 63900.0, 'high': 69000.0, 'low': 68300.0, 'open': 68700.0 },
        'ACB': { 'ticker': 'ACB', 'exchange': 'HOSE', 'price': 24800.0, 'change': 300.0, 'pct': 1.22, 'vol': 5670, 'cap': '95T', 'ref': 24500.0, 'ceil': 26200.0, 'floor': 22800.0, 'high': 24900.0, 'low': 24450.0, 'open': 24500.0 },
        'MBB': { 'ticker': 'MBB', 'exchange': 'HOSE', 'price': 26500.0, 'change': 200.0, 'pct': 0.76, 'vol': 6120, 'cap': '115T', 'ref': 26300.0, 'ceil': 28100.0, 'floor': 24500.0, 'high': 26600.0, 'low': 26200.0, 'open': 26300.0 },
        'TCB': { 'ticker': 'TCB', 'exchange': 'HOSE', 'price': 32100.0, 'change': -100.0, 'pct': -0.31, 'vol': 3450, 'cap': '175T', 'ref': 32200.0, 'ceil': 34450.0, 'floor': 30000.0, 'high': 32400.0, 'low': 32000.0, 'open': 32200.0 },
        'SSI': { 'ticker': 'SSI', 'exchange': 'HOSE', 'price': 28500.0, 'change': -600.0, 'pct': -2.06, 'vol': 4300, 'cap': '43T', 'ref': 29100.0, 'ceil': 31100.0, 'floor': 27100.0, 'high': 29200.0, 'low': 28400.0, 'open': 29100.0 },
        'MWG': { 'ticker': 'MWG', 'exchange': 'HOSE', 'price': 55000.0, 'change': 800.0, 'pct': 1.48, 'vol': 2200, 'cap': '80T', 'ref': 54200.0, 'ceil': 58000.0, 'floor': 50400.0, 'high': 55400.0, 'low': 54200.0, 'open': 54200.0 },
        'GAS': { 'ticker': 'GAS', 'exchange': 'HOSE', 'price': 72000.0, 'change': 100.0, 'pct': 0.14, 'vol': 680, 'cap': '165T', 'ref': 71900.0, 'ceil': 76900.0, 'floor': 66900.0, 'high': 72300.0, 'low': 71800.0, 'open': 71900.0 },
        'VHM': { 'ticker': 'VHM', 'exchange': 'HOSE', 'price': 39500.0, 'change': -400.0, 'pct': -1.0, 'vol': 2800, 'cap': '172T', 'ref': 39900.0, 'ceil': 42700.0, 'floor': 37100.0, 'high': 40100.0, 'low': 39400.0, 'open': 39900.0 },
        'VRE': { 'ticker': 'VRE', 'exchange': 'HOSE', 'price': 22500.0, 'change': 300.0, 'pct': 1.35, 'vol': 1950, 'cap': '51T', 'ref': 22200.0, 'ceil': 23750.0, 'floor': 20650.0, 'high': 22700.0, 'low': 22150.0, 'open': 22200.0 },
    }

    # Nếu ngoài giờ giao dịch, ưu tiên dùng dữ liệu cache của phiên hôm trước
    if not is_market_active():
        cached_quotes = _read_cache("quotes", {})
        
        # Nếu cache bị thiếu hoặc trống, thử kết nối API thực tế 1 lần để lấy giá đóng cửa thực tế phiên gần nhất
        has_all_cached = all(t.upper() in cached_quotes for t in tickers)
        if not has_all_cached:
            try:
                if df is None:
                    from vnstock.api.trading import Trading
                    t = Trading(symbol=tickers[0], source="VCI", show_log=False)
                    df_live = t.price_board(symbols_list=tickers)
                else:
                    df_live = df
                    
                if df_live is not None and not df_live.empty:
                    for idx_row, row in df_live.iterrows():
                        ticker = row.get(('listing', 'symbol'))
                        if not ticker or pd.isna(ticker):
                            continue
                        ticker = str(ticker).upper()
                        
                        def safe_val(v, default=0.0):
                            if v is None or pd.isna(v):
                                return default
                            return float(v)

                        price = safe_val(row.get(('match', 'match_price')))
                        ref_price = safe_val(row.get(('listing', 'ref_price')))
                        if price <= 0:
                            price = ref_price
                            
                        ceil_price = safe_val(row.get(('listing', 'ceiling')), price * 1.07)
                        floor_price = safe_val(row.get(('listing', 'floor')), price * 0.93)
                        open_price = safe_val(row.get(('match', 'open_price')), price)
                        high_price = safe_val(row.get(('match', 'highest')), 0.0)
                        low_price = safe_val(row.get(('match', 'lowest')), 0.0)
                        volume = int(safe_val(row.get(('match', 'accumulated_volume')), 0.0))
                        
                        if price < 1000:
                            price *= 1000
                            ref_price *= 1000
                            ceil_price *= 1000
                            floor_price *= 1000
                            open_price *= 1000
                            if high_price > 0:
                                high_price *= 1000
                            if low_price > 0:
                                low_price *= 1000
                        
                        # Nếu high/low = 0 (đầu phiên chưa khớp lệnh), dùng price làm fallback
                        if high_price <= 0:
                            high_price = price
                        if low_price <= 0:
                            low_price = price
                        if open_price <= 0:
                            open_price = price
                            
                        change = price - ref_price
                        pct = (change / ref_price) * 100 if ref_price else 0
                        
                        res = {
                            "ticker": ticker,
                            "exchange": "HOSE",
                            "price": round(price),
                            "change": round(change),
                            "pct": round(pct, 2),
                            "vol": volume // 1000 if volume >= 1000 else volume,
                            "cap": fallbacks.get(ticker, {}).get("cap", "N/A"),
                            "ref": round(ref_price),
                            "ceil": round(ceil_price),
                            "floor": round(floor_price),
                            "high": round(high_price),
                            "low": round(low_price),
                            "open": round(open_price),
                            "is_live": False
                        }
                        cached_quotes[ticker] = res
                    _write_cache("quotes", cached_quotes)
            except Exception as e:
                logger.warning(f"Failed to fetch quotes for cache outside market hours: {e}")

        results = []
        for ticker in tickers:
            t_upper = ticker.upper()
            if t_upper in cached_quotes:
                q_copy = cached_quotes[t_upper].copy()
                q_copy["is_live"] = False
                results.append(q_copy)
            elif t_upper in _last_live_quotes:
                results.append(_last_live_quotes[t_upper])
            else:
                fb = fallbacks.get(t_upper)
                if fb:
                    fb_copy = fb.copy()
                    fb_copy["is_live"] = False
                    results.append(fb_copy)
                else:
                    results.append({
                        "ticker": t_upper,
                        "exchange": "HOSE",
                        "price": 20000.0,
                        "change": 0.0,
                        "pct": 0.0,
                        "vol": 100,
                        "cap": "N/A",
                        "ref": 20000.0,
                        "ceil": 21400.0,
                        "floor": 18600.0,
                        "high": 0.0,
                        "low": 0.0,
                        "open": 20000.0,
                        "is_live": False
                    })
        return results
    
    results = []
    try:
        if df is None:
            from vnstock.api.trading import Trading
            t = Trading(symbol=tickers[0], source="VCI", show_log=False)
            df = t.price_board(symbols_list=tickers)
        if df is not None and not df.empty:
            for idx_row, row in df.iterrows():
                ticker = row.get(('listing', 'symbol'))
                if not ticker or pd.isna(ticker):
                    continue
                ticker = str(ticker).upper()
                
                def safe_val(v, default=0.0):
                    if v is None or pd.isna(v):
                        return default
                    return float(v)

                price = safe_val(row.get(('match', 'match_price')))
                ref_price = safe_val(row.get(('listing', 'ref_price')))
                
                if price <= 0:
                    price = ref_price
                    
                ceil_price = safe_val(row.get(('listing', 'ceiling')), price * 1.07)
                floor_price = safe_val(row.get(('listing', 'floor')), price * 0.93)
                open_price = safe_val(row.get(('match', 'open_price')), price)
                high_price = safe_val(row.get(('match', 'highest')), 0.0)
                low_price = safe_val(row.get(('match', 'lowest')), 0.0)
                volume = int(safe_val(row.get(('match', 'accumulated_volume')), 0.0))
                
                if price < 1000:
                    price *= 1000
                    ref_price *= 1000
                    ceil_price *= 1000
                    floor_price *= 1000
                    open_price *= 1000
                    if high_price > 0:
                        high_price *= 1000
                    if low_price > 0:
                        low_price *= 1000
                
                # Nếu high/low = 0 (đầu phiên chưa khớp lệnh), dùng price làm fallback
                if high_price <= 0:
                    high_price = price
                if low_price <= 0:
                    low_price = price
                if open_price <= 0:
                    open_price = price
                    
                change = price - ref_price
                pct = (change / ref_price) * 100 if ref_price else 0
                
                res = {
                    "ticker": ticker,
                    "exchange": "HOSE",
                    "price": round(price),
                    "change": round(change),
                    "pct": round(pct, 2),
                    "vol": volume // 1000 if volume >= 1000 else volume,
                    "cap": fallbacks.get(ticker, {}).get("cap", "N/A"),
                    "ref": round(ref_price),
                    "ceil": round(ceil_price),
                    "floor": round(floor_price),
                    "high": round(high_price),
                    "low": round(low_price),
                    "open": round(open_price),
                    "is_live": True
                }
                _last_live_quotes[ticker] = res
                results.append(res)
    except BaseException as e:
        logger.warning(f"Failed to fetch live quotes batch: {e}")

    # Ghi nhận kết quả live thành công vào cache (ghi đè hoàn toàn để xóa dữ liệu cũ)
    live_results = {r["ticker"]: r for r in results if r.get("is_live")}
    if live_results:
        _write_cache("quotes", live_results)

    # Điền bổ sung các mã bị thiếu hoặc lỗi bằng cache hoặc mock
    fetched_tickers = {r["ticker"] for r in results}
    cached_quotes = _read_cache("quotes", {})
    for ticker in tickers:
        if ticker not in fetched_tickers:
            if ticker in _last_live_quotes:
                results.append(_last_live_quotes[ticker])
            elif ticker in cached_quotes:
                # Đảm bảo trả về dữ liệu cache dạng offline (is_live=False để client phân biệt)
                q_copy = cached_quotes[ticker].copy()
                q_copy["is_live"] = False
                results.append(q_copy)
            else:
                fb = fallbacks.get(ticker, {
                    "ticker": ticker,
                    "exchange": "HOSE",
                    "price": 0.0,
                    "change": 0.0,
                    "pct": 0.0,
                    "vol": 0,
                    "cap": "N/A",
                    "ref": 0.0,
                    "ceil": 0.0,
                    "floor": 0.0,
                    "high": 0.0,
                    "low": 0.0,
                    "open": 0.0
                })
                fb_copy = fb.copy()
                fb_copy["is_live"] = False
                results.append(fb_copy)
                
    return results


def get_market_overview_with_foreign() -> dict:
    tickers = ["VCB", "BID", "CTG", "FPT", "HPG", "VIC", "VNM", "ACB", "MBB", "TCB", "SSI", "MWG", "GAS", "VHM", "VRE"]
    df = None
    if is_market_active():
        try:
            from vnstock.api.trading import Trading
            t = Trading(symbol=tickers[0], source="VCI", show_log=False)
            df = t.price_board(symbols_list=tickers)
        except BaseException as e:
            logger.warning(f"Failed to fetch combined price board in overview: {e}")
        
    foreign = get_foreign_flow(df=df)
    indices = get_market_overview()
    
    return {
        "indices": indices,
        "foreign": foreign
    }


def get_quarterly_financials(ticker: str) -> dict:
    """Lấy kết quả kinh doanh theo quý từ vnstock, fallback mock nếu lỗi."""
    ticker = ticker.upper()

    def _make_mock():
        import math
        seed = sum(ord(c) for c in ticker)
        base_rev = (seed % 8 + 2) * 800  # 1600 – 8000 tỷ
        base_profit = base_rev * 0.16
        quarters = ['Q2/23','Q3/23','Q4/23','Q1/24','Q2/24','Q3/24','Q4/24','Q1/25']
        rows = []
        for i, q in enumerate(quarters):
            rev    = round(base_rev    * (1 + i * 0.04 + math.sin(i) * 0.08))
            profit = round(base_profit * (1 + i * 0.06 + math.cos(i) * 0.07))
            rows.append({"quarter": q, "revenue": rev, "profit": profit})
        return {"ticker": ticker, "data": rows, "is_mock": True}

    try:
        Vnstock_ = _get_vnstock()
        if Vnstock_ is None:
            return _make_mock()

        # Dùng VCI vì TCBS không được hỗ trợ trong phiên bản này
        stock = Vnstock_().stock(symbol=ticker, source="VCI")
        
        # Thử lấy income statement theo quý
        try:
            df = stock.finance.income_statement(period="quarter", lang="vi")
            if df is None or df.empty:
                raise ValueError("empty income statement")
            
            # 1. Trường hợp giao diện VCI (nằm ngang: các hàng là chỉ tiêu, các cột là các quý)
            if "item_id" in df.columns or "item" in df.columns:
                id_col = "item_id" if "item_id" in df.columns else "item"
                
                # Trích xuất dòng doanh thu
                rev_row = df[df[id_col].str.lower().str.contains("revenue_net|net_sale|gross_revenue|net_revenue", na=False)]
                if rev_row.empty:
                    rev_row = df[df["item"].str.lower().str.contains("doanh thu thuần|doanh thu bán hàng", na=False)]
                
                # Trích xuất dòng lợi nhuận sau thuế
                profit_row = df[df[id_col].str.lower().str.contains("profit_after_tax|net_profit_after_tax|net_profit_loss_after_tax|net_profit", na=False)]
                if profit_row.empty:
                    profit_row = df[df["item"].str.lower().str.contains("lợi nhuận sau thuế", na=False)]
                
                if not rev_row.empty and not profit_row.empty:
                    # Lấy các cột quý (loại trừ các cột thông tin mô tả)
                    quarter_cols = [c for c in df.columns if c not in ("item", "item_en", "item_id")]
                    quarter_cols = sorted(quarter_cols)
                    
                    rows = []
                    # Lấy 8 quý gần nhất
                    for q in quarter_cols[-8:]:
                        rev_val = float(rev_row[q].values[0]) if not pd.isna(rev_row[q].values[0]) else 0.0
                        profit_val = float(profit_row[q].values[0]) if not pd.isna(profit_row[q].values[0]) else 0.0
                        rows.append({
                            "quarter": q,
                            "revenue": int(rev_val / 1e9),  # VND -> Tỷ VND
                            "profit": int(profit_val / 1e9)
                        })
                    
                    logger.info(f"Quarterly financials (VCI layout) for {ticker}: {len(rows)} quarters")
                    return {"ticker": ticker, "data": rows, "is_mock": False}
                    
            # 2. Trường hợp giao diện TCBS cũ (nằm dọc: các hàng là quý, các cột là chỉ tiêu)
            df.columns = [str(c).lower().strip() for c in df.columns]
            rev_col    = next((c for c in df.columns if 'doanh thu' in c or 'revenue' in c or 'net_revenue' in c), None)
            profit_col = next((c for c in df.columns if 'lợi nhuận sau' in c or 'net_profit' in c or 'profit_after' in c), None)
            period_col = next((c for c in df.columns if 'period' in c or 'quarter' in c or 'kỳ' in c or 'quý' in c), None)

            if not rev_col or not profit_col:
                raise ValueError(f"Missing cols. Available: {df.columns.tolist()}")

            rows = []
            for _, row in df.tail(8).iterrows():
                period_label = str(row.get(period_col, '')) if period_col else ''
                rows.append({
                    "quarter": period_label or f"Q{_+1}",
                    "revenue": int(row[rev_col] / 1e9) if pd.notna(row[rev_col]) else 0,  # VND -> tỷ
                    "profit":  int(row[profit_col] / 1e9) if pd.notna(row[profit_col]) else 0,
                })

            logger.info(f"Quarterly financials (legacy layout) for {ticker}: {len(rows)} quarters")
            return {"ticker": ticker, "data": rows, "is_mock": False}

        except Exception as e:
            logger.warning(f"Quarterly income statement failed for {ticker}: {e}")
            return _make_mock()

    except Exception as e:
        logger.error(f"get_quarterly_financials error for {ticker}: {e}")
        return _make_mock()


def get_company_news(ticker: str) -> list:
    """Lấy danh sách tin tức doanh nghiệp từ vnstock."""
    ticker = ticker.upper()
    try:
        Vnstock_ = _get_vnstock()
        if Vnstock_ is None:
            return []
        stock = Vnstock_().stock(symbol=ticker, source="VCI")
        df = stock.company.news()
        if df is None or df.empty:
            return []
        
        rows = []
        # Lấy tối đa 10 tin tức
        for _, row in df.head(10).iterrows():
            title = row.get("news_title", "")
            if not title:
                continue
            rows.append({
                "title": title,
                "url": f"https://cafef.vn/co-phieu/{ticker}.chn",
                "time": row.get("public_date", ""),
            })
        
        logger.info(f"Retrieved {len(rows)} news items for {ticker} from vnstock")
        return rows
    except Exception as e:
        logger.error(f"get_company_news error for {ticker}: {e}")
        return []



