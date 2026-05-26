import sys
from loguru import logger
from datetime import date, timedelta

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

from vnstock.api.quote import Quote

print("--- Testing Quote for UPCOMINDEX ---")
try:
    q = Quote(symbol="UPCOMINDEX", source="VCI")
    print("Quote initialized successfully.")
    end = date.today().strftime("%Y-%m-%d")
    start = (date.today() - timedelta(days=7)).strftime("%Y-%m-%d")
    df = q.history(start=start, end=end, interval="1D")
    print("History df:")
    print(df)
except Exception as e:
    print("Failed for UPCOMINDEX:", e)

print("--- Testing Quote for UPINDEX ---")
try:
    q = Quote(symbol="UPINDEX", source="VCI")
    print("Quote initialized successfully.")
    end = date.today().strftime("%Y-%m-%d")
    start = (date.today() - timedelta(days=7)).strftime("%Y-%m-%d")
    df = q.history(start=start, end=end, interval="1D")
    print("History df:")
    print(df)
except Exception as e:
    print("Failed for UPINDEX:", e)
