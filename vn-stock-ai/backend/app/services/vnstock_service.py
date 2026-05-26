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



def get_ohlcv(ticker: str, period: str = "3mo", interval: str = "1D") -> list:
    period_map = {"1mo": 30, "3mo": 90, "6mo": 180, "1y": 365, "3y": 1095}
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
        return records
    except BaseException as e:
        logger.error(f"get_ohlcv error {ticker}: {e}")
        return _mock_ohlcv(ticker, period_map.get(period, 90))


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
        }
    except BaseException as e:
        logger.error(f"get_stock_info error {ticker}: {e}")
        return {"ticker": ticker.upper(), "company_name": ticker,
                "industry": "N/A", "pe": None, "pb": None,
                "eps": None, "roe": None, "roa": None, "market_cap": None}


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
    from concurrent.futures import ThreadPoolExecutor
    indices = ["VNINDEX", "VN30", "HNX30", "UPCOM"]

    def fetch_index(idx):
        try:
            from vnstock.api.quote import Quote
            q = Quote(symbol=idx, source="VCI")
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
                }
        except BaseException as idx_err:
            logger.error(f"Market index {idx} error: {idx_err}")
        return _mock_index(idx)

    with ThreadPoolExecutor(max_workers=4) as executor:
        result = list(executor.map(fetch_index, indices))
    return result


def get_top_movers() -> dict:
    # Trực tiếp sử dụng mock data để tăng tốc độ tải và tránh bị rate limit API bởi vnstock
    return _mock_movers()


_last_foreign_flow = []

def get_foreign_flow() -> list:
    from concurrent.futures import ThreadPoolExecutor
    import pandas as pd
    global _last_foreign_flow
    
    tickers = ["VCB", "BID", "CTG", "FPT", "HPG", "VIC", "VNM", "ACB", "MBB", "TCB", "SSI", "MWG", "GAS", "VHM", "VRE"]
    
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
    
    cache_lookup = {r["ticker"]: r for r in _last_foreign_flow} if _last_foreign_flow else {}
    mock_lookup = {r["ticker"]: r for r in mock_fallback}
    
    def fetch_one(ticker):
        try:
            from vnstock.api.trading import Trading
            t = Trading(symbol=ticker, source="VCI")
            df = t.price_board()
            if df is not None and not df.empty:
                row = df.iloc[0]
                def safe_val(v, default=0.0):
                    if v is None or pd.isna(v):
                        return default
                    return float(v)
                buy_val = safe_val(row.get(('match', 'foreign_buy_value')), 0.0)
                sell_val = safe_val(row.get(('match', 'foreign_sell_value')), 0.0)
                net_val = buy_val - sell_val
                return {
                    "ticker": ticker,
                    "buy_value": buy_val,
                    "sell_value": sell_val,
                    "net_value": net_val,
                    "is_live": True
                }
        except BaseException as e:
            logger.warning(f"Failed to fetch foreign flow for {ticker}: {e}")
            
        # Nếu lỗi tải từ sàn, ưu tiên trả về giá trị đã lưu trong cache
        if ticker in cache_lookup:
            return cache_lookup[ticker]
        # Nếu chưa có trong cache, trả về mock fallback để tránh trả về None
        if ticker in mock_lookup:
            mock_copy = mock_lookup[ticker].copy()
            mock_copy["is_live"] = False
            return mock_copy
            
        return {
            "ticker": ticker,
            "buy_value": 0.0,
            "sell_value": 0.0,
            "net_value": 0.0,
            "is_live": False
        }

    with ThreadPoolExecutor(max_workers=8) as executor:
        results = list(executor.map(fetch_one, tickers))
    
    valid_results = [r for r in results if r is not None]
    
    # Kiểm tra xem có dữ liệu giao dịch thực tế không (tổng giá trị mua/bán > 0)
    has_live_data = len(valid_results) > 0 and sum(abs(r["buy_value"]) + abs(r["sell_value"]) for r in valid_results) > 0
    
    if has_live_data:
        # Bổ sung các mã bị thiếu từ cache hoặc mock
        for ticker in tickers:
            if not any(r["ticker"] == ticker for r in valid_results):
                fallback_val = cache_lookup.get(ticker, mock_lookup.get(ticker))
                if fallback_val:
                    valid_results.append(fallback_val)
        _last_foreign_flow = valid_results
        return valid_results
        
    # Nếu API lỗi hoặc ngoài giờ giao dịch (chưa có số liệu mới), dùng lại dữ liệu thật gần nhất trong cache
    if _last_foreign_flow:
        return _last_foreign_flow
        
    # Mặc định trả về dữ liệu mẫu nếu chưa có dữ liệu thật nào được lưu
    return mock_fallback


