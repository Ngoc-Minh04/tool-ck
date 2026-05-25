import pandas as pd
from typing import List
from loguru import logger

def compute_indicators(ohlcv: List[dict]) -> dict:
    if not ohlcv or len(ohlcv) < 10:
        return {"trend": "unknown", "close": None}
    try:
        try:
            import pandas_ta as ta
        except ImportError:
            import pandas_ta_classic as ta
        df = pd.DataFrame(ohlcv)
        df["close"] = pd.to_numeric(df["close"], errors="coerce")
        df["high"] = pd.to_numeric(df["high"], errors="coerce")
        df["low"] = pd.to_numeric(df["low"], errors="coerce")
        df["volume"] = pd.to_numeric(df["volume"], errors="coerce")
        df = df.dropna(subset=["close", "high", "low", "volume"])

        if len(df) < 14:
            return {"trend": "unknown", "close": float(df["close"].iloc[-1]) if not df.empty else None}

        rsi = ta.rsi(df["close"], length=14) if len(df) >= 14 else None
        macd = ta.macd(df["close"], fast=12, slow=26, signal=9) if len(df) >= 26 else None
        bb = ta.bbands(df["close"], length=20, std=2) if len(df) >= 20 else None
        ma20 = ta.sma(df["close"], length=20) if len(df) >= 20 else None
        ma50 = ta.sma(df["close"], length=50) if len(df) >= 50 else None
        ma200 = ta.sma(df["close"], length=200) if len(df) >= 200 else None
        atr = ta.atr(df["high"], df["low"], df["close"], length=14) if len(df) >= 14 else None
        obv = ta.obv(df["close"], df["volume"]) if len(df) >= 2 else None
        stoch = ta.stoch(df["high"], df["low"], df["close"]) if len(df) >= 14 else None
        vol_avg20 = df["volume"].rolling(20).mean() if len(df) >= 20 else None

        def last(series):
            if series is None or (hasattr(series, 'empty') and series.empty):
                return None
            try:
                v = series.dropna()
                return round(float(v.iloc[-1]), 4) if not v.empty else None
            except:
                return None

        close_last = float(df["close"].iloc[-1])
        ma20_last = last(ma20)
        ma50_last = last(ma50)
        ma200_last = last(ma200)

        if ma20_last and ma50_last:
            if close_last > ma20_last > ma50_last:
                trend = "uptrend"
            elif close_last < ma20_last < ma50_last:
                trend = "downtrend"
            else:
                trend = "sideways"
        else:
            trend = "sideways"

        macd_line = last(macd["MACD_12_26_9"]) if macd is not None and "MACD_12_26_9" in macd.columns else None
        macd_signal = last(macd["MACDs_12_26_9"]) if macd is not None and "MACDs_12_26_9" in macd.columns else None
        macd_hist = last(macd["MACDh_12_26_9"]) if macd is not None and "MACDh_12_26_9" in macd.columns else None
        bb_upper = last(bb["BBU_20_2.0"]) if bb is not None and "BBU_20_2.0" in bb.columns else None
        bb_lower = last(bb["BBL_20_2.0"]) if bb is not None and "BBL_20_2.0" in bb.columns else None
        bb_mid = last(bb["BBM_20_2.0"]) if bb is not None and "BBM_20_2.0" in bb.columns else None
        stoch_k = last(stoch["STOCHk_14_3_3"]) if stoch is not None and "STOCHk_14_3_3" in stoch.columns else None
        stoch_d = last(stoch["STOCHd_14_3_3"]) if stoch is not None and "STOCHd_14_3_3" in stoch.columns else None

        return {
            "rsi": last(rsi),
            "macd": macd_line,
            "macd_signal": macd_signal,
            "macd_hist": macd_hist,
            "bb_upper": bb_upper,
            "bb_lower": bb_lower,
            "bb_mid": bb_mid,
            "ma20": ma20_last,
            "ma50": ma50_last,
            "ma200": ma200_last,
            "atr": last(atr),
            "obv": last(obv),
            "stoch_k": stoch_k,
            "stoch_d": stoch_d,
            "trend": trend,
            "volume_avg20": last(vol_avg20),
            "close": close_last,
        }
    except Exception as e:
        logger.error(f"compute_indicators error: {e}")
        return {"trend": "unknown", "close": float(ohlcv[-1].get("close", 0)) if ohlcv else None}


