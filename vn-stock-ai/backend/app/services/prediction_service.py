"""
Dự đoán giá cổ phiếu — Ensemble Model (Prophet + XGBoost).
- Prophet: bắt xu hướng dài hạn + tính mùa vụ + technical regressors
- XGBoost: bắt pattern kỹ thuật ngắn hạn từ features OHLCV
- Ensemble: kết hợp trọng số 55% Prophet + 45% XGBoost
- Walk-forward Validation: đánh giá độ chính xác thực sự (không in-sample)
"""

from loguru import logger
import warnings
warnings.filterwarnings("ignore")


def _compute_features(df):
    """
    Tính toán các chỉ báo kỹ thuật làm features đầu vào cho cả 2 mô hình.
    Input: DataFrame với cột close, high, low, volume
    Output: DataFrame đã bổ sung features kỹ thuật
    """
    import pandas as pd
    import numpy as np

    c = df["close"]
    h = df.get("high", c)
    lo = df.get("low", c)
    v = df.get("volume", pd.Series([1e6] * len(c), index=c.index))

    # RSI-14
    delta = c.diff()
    gain = delta.where(delta > 0, 0.0).rolling(14).mean()
    loss = (-delta.where(delta < 0, 0.0)).rolling(14).mean()
    rs = gain / loss.replace(0, 1e-10)
    df["rsi"] = 100 - (100 / (1 + rs))

    # MACD histogram
    ema12 = c.ewm(span=12, adjust=False).mean()
    ema26 = c.ewm(span=26, adjust=False).mean()
    macd_line = ema12 - ema26
    signal_line = macd_line.ewm(span=9, adjust=False).mean()
    df["macd_hist"] = macd_line - signal_line

    # Bollinger Bands position (0 = đáy, 1 = đỉnh)
    ma20 = c.rolling(20).mean()
    std20 = c.rolling(20).std()
    bb_upper = ma20 + 2 * std20
    bb_lower = ma20 - 2 * std20
    bb_range = (bb_upper - bb_lower).replace(0, 1e-10)
    df["bb_position"] = (c - bb_lower) / bb_range

    # Volume ratio (volume / MA20 volume)
    vol_ma20 = v.rolling(20).mean().replace(0, 1e-10)
    df["volume_ratio"] = v / vol_ma20

    # ATR % (Average True Range as % of close)
    if "high" in df.columns and "low" in df.columns:
        tr = pd.concat([
            h - lo,
            (h - c.shift()).abs(),
            (lo - c.shift()).abs()
        ], axis=1).max(axis=1)
        atr14 = tr.rolling(14).mean()
        df["atr_pct"] = atr14 / c.replace(0, 1e-10)
    else:
        df["atr_pct"] = 0.02

    # MA crossover signal (-1 to +1)
    ma5 = c.rolling(5).mean()
    ma20_s = c.rolling(20).mean()
    df["ma_signal"] = ((ma5 - ma20_s) / c.replace(0, 1e-10)).clip(-0.1, 0.1)

    # Price momentum (return 5 phiên)
    df["momentum_5"] = c.pct_change(5).clip(-0.2, 0.2)

    return df


