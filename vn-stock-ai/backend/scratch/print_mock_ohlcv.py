import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.services.vnstock_service import _mock_ohlcv

mock_data = _mock_ohlcv("FPT", 365)
print(f"Total mock points: {len(mock_data)}")
dates_to_find = ["2026-03-28", "2026-05-12", "2026-03-04", "2026-02-25", "2025-10-17"]
for item in mock_data:
    if item["date"] in dates_to_find:
        print(item)
