import sys
sys.path.append("app")
import pandas as pd
from vnstock.api.trading import Trading

tickers = ["VCB", "BID", "CTG", "FPT", "HPG", "ACB", "MBB", "TCB", "VNM", "VIC", "GAS", "SSI"]
t = Trading(symbol=tickers[0], source="VCI", show_log=False)
df = t.price_board(symbols_list=tickers)

if df is not None and not df.empty:
    print("Columns in price_board:")
    print(df.columns.tolist())
    print("\nFirst 3 rows values:")
    for idx, row in df.head(3).iterrows():
        symbol = row.get(('listing', 'symbol'))
        match_price = row.get(('match', 'match_price'))
        ref_price = row.get(('listing', 'ref_price'))
        open_price = row.get(('match', 'open_price'))
        highest = row.get(('match', 'highest'))
        lowest = row.get(('match', 'lowest'))
        accumulated_vol = row.get(('match', 'accumulated_volume'))
        print(f"{symbol}: match_price={match_price}, ref_price={ref_price}, open_price={open_price}, highest={highest}, lowest={lowest}, accumulated_vol={accumulated_vol}")
else:
    print("DataFrame is empty or None")