def _train_xgboost(df, periods):
    """
    Huấn luyện XGBoost để dự đoán giá đóng cửa N phiên tới.
    Sử dụng sliding window: mỗi sample là 10 phiên lịch sử.
    Trả về list dự đoán (N điểm) + độ không chắc chắn ước tính.
    """
    import numpy as np

    WINDOW = 10  # Sử dụng 10 phiên lịch sử để dự đoán 1 phiên tới
    FEATURE_COLS = ["close_norm", "rsi", "macd_hist_norm", "bb_position",
                    "volume_ratio", "atr_pct", "ma_signal", "momentum_5"]

    # Normalize close về % change (giúp XGBoost tổng quát hơn)
    close_arr = df["close"].values.copy()
    baseline = close_arr[-1]

    df["close_norm"] = df["close"].pct_change().clip(-0.2, 0.2).fillna(0)
    df["macd_hist_norm"] = (df["macd_hist"] / df["close"].replace(0, 1e-10)).clip(-0.05, 0.05).fillna(0)

    # Điền NaN cho các features
    for col in FEATURE_COLS:
        if col in df.columns:
            df[col] = df[col].fillna(0)

    feature_matrix = df[FEATURE_COLS].values

    X, y = [], []
    for i in range(WINDOW, len(feature_matrix)):
        window_features = feature_matrix[i - WINDOW:i].flatten()
        target_return = df["close_norm"].iloc[i]  # % change phiên tiếp theo
        X.append(window_features)
        y.append(target_return)

    if len(X) < 50:
        return None, None

    X = np.array(X)
    y = np.array(y)

    try:
        from xgboost import XGBRegressor
    except ImportError:
        return None, None

    # Walk-forward: train trên 80%, validate trên 20%
    split = int(len(X) * 0.8)
    X_train, X_val = X[:split], X[split:]
    y_train, y_val = y[:split], y[split:]

    model = XGBRegressor(
        n_estimators=200,
        max_depth=4,
        learning_rate=0.05,
        subsample=0.8,
        colsample_bytree=0.8,
        min_child_weight=5,
        gamma=0.1,
        reg_alpha=0.1,
        reg_lambda=1.0,
        random_state=42,
        verbosity=0,
        n_jobs=2
    )
    model.fit(X_train, y_train,
              eval_set=[(X_val, y_val)],
              verbose=False)

    # Dự đoán N phiên tương lai bằng cách roll-forward
    current_features = feature_matrix[-WINDOW:].copy()
    current_price = baseline

    forecasted_prices = []
    forecasted_std = []

    # Ước tính std từ validation
    val_preds = model.predict(X_val)
    val_errors = np.abs(val_preds - y_val)
    error_std = float(np.std(val_errors)) if len(val_errors) > 0 else 0.02

    for step in range(periods):
        x_input = current_features.flatten().reshape(1, -1)
        pred_return = float(model.predict(x_input)[0])

        # Clamp dự đoán trong khoảng hợp lý (tránh outlier)
        pred_return = max(-0.07, min(0.07, pred_return))
        current_price = current_price * (1 + pred_return)
        forecasted_prices.append(current_price)

        # Uncertainty tăng dần theo số phiên xa (sử dụng error_std như vậy)
        step_std = error_std * (1 + step * 0.15) * baseline
        forecasted_std.append(step_std)

        # Update window (thay thế hàng cũ nhất bằng features ước tính)
        new_row = current_features[-1].copy()
        new_row[0] = pred_return  # close_norm
        new_row[7] = pred_return * 5  # momentum_5 (ước tính)
        current_features = np.vstack([current_features[1:], new_row])

    return forecasted_prices, forecasted_std


def _walk_forward_mape(df_hist, model_prophet):
    """
    Walk-forward validation: tính MAPE thực sự trên 20% dữ liệu cuối.
    Không dùng in-sample để tránh số liệu ảo lạc quan.
    """
    import numpy as np

    n = len(df_hist)
    test_size = max(10, int(n * 0.2))
    train_df = df_hist.iloc[:-test_size]
    test_df = df_hist.iloc[-test_size:]

    if len(train_df) < 30:
        return None

    try:
        from prophet import Prophet
        m = Prophet(
            daily_seasonality=False,
            weekly_seasonality=True,
            yearly_seasonality=True,
            changepoint_prior_scale=0.1,
            seasonality_prior_scale=5.0,
            interval_width=0.80
        )
        m.fit(train_df[["ds", "y"]])
        future = m.make_future_dataframe(periods=test_size, freq="B")
        forecast = m.predict(future)
        preds = forecast.tail(test_size)["yhat"].values
        actuals = test_df["y"].values
        mape = float(np.mean(np.abs((actuals - preds) / np.where(actuals == 0, 1, actuals))) * 100)
        return round(100 - mape, 1)
    except Exception as e:
        logger.warning(f"[WalkForward] Lỗi: {e}")
        return None


