import sys
from loguru import logger

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

from services.vnstock_service import get_quick_quotes, get_screener, get_stock_info

tickers = ["VCB", "BID", "CTG", "FPT", "HPG", "ACB", "MBB", "TCB", "VNM", "VIC", "GAS", "SSI"]
print("Calling get_quick_quotes:")
try:
    quotes = get_quick_quotes(tickers)
    for q in quotes:
        print(f"{q['ticker']}: price={q['price']} change={q['change']} pct={q['pct']} is_live={q.get('is_live')}")
except Exception as e:
    print("Error calling get_quick_quotes:", e)

print("\nCalling get_screener:")
try:
    screener_res = get_screener()
    for s in screener_res[:5]:
        print(s)
except Exception as e:
    print("Error calling get_screener:", e)
