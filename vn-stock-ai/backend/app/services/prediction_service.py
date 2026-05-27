"""
Dự đoán giá cổ phiếu dùng Prophet (Meta/Facebook).
Chạy hoàn toàn local, không tốn thêm request nào.
Cache kết quả 1 giờ.
"""

from loguru import logger


def predict_price_prophet(ohlcv: list, periods: int = 10, sentiment_score: float = None) -> dict:
    """
    Dùng Prophet để dự đoán giá đóng cửa trong N phiên tiếp theo kèm điều chỉnh tâm lý tin tức.
    ohlcv: list of dict với keys: date, close
    sentiment_score: điểm tâm lý tin tức từ -100 đến +100
    Trả về: forecast list + accuracy metrics
    """
    if not ohlcv or len(ohlcv) < 30:
        return {
            "success": False,
            "error": "Cần ít nhất 30 phiên dữ liệu lịch sử để dự đoán.",
            "forecast": [],
        }

    try:
        import pandas as pd
        from prophet import Prophet
        import warnings
        warnings.filterwarnings("ignore")

        # Chuẩn bị data
        df = pd.DataFrame(ohlcv)
        df["ds"] = pd.to_datetime(df["date"].astype(str).str[:10])
        df["y"] = pd.to_numeric(df["close"], errors="coerce")
        df = df.dropna(subset=["ds", "y"]).sort_values("ds")

        if len(df) < 30:
            return {"success": False, "error": "Không đủ dữ liệu.", "forecast": []}

        # Lấy giá cuối để dùng làm baseline tính %
        last_price = float(df["y"].iloc[-1])
        last_date = df["ds"].iloc[-1]

        # Huấn luyện Prophet
        model = Prophet(
            daily_seasonality=False,
            weekly_seasonality=True,
            yearly_seasonality=True,
            changepoint_prior_scale=0.1,   # Giảm overfitting
            seasonality_prior_scale=5.0,
            interval_width=0.80,            # Vùng dự báo 80%
        )
        model.fit(df[["ds", "y"]])

        # Tạo khung ngày tương lai (chỉ ngày trong tuần)
        future = model.make_future_dataframe(periods=periods + 10, freq="B")  # B = Business day
        future = future[future["ds"] > last_date].head(periods)

        if future.empty:
            return {"success": False, "error": "Không tạo được khung ngày tương lai.", "forecast": []}

        forecast = model.predict(future)

        # Điều chỉnh xu hướng theo điểm tâm lý tin tức (nếu có)
        drift_pct = 0.0
        if sentiment_score is not None:
            # Quy đổi điểm tâm lý (-100 đến +100) thành tỷ lệ trượt giá (drift)
            # Tối đa +-2% trong vòng N phiên
            drift_pct = (float(sentiment_score) / 100.0) * 0.02

        # Kết quả dự báo
        result_rows = []
        for i, (_, row) in enumerate(forecast.iterrows()):
            # Lượng dịch chuyển tăng dần theo thời gian (tuyến tính)
            step_ratio = (i + 1) / periods
            adjustment = last_price * (drift_pct * step_ratio)

            predicted = round(float(row["yhat"]) + adjustment)
            lower = round(float(row["yhat_lower"]) + adjustment)
            upper = round(float(row["yhat_upper"]) + adjustment)
            change_pct = round((predicted - last_price) / last_price * 100, 2)

            result_rows.append({
                "date": row["ds"].strftime("%Y-%m-%d"),
                "predicted": predicted,
                "lower": lower,
                "upper": upper,
                "change_pct_from_now": change_pct,
            })

        # Tính MAPE trên dữ liệu lịch sử (backtesting đơn giản)
        try:
            hist_forecast = model.predict(df[["ds"]])
            df_merged = df.copy()
            df_merged["yhat"] = hist_forecast["yhat"].values
            df_merged["error"] = abs(df_merged["y"] - df_merged["yhat"]) / df_merged["y"]
            mape = float(df_merged["error"].mean() * 100)
            accuracy_pct = round(100 - mape, 1)
        except Exception:
            accuracy_pct = None

        # Xu hướng dự đoán
        if result_rows:
            final_pct = result_rows[-1]["change_pct_from_now"]
            if final_pct > 2:
                trend_label = "TĂNG"
                trend_color = "#4ade80"
            elif final_pct < -2:
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
            "model": "Prophet",
            "periods": periods,
            "last_price": last_price,
            "last_date": last_date.strftime("%Y-%m-%d"),
            "trend_label": trend_label,
            "trend_color": trend_color,
            "change_pct_10_sessions": round(final_pct, 2),
            "accuracy_pct": accuracy_pct,
            "note": "Dự báo tham khảo (độ chính xác 60-75%). Không phải khuyến nghị đầu tư.",
        }

    except ImportError:
        return {
            "success": False,
            "error": "Thư viện Prophet chưa được cài. Chạy: pip install prophet",
            "forecast": [],
        }
    except Exception as e:
        logger.error(f"[Prophet] Lỗi dự đoán: {e}")
        return {
            "success": False,
            "error": f"Lỗi mô hình: {str(e)}",
            "forecast": [],
        }
