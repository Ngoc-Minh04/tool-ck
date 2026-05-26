import sys

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

import sys
sys.path.append("app")

from services.vnstock_service import get_quick_quotes

def test_screener():
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
    
    tickers = [s["ticker"] for s in popular]
    try:
        quotes = get_quick_quotes(tickers)
        quotes_map = {q["ticker"]: q for q in quotes if q.get("is_live")}
    except Exception as e:
        print("Failed to fetch quotes:", e)
        quotes_map = {}
        
    result = []
    for s in popular:
        ticker = s["ticker"]
        item = s.copy()
        if ticker in quotes_map:
            q = quotes_map[ticker]
            live_price = q["price"]
            if live_price > 0:
                # Tính toán lại PE, PB dựa trên sự thay đổi của giá đóng cửa
                old_close = s["close"]
                ratio = live_price / old_close
                
                item["close"] = live_price
                item["change_pct"] = q["pct"]
                item["volume"] = q["vol"] * 1000
                if s["pe"] is not None:
                    item["pe"] = round(s["pe"] * ratio, 1)
                if s["pb"] is not None:
                    item["pb"] = round(s["pb"] * ratio, 1)
                item["is_live"] = True
        result.append(item)
        
    for item in result:
        print(f"{item['ticker']}: close={item['close']} PE={item['pe']} PB={item['pb']} ROE={item['roe']} is_live={item.get('is_live', False)}")

test_screener()
