import sys
sys.path.append("app")
import pandas as pd
from vnstock.api.trading import Trading

# Print all columns and a sample row to see the exact structure of the DataFrame
try:
    t = Trading(symbol="VCB", source="VCI", show_log=False)
    df = t.price_board(symbols_list=["VCB", "FPT"])
    print("DataFrame Type:", type(df))
    print("Columns:", list(df.columns))
    print("\nRow 0 data:")
    for col in df.columns:
        print(f"Col {col}: {df.iloc[0][col]}")
except Exception as e:
    print("Error:", e)
