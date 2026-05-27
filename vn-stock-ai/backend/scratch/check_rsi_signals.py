import sys
import os
import pandas as pd

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.services.vnstock_service import get_ohlcv
try:
    import pandas_ta as ta
except ImportError:
    import pandas_ta_classic as ta

ticker = "FPT"
ohlcv_data = get_ohlcv(ticker, "1y")
df = pd.DataFrame(ohlcv_data)
df["close"] = pd.to_numeric(df["close"])
df["rsi"] = ta.rsi(df["close"], length=14)

target_dates = ["2025-10-17", "2026-02-25", "2026-03-04", "2026-03-12", "2026-03-20", "2026-03-28", "2026-05-12"]
print("FPT RSI values:")
for item in ohlcv_data:
    dt = item["date"]
    if dt in target_dates:
        row = df[df["date"] == dt]
        rsi_val = row["rsi"].values[0] if not row.empty else None
        close_val = row["close"].values[0] if not row.empty else None
        print(f"  {dt}: close={close_val}, rsi={rsi_val}")
