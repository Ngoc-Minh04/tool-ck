import traceback
import sys
import pandas as pd

try:
    from vnstock.api.trading import Trading
    print("vnstock imported successfully.")
    for idx in ("VNINDEX", "VN30"):
        t = Trading(symbol=idx, source="VCI")
        df = t.price_board()
        if df is not None and not df.empty:
            print(f"\n--- {idx} columns ---")
            print(df.columns.tolist())
            print("\n--- First row values ---")
            row = df.iloc[0].to_dict()
            # safely print keys and values
            for k, v in row.items():
                print(f"{k}: {v}")
except Exception as e:
    print("Error occurred:")
    traceback.print_exc()