def predict_price_prophet(ohlcv: list, periods: int = 10, sentiment_score: float = None) -> dict:
    """
    Ensemble Model: Prophet (55%) + XGBoost (45%) dự đoán giá N phiên tới.
    - Prophet: bắt xu hướng, mùa vụ + technical regressors
    - XGBoost: bắt pattern kỹ thuật ngắn hạn
    - Walk-forward MAPE: độ chính xác thực sự (không in-sample)

    ohlcv: list of dict với keys: date, close, high, low, volume
    sentiment_score: điểm tâm lý tin tức -100 đến +100
    """
    if not ohlcv or len(ohlcv) < 60:
        return {
            "success": False,
            "error": "Cần ít nhất 60 phiên dữ liệu lịch sử để chạy Ensemble Model.",
            "forecast": [],
        }

    try:
        import pandas as pd
        import numpy as np
        from prophet import Prophet

        # ── Chuẩn bị DataFrame ────────────────────────────────────────────
        df = pd.DataFrame(ohlcv)
        df["ds"] = pd.to_datetime(df["date"].astype(str).str[:10])
        df["y"] = pd.to_numeric(df["close"], errors="coerce")
        df["close"] = df["y"]

        # Bổ sung OHLCV nếu có
        for col in ["high", "low", "volume"]:
            if col in df.columns:
                df[col] = pd.to_numeric(df[col], errors="coerce")
            else:
                df[col] = df["close"]

        df = df.dropna(subset=["ds", "y"]).sort_values("ds").reset_index(drop=True)

        if len(df) < 60:
            return {"success": False, "error": "Không đủ dữ liệu sau khi lọc.", "forecast": []}

        last_price = float(df["y"].iloc[-1])
        last_date = df["ds"].iloc[-1]

        # ── Tính features kỹ thuật ────────────────────────────────────────
        df = _compute_features(df)
        df = df.fillna(method="bfill").fillna(0)

        # ── MODEL 1: PROPHET với technical regressors ─────────────────────
        prophet_df = df[["ds", "y"]].copy()

        # Chuẩn hóa regressors để Prophet ổn định hơn
        for feat in ["rsi", "macd_hist", "bb_position", "volume_ratio"]:
            if feat in df.columns:
                col_std = df[feat].std()
                col_mean = df[feat].mean()
                if col_std > 0:
                    prophet_df[feat] = ((df[feat] - col_mean) / col_std).clip(-3, 3).values
                else:
                    prophet_df[feat] = 0.0

        model_prophet = Prophet(
            daily_seasonality=False,
            weekly_seasonality=True,
            yearly_seasonality=len(df) >= 250,
            changepoint_prior_scale=0.08,
            seasonality_prior_scale=8.0,
            interval_width=0.80,
        )
        for feat in ["rsi", "macd_hist", "bb_position", "volume_ratio"]:
            if feat in prophet_df.columns:
                model_prophet.add_regressor(feat, standardize=False)

        model_prophet.fit(prophet_df)

        # Tạo khung ngày tương lai
        future = model_prophet.make_future_dataframe(periods=periods + 15, freq="B")
        future = future[future["ds"] > last_date].head(periods)

        # Điền giá trị regressor cho tương lai (dùng giá trị trung bình cửa sổ cuối)
        LOOK_BACK = 10
        for feat in ["rsi", "macd_hist", "bb_position", "volume_ratio"]:
            if feat in prophet_df.columns:
                recent_mean = prophet_df[feat].iloc[-LOOK_BACK:].mean()
                future[feat] = recent_mean

        if future.empty:
            return {"success": False, "error": "Không tạo được khung ngày tương lai.", "forecast": []}

        prophet_forecast = model_prophet.predict(future)

        # ── MODEL 2: XGBOOST ──────────────────────────────────────────────
        xgb_prices, xgb_stds = _train_xgboost(df.copy(), periods)
        xgb_available = xgb_prices is not None and len(xgb_prices) == periods

        # ── ENSEMBLE: Kết hợp 2 mô hình ──────────────────────────────────
        W_PROPHET = 0.55
        W_XGB = 0.45

        # Điều chỉnh sentiment drift (sâu hơn: dùng log-scale)
        drift_pct = 0.0
        if sentiment_score is not None:
            raw_drift = float(sentiment_score) / 100.0
            # Giới hạn tối đa ±3.5% drift tổng cộng cho N phiên
            drift_pct = raw_drift * 0.035

        result_rows = []
        for i, (_, prow) in enumerate(prophet_forecast.iterrows()):
            p_pred = float(prow["yhat"])
            p_lower = float(prow["yhat_lower"])
            p_upper = float(prow["yhat_upper"])

            if xgb_available:
                x_pred = xgb_prices[i]
                x_std = xgb_stds[i]
                # Ensemble weighted average
                ensemble_pred = W_PROPHET * p_pred + W_XGB * x_pred
                # CI: Prophet CI + XGBoost uncertainty
                ensemble_lower = W_PROPHET * p_lower + W_XGB * (x_pred - 1.28 * x_std)
                ensemble_upper = W_PROPHET * p_upper + W_XGB * (x_pred + 1.28 * x_std)
                model_used = "Ensemble (Prophet 55% + XGBoost 45%)"
            else:
                ensemble_pred = p_pred
                ensemble_lower = p_lower
                ensemble_upper = p_upper
                model_used = "Prophet (XGBoost không khả dụng)"

            # Áp dụng sentiment drift (tăng dần theo thời gian)
            step_ratio = (i + 1) / periods
            adjustment = last_price * (drift_pct * step_ratio)

            predicted = round(ensemble_pred + adjustment)
            lower = round(ensemble_lower + adjustment)
            upper = round(ensemble_upper + adjustment)
            change_pct = round((predicted - last_price) / last_price * 100, 2)

            result_rows.append({
                "date": prow["ds"].strftime("%Y-%m-%d"),
                "predicted": predicted,
                "lower": lower,
                "upper": upper,
                "change_pct_from_now": change_pct,
            })

        # ── Walk-forward Validation (Độ chính xác THỰC SỰ) ───────────────
        accuracy_pct = _walk_forward_mape(prophet_df, model_prophet)

        # ── Xu hướng tổng hợp ─────────────────────────────────────────────
        if result_rows:
            final_pct = result_rows[-1]["change_pct_from_now"]
            mid_pct = result_rows[len(result_rows) // 2]["change_pct_from_now"]
            # Dùng cả điểm giữa và cuối để xác định xu hướng rõ hơn
            avg_trend = (final_pct + mid_pct) / 2
            if avg_trend > 1.5:
                trend_label = "TĂNG"
                trend_color = "#4ade80"
            elif avg_trend < -1.5:
                trend_label = "GIẢM"
                trend_color = "#f87171"
            else:
                trend_label = "ĐI NGANG"
                trend_color = "#f59e0b"
        else:
            trend_label = "KHÔNG XÁC ĐỊNH"
            trend_color = "#64748b"
            final_pct = 0

        return {
            "success": True,
            "forecast": result_rows,
            "model": model_used,
            "periods": periods,
            "last_price": last_price,
            "last_date": last_date.strftime("%Y-%m-%d"),
            "trend_label": trend_label,
            "trend_color": trend_color,
            "change_pct_10_sessions": round(final_pct, 2),
            "accuracy_pct": accuracy_pct,
            "note": "Dự báo AI tham khảo · Ensemble Model (Prophet + XGBoost). Không phải khuyến nghị đầu tư.",
        }

    except ImportError as e:
        logger.error(f"[Ensemble] Thiếu thư viện: {e}")
        return {
            "success": False,
            "error": f"Thiếu thư viện: {e}. Chạy: pip install prophet xgboost",
            "forecast": [],
        }
    except Exception as e:
        logger.error(f"[Ensemble] Lỗi dự đoán: {e}")
        return {
            "success": False,
            "error": f"Lỗi mô hình: {str(e)}",
            "forecast": [],
        }
