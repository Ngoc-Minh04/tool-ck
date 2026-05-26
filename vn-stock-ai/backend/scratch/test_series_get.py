import sys
import pandas as pd

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

from vnstock.api.trading import Trading

ticker = "FPT"
print(f"--- Testing Series.get for {ticker} ---")
try:
    t = Trading(symbol=ticker, source="VCI", show_log=False)
    df = t.price_board(symbols_list=[ticker])
    if not df.empty:
        row = df.iloc[0]
        
        buy_val = row.get(('match', 'foreign_buy_value'))
        sell_val = row.get(('match', 'foreign_sell_value'))
        print("Using row.get(('match', 'foreign_buy_value')):", buy_val)
        print("Using row.get(('match', 'foreign_sell_value')):", sell_val)
        
        # Thử lấy bằng direct access
        buy_val_direct = row[('match', 'foreign_buy_value')]
        sell_val_direct = row[('match', 'foreign_sell_value')]
        print("Using row[('match', 'foreign_buy_value')]:", buy_val_direct)
        print("Using row[('match', 'foreign_sell_value')]:", sell_val_direct)
except Exception as e:
    print("Error:", e)
