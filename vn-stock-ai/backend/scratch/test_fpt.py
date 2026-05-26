import traceback
import sys
import pandas as pd

try:
    from vnstock.api.trading import Trading
    print("vnstock imported successfully.")
    t = Trading(symbol="FPT", source="VCI")
    df = t.price_board()
    print("Is df None?", df is None)
    if df is not None:
        print("Is df empty?", df.empty)
        if not df.empty:
            row = df.iloc[0]
            
            def safe_val(v, default=0.0):
                if v is None or pd.isna(v):
                    return default
                return float(v)

            price = safe_val(row.get(('match', 'match_price')))
            ref_price = safe_val(row.get(('listing', 'ref_price')))
            ceil_price = safe_val(row.get(('listing', 'ceiling')), price * 1.07)
            floor_price = safe_val(row.get(('listing', 'floor')), price * 0.93)
            open_price = safe_val(row.get(('match', 'open_price')), price)
            high_price = safe_val(row.get(('match', 'highest')), price)
            low_price = safe_val(row.get(('match', 'lowest')), price)
            volume = int(safe_val(row.get(('match', 'accumulated_volume')), 0.0))
            
            print(f"price={price}, ref={ref_price}, ceil={ceil_price}, floor={floor_price}, open={open_price}, high={high_price}, low={low_price}, vol={volume}")
except Exception as e:
    print("Error occurred:")
    traceback.print_exc()
