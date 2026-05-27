import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.services.vnstock_service import get_ohlcv
from app.services.scanner_service import VN100_TICKERS

target_prices = {
    "2025-10-17": 87190.0,
    "2026-02-25": 89100.0,
    "2026-03-04": 85100.0,
    "2026-05-12": 77700.0,
    "2026-03-28": 74600.0,
}

print("Searching for matching tickers...")
for ticker in VN100_TICKERS:
    ohlcv = get_ohlcv(ticker, "1y")
    matches = 0
    details = []
    for item in ohlcv:
        dt = item["date"]
        close = item["close"]
        if dt in target_prices:
            target = target_prices[dt]
            if abs(close - target) < 100:  # exact match within 100 VND
                matches += 1
                details.append(f"  {dt}: {close} (target {target})")
    if matches >= 3:
        print(f"Ticker: {ticker} has {matches} matches:")
        for d in details:
            print(d)