def get_screener(exchange: str = "HOSE", min_pe: float = None, max_pe: float = None,
                min_roe: float = None, signal: str = None) -> list:
    """Screener co ban - tra ve danh sach co phieu loc"""
    popular = [
        {"ticker": "VCB", "close": 85200, "change_pct": 0.47, "pe": 12.5, "pb": 2.1, "roe": 18.2, "volume": 2140000, "exchange": "HOSE"},
        {"ticker": "BID", "close": 42500, "change_pct": -0.70, "pe": 9.8, "pb": 1.5, "roe": 15.1, "volume": 3560000, "exchange": "HOSE"},
        {"ticker": "CTG", "close": 28700, "change_pct": 0.35, "pe": 8.2, "pb": 1.2, "roe": 14.8, "volume": 4210000, "exchange": "HOSE"},
        {"ticker": "FPT", "close": 132000, "change_pct": 1.15, "pe": 22.3, "pb": 5.8, "roe": 25.4, "volume": 1870000, "exchange": "HOSE"},
        {"ticker": "HPG", "close": 24600, "change_pct": -1.99, "pe": 7.1, "pb": 1.1, "roe": 10.2, "volume": 8940000, "exchange": "HOSE"},
        {"ticker": "ACB", "close": 24800, "change_pct": 1.22, "pe": 7.8, "pb": 1.6, "roe": 19.8, "volume": 5670000, "exchange": "HOSE"},
        {"ticker": "MBB", "close": 26500, "change_pct": 0.75, "pe": 6.9, "pb": 1.3, "roe": 21.5, "volume": 6120000, "exchange": "HOSE"},
        {"ticker": "TCB", "close": 32100, "change_pct": -0.30, "pe": 8.5, "pb": 1.8, "roe": 17.3, "volume": 3450000, "exchange": "HOSE"},
        {"ticker": "VNM", "close": 68500, "change_pct": -0.29, "pe": 18.7, "pb": 4.2, "roe": 22.1, "volume": 980000, "exchange": "HOSE"},
        {"ticker": "VIC", "close": 38900, "change_pct": 0.52, "pe": 35.2, "pb": 2.9, "roe": 8.5, "volume": 1230000, "exchange": "HOSE"},
        {"ticker": "GAS", "close": 72000, "change_pct": 0.14, "pe": 14.2, "pb": 2.8, "roe": 20.3, "volume": 680000, "exchange": "HOSE"},
        {"ticker": "SSI", "close": 28500, "change_pct": -2.05, "pe": 12.1, "pb": 1.9, "roe": 15.6, "volume": 4300000, "exchange": "HOSE"},
    ]
    result = popular
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

def get_quick_quotes(ticker_list: list = None) -> list:
    from concurrent.futures import ThreadPoolExecutor
    import pandas as pd
    
    default_tickers = ["VCB", "BID", "CTG", "FPT", "HPG", "VIC", "VNM", "ACB", "MBB", "TCB", "SSI", "MWG", "GAS", "VHM", "VRE"]
    tickers = ticker_list if ticker_list is not None else default_tickers
    
    fallbacks = {
        'VCB': { 'ticker': 'VCB', 'exchange': 'HOSE', 'price': 85200.0, 'change': 400.0, 'pct': 0.47, 'vol': 2140, 'cap': '530.6T', 'ref': 84800.0, 'ceil': 90700.0, 'floor': 78900.0, 'high': 85500.0, 'low': 84500.0, 'open': 84800.0 },
        'BID': { 'ticker': 'BID', 'exchange': 'HOSE', 'price': 42500.0, 'change': -300.0, 'pct': -0.70, 'vol': 3560, 'cap': '245T', 'ref': 42800.0, 'ceil': 45750.0, 'floor': 39850.0, 'high': 43000.0, 'low': 42400.0, 'open': 42800.0 },
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
        'VHM': { 'ticker': 'VHM', 'exchange': 'HOSE', 'price': 39500.0, 'change': -400.0, 'pct': -1.00, 'vol': 2800, 'cap': '172T', 'ref': 39900.0, 'ceil': 42700.0, 'floor': 37100.0, 'high': 40100.0, 'low': 39400.0, 'open': 39900.0 },
        'VRE': { 'ticker': 'VRE', 'exchange': 'HOSE', 'price': 22500.0, 'change': 300.0, 'pct': 1.35, 'vol': 1950, 'cap': '51T', 'ref': 22200.0, 'ceil': 23750.0, 'floor': 20650.0, 'high': 22700.0, 'low': 22150.0, 'open': 22200.0 },
    }

    def fetch_one(ticker):
        try:
            from vnstock.api.trading import Trading
            t = Trading(symbol=ticker, source="VCI")
            df = t.price_board()
            
            if df is not None and not df.empty:
                row = df.iloc[0]
                
                def safe_val(v, default=0.0):
                    if v is None or pd.isna(v):
                        return default
                    return float(v)

                price = safe_val(row.get(('match', 'match_price')))
                ref_price = safe_val(row.get(('listing', 'ref_price')))
                
                # Nếu chưa có giá khớp trong ngày (trước phiên hoặc đầu ATO), dùng giá tham chiếu
                if price <= 0:
                    price = ref_price
                    
                ceil_price = safe_val(row.get(('listing', 'ceiling')), price * 1.07)
                floor_price = safe_val(row.get(('listing', 'floor')), price * 0.93)
                open_price = safe_val(row.get(('match', 'open_price')), price)
                high_price = safe_val(row.get(('match', 'highest')), price)
                low_price = safe_val(row.get(('match', 'lowest')), price)
                volume = int(safe_val(row.get(('match', 'accumulated_volume')), 0.0))
                
                # Quy đổi về VNĐ nếu API trả về dạng đơn vị nghìn đồng
                if price < 1000:
                    price *= 1000
                    ref_price *= 1000
                    ceil_price *= 1000
                    floor_price *= 1000
                    open_price *= 1000
                    high_price *= 1000
                    low_price *= 1000
                    
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
                return res
        except BaseException as e:
            logger.warning(f"Failed to fetch live quote for {ticker}: {e}")
            
        if ticker in _last_live_quotes:
            return _last_live_quotes[ticker]
            
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
        return fb_copy

    # Sử dụng 8 workers để tối ưu hóa tải song song bảng giá thực tế từ sàn
    with ThreadPoolExecutor(max_workers=8) as executor:
        results = list(executor.map(fetch_one, tickers))
        
    return results
