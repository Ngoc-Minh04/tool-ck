import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.services.vnstock_service import get_ohlcv
from app.services.indicator_service import compute_backtest

ticker = "FPT"
ohlcv_data = get_ohlcv(ticker, "1y")

for strat in ["ma_cross", "rsi", "macd"]:
    res = compute_backtest(ohlcv_data, strat, 100000000.0)
    print(f"\n================ STRATEGY: {strat} ================")
    print("Total trades:", res["total_trades"])
    print("Total Return:", res["total_return"])
    print("Trades:")
    for t in res["trades"]:
        print(f"  {t['date']}: {t['type'].upper()} at {t['price']:.2f}, shares: {t['shares']}, pnl: {t.get('pnl', 0.0):.2f}")