def compute_backtest(ohlcv: List[dict], strategy: str, initial_capital: float = 100_000_000) -> dict:
    """Simple backtest simulation"""
    if len(ohlcv) < 50:
        return {"total_return": 0, "sharpe_ratio": 0, "max_drawdown": 0,
                "win_rate": 0, "total_trades": 0, "equity_curve": []}

    df = pd.DataFrame(ohlcv)
    df["close"] = pd.to_numeric(df["close"])

    try:
        try:
            import pandas_ta as ta
        except ImportError:
            import pandas_ta_classic as ta
        if strategy == "ma_cross":
            df["ma20"] = ta.sma(df["close"], length=20)
            df["ma50"] = ta.sma(df["close"], length=50)
            df["signal"] = 0
            df.loc[df["ma20"] > df["ma50"], "signal"] = 1
            df.loc[df["ma20"] < df["ma50"], "signal"] = -1
        elif strategy == "rsi":
            df["rsi"] = ta.rsi(df["close"], length=14)
            df["signal"] = 0
            df.loc[df["rsi"] < 30, "signal"] = 1
            df.loc[df["rsi"] > 70, "signal"] = -1
        elif strategy == "macd":
            macd = ta.macd(df["close"])
            df["macd_hist"] = macd["MACDh_12_26_9"]
            df["signal"] = 0
            df.loc[df["macd_hist"] > 0, "signal"] = 1
            df.loc[df["macd_hist"] < 0, "signal"] = -1
    except Exception:
        df["signal"] = 0

    capital = initial_capital
    position = 0
    trades = []
    equity_curve = [{"date": str(ohlcv[0]["date"]), "equity": capital}]

    for i in range(1, len(df)):
        sig = df["signal"].iloc[i]
        price = df["close"].iloc[i]
        prev_sig = df["signal"].iloc[i-1]

        if sig == 1 and prev_sig != 1 and capital > 0:
            shares = int(capital / price)
            position = shares
            capital -= shares * price
            trades.append({"type": "buy", "price": price, "shares": shares})
        elif sig == -1 and position > 0:
            revenue = position * price
            entry_cost = trades[-1]["price"] * trades[-1]["shares"] if trades else 0
            pnl = revenue - entry_cost
            trades.append({"type": "sell", "price": price, "pnl": pnl})
            capital += revenue
            position = 0

        total_value = capital + position * price
        equity_curve.append({"date": str(df["date"].iloc[i])[:10], "equity": round(total_value, 0)})

    final_equity = equity_curve[-1]["equity"] if equity_curve else initial_capital
    total_return = ((final_equity - initial_capital) / initial_capital) * 100

    sell_trades = [t for t in trades if t["type"] == "sell"]
    win_trades = [t for t in sell_trades if t.get("pnl", 0) > 0]
    win_rate = len(win_trades) / max(len(sell_trades), 1) * 100

    equities = [e["equity"] for e in equity_curve]
    max_dd = 0
    peak = equities[0]
    for e in equities:
        if e > peak:
            peak = e
        dd = (peak - e) / peak * 100
        if dd > max_dd:
            max_dd = dd

    returns = pd.Series(equities).pct_change().dropna()
    sharpe = (returns.mean() / returns.std() * (252 ** 0.5)) if returns.std() > 0 else 0

    return {
        "total_return": round(total_return, 2),
        "sharpe_ratio": round(float(sharpe), 3),
        "max_drawdown": round(max_dd, 2),
        "win_rate": round(win_rate, 1),
        "total_trades": len(sell_trades),
        "equity_curve": equity_curve[::max(1, len(equity_curve)//200)],  # Downsample
    }


def compute_support_resistance(ohlcv: list) -> dict:
    """
    Tính vùng hỗ trợ/kháng cự bằng 3 phương pháp:
    1. Pivot Points cổ điển (PP, R1, R2, R3, S1, S2, S3)
    2. Swing highs/lows (local extrema)
    3. Price clustering (volume-weighted price zones)
    """
    import numpy as np

    df = pd.DataFrame(ohlcv)
    df[["high", "low", "close", "open", "volume"]] = \
        df[["high", "low", "close", "open", "volume"]].apply(pd.to_numeric, errors="coerce")
    df = df.dropna(subset=["high", "low", "close"])

    if len(df) < 5:
        return {"supports": [], "resistances": [], "pivot_points": {},
                "swing_highs": [], "swing_lows": [], "volume_zones": [], "current_price": 0}

    last = df.iloc[-1]
    prev = df.iloc[-2] if len(df) > 1 else last

    # --- Pivot Points (dùng phiên gần nhất) ---
    H, L, C = float(prev["high"]), float(prev["low"]), float(prev["close"])
    PP = (H + L + C) / 3
    R1 = 2 * PP - L
    R2 = PP + (H - L)
    R3 = H + 2 * (PP - L)
    S1 = 2 * PP - H
    S2 = PP - (H - L)
    S3 = L - 2 * (H - PP)

    # --- Swing Highs/Lows (cửa sổ 5 phiên) ---
    swing_highs, swing_lows = [], []
    highs = df["high"].values
    lows = df["low"].values
    w = 5
    for i in range(w, len(df) - w):
        if highs[i] == max(highs[i - w:i + w + 1]):
            swing_highs.append(round(float(highs[i]), 2))
        if lows[i] == min(lows[i - w:i + w + 1]):
            swing_lows.append(round(float(lows[i]), 2))

    # --- Price clustering (high volume zones) ---
    current = float(last["close"])
    vol_sum = df["volume"].sum()
    vwap_zones = []
    step = current * 0.02  # cluster mỗi 2%
    if step > 0 and vol_sum > 0:
        for price in np.arange(current * 0.8, current * 1.2, step):
            mask = (df["close"] >= price) & (df["close"] < price + step)
            vol_in_zone = df.loc[mask, "volume"].sum()
            if vol_in_zone > vol_sum * 0.05:  # zone > 5% tổng volume
                vwap_zones.append(round(float(price + step / 2), 2))

    # --- Tổng hợp và phân loại ---
    all_levels = {
        "pivot": round(PP, 2),
        "r1": round(R1, 2), "r2": round(R2, 2), "r3": round(R3, 2),
        "s1": round(S1, 2), "s2": round(S2, 2), "s3": round(S3, 2),
    }
    resistances = sorted(set(
        [l for l in [R1, R2, R3] if l > current] +
        [h for h in swing_highs if h > current]
    ))[:5]
    supports = sorted(set(
        [l for l in [S1, S2, S3] if l < current] +
        [l for l in swing_lows if l < current]
    ), reverse=True)[:5]

    return {
        "current_price": round(current, 2),
        "pivot_points": all_levels,
        "supports": [round(x, 2) for x in supports],
        "resistances": [round(x, 2) for x in resistances],
        "swing_highs": swing_highs[-10:],
        "swing_lows": swing_lows[-10:],
        "volume_zones": vwap_zones,
    }
