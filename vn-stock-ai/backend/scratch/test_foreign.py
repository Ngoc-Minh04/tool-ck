import traceback
import sys
import pandas as pd

try:
    from vnstock.api.trading import Trading
    print("vnstock imported successfully.")
    for ticker in ("FPT", "MBB"):
        t = Trading(symbol=ticker, source="VCI")
        df = t.price_board()
        if df is not None and not df.empty:
            row = df.iloc[0]
            fb_val = row.get(('match', 'foreign_buy_value'))
            fs_val = row.get(('match', 'foreign_sell_value'))
            fb_vol = row.get(('match', 'foreign_buy_volume'))
            fs_vol = row.get(('match', 'foreign_sell_volume'))
            print(f"{ticker}: buy_val={fb_val}, sell_val={fs_val}, buy_vol={fb_vol}, sell_vol={fs_vol}")
except Exception as e:
    print("Error occurred:")
    traceback.print_exc()
