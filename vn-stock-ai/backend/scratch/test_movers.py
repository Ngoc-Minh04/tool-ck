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

def test_movers():
    gainers = [
        {"ticker": "DIG", "close": 18500, "change_pct": 6.90, "volume": 12500000},
        {"ticker": "PDR", "close": 22400, "change_pct": 5.45, "volume": 8200000},
        {"ticker": "NVL", "close": 15600, "change_pct": 4.70, "volume": 6800000},
        {"ticker": "KDH", "close": 32100, "change_pct": 3.88, "volume": 3400000},
        {"ticker": "DXG", "close": 17800, "change_pct": 3.50, "volume": 5100000},
    ]
    losers = [
        {"ticker": "HPG", "close": 24600, "change_pct": -4.30, "volume": 15200000},
        {"ticker": "HSG", "close": 18900, "change_pct": -3.85, "volume": 9800000},
        {"ticker": "SSI", "close": 28500, "change_pct": -2.95, "volume": 7300000},
        {"ticker": "VIX", "close": 16200, "change_pct": -2.70, "volume": 11500000},
        {"ticker": "HCM", "close": 21400, "change_pct": -2.10, "volume": 4600000},
    ]
    volumes = [
        {"ticker": "STB", "close": 31500, "change_pct": 1.25, "volume": 25400000},
        {"ticker": "MBB", "close": 26500, "change_pct": 0.75, "volume": 18300000},
        {"ticker": "HPG", "close": 24600, "change_pct": -4.30, "volume": 15200000},
        {"ticker": "VPB", "close": 18900, "change_pct": 0.50, "volume": 14800000},
        {"ticker": "ACB", "close": 24800, "change_pct": 1.22, "volume": 13200000},
    ]

    all_tickers = list(set([item["ticker"] for item in gainers + losers + volumes]))
    try:
        quotes = get_quick_quotes(all_tickers)
        quotes_map = {q["ticker"]: q for q in quotes if q.get("is_live")}
    except Exception as e:
        print("Failed to get quotes:", e)
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
                # Cập nhật volume theo nghìn cổ phiếu (vol trong quick quotes là nghìn cổ phiếu, nên ta nhân 1000)
                it["volume"] = q["vol"] * 1000
            res.append(it)
        return res

    print("--- Updated Gainers ---")
    for item in update_list(gainers):
        print(item)

    print("\n--- Updated Losers ---")
    for item in update_list(losers):
        print(item)

    print("\n--- Updated Volumes ---")
    for item in update_list(volumes):
        print(item)

test_movers()
