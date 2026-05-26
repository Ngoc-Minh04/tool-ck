import sys
import time
from concurrent.futures import ThreadPoolExecutor

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

from services.vnstock_service import get_quick_quotes, get_stock_info

tickers = ["VCB", "BID", "CTG", "FPT", "HPG", "ACB", "MBB", "TCB", "VNM", "VIC", "GAS", "SSI"]

print("Fetching quick quotes:")
quotes_dict = {}
try:
    quotes = get_quick_quotes(tickers)
    quotes_dict = {q["ticker"]: q for q in quotes}
    print(f"Fetched {len(quotes)} quotes.")
except Exception as e:
    print("Error fetching quick quotes:", e)

print("\nFetching stock info in parallel:")
start_time = time.time()
stock_infos = {}

def fetch_info(ticker):
    try:
        info = get_stock_info(ticker)
        return ticker, info
    except Exception as e:
        return ticker, None

with ThreadPoolExecutor(max_workers=6) as executor:
    results = list(executor.map(fetch_info, tickers))
    for ticker, info in results:
        if info:
            stock_infos[ticker] = info

print(f"Finished in {time.time() - start_time:.2f} seconds.")
print("Stock info results:")
for ticker in tickers:
    info = stock_infos.get(ticker, {})
    q = quotes_dict.get(ticker, {})
    print(f"{ticker}: price={q.get('price')} PE={info.get('pe')} PB={info.get('pb')} ROE={info.get('roe')} (mock={info.get('is_mock', False)})")
