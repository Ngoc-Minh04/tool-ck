"""
Auto Scanner Service - Quét & xếp hạng 60 mã VN100 theo sức mạnh kỹ thuật.
Thiết kế tiết kiệm request: chỉ 1 batch request/lần quét, cache 5 phút.
"""

import time
import json
import os
import tempfile
from loguru import logger
from datetime import date, timedelta

# ===== DANH SÁCH 60 MÃ VN100 PHỔ BIẾN NHẤT =====
VN100_TICKERS = [
    # Ngân hàng (14 mã)
    "VCB", "BID", "CTG", "TCB", "MBB", "ACB", "VPB", "HDB", "STB", "SHB", "TPB", "MSB", "OCB", "LPB",
    # Bất động sản (10 mã)
    "VIC", "VHM", "NVL", "KDH", "DXG", "PDR", "VRE", "DIG", "NLG", "CEO",
    # Thép & Công nghiệp (6 mã)
    "HPG", "HSG", "NKG", "TLH", "SMC", "POM",
    # Công nghệ (4 mã)
    "FPT", "CMG", "VGI", "ELC",
    # Năng lượng & Dầu khí (5 mã)
    "GAS", "PLX", "PVD", "PVS", "BSR",
    # Bán lẻ & Tiêu dùng (5 mã)
    "MWG", "VNM", "SAB", "MSN", "PNJ",
    # Chứng khoán (6 mã)
    "SSI", "VCI", "HCM", "VIX", "MBS", "CTS",
    # Vận tải & Logistics (5 mã)
    "GMD", "HAH", "VTP", "DVP", "TMS",
    # Dược phẩm & Y tế (3 mã)
    "DHG", "IMP", "DMC",
    # Xây dựng & Vật liệu (2 mã)
    "VCS", "CTD",
]

# ===== CACHE NỘI BỘ =====
_scan_cache = {
    "results": None,
    "timestamp": 0,
    "TTL": 300,  # 5 phút
}

_ohlcv_cache = {}  # ticker -> list[dict]
_ohlcv_loaded_date = None

OHLCV_CACHE_FILE = os.path.join(tempfile.gettempdir(), "scanner_ohlcv_cache.json")

def _write_ohlcv_cache(data, loaded_date: str):
    try:
        payload = {
            "loaded_date": loaded_date,
            "ohlcv": data
        }
        with open(OHLCV_CACHE_FILE, "w", encoding="utf-8") as f:
            json.dump(payload, f, ensure_ascii=False, indent=2)
    except Exception as e:
        logger.error(f"[Scanner] Write OHLCV cache error: {e}")

def _read_ohlcv_cache():
    if not os.path.exists(OHLCV_CACHE_FILE):
        return None, {}
    try:
        with open(OHLCV_CACHE_FILE, "r", encoding="utf-8") as f:
            payload = json.load(f)
            loaded_date_str = payload.get("loaded_date")
            loaded_date = date.fromisoformat(loaded_date_str) if loaded_date_str else None
            return loaded_date, payload.get("ohlcv", {})
    except Exception as e:
        logger.error(f"[Scanner] Read OHLCV cache error: {e}")
        return None, {}


# ===== HELPERS =====

def _is_cache_valid():
    return (
        _scan_cache["results"] is not None
        and (time.time() - _scan_cache["timestamp"]) < _scan_cache["TTL"]
    )


def _load_ohlcv_batch():
    """Tải lịch sử giá OHLCV cho toàn bộ 60 mã - chỉ 1 lần mỗi ngày."""
    global _ohlcv_cache, _ohlcv_loaded_date

    today = date.today()

    # 1. Thử đọc cache từ đĩa trước nếu chưa có trong RAM
    if not _ohlcv_cache:
        disk_date, disk_cache = _read_ohlcv_cache()
        if disk_cache:
            _ohlcv_cache = disk_cache
            _ohlcv_loaded_date = disk_date
            logger.info(f"[Scanner] Đã tải thành công {len(_ohlcv_cache)} mã từ cache đĩa.")

    # 2. Nếu cache đĩa/RAM đã được tải hôm nay rồi và có đủ toàn bộ mã, không tải lại
    if _ohlcv_loaded_date == today and len(_ohlcv_cache) >= len(VN100_TICKERS):
        return

    logger.info(f"[Scanner] Đang tải OHLCV cho VN100 (Đã có sẵn {len(_ohlcv_cache)}/{len(VN100_TICKERS)})...")
    from vnstock.api.quote import Quote

    success_count = len([t for t in VN100_TICKERS if t in _ohlcv_cache])
    
    for ticker in VN100_TICKERS:
        # Nếu đã có dữ liệu của mã này hôm nay, bỏ qua không gọi API nữa để tránh rate limit
        if ticker in _ohlcv_cache and _ohlcv_loaded_date == today:
            continue

        try:
            q = Quote(symbol=ticker, source="VCI")
            end = today.strftime("%Y-%m-%d")
            start = (today - timedelta(days=120)).strftime("%Y-%m-%d")
            df = q.history(start=start, end=end, interval="1D")
            if df is not None and not df.empty:
                import pandas as pd
                records = df.to_dict("records")
                clean_records = []
                for r in records:
                    dt = str(r.get("time", r.get("date", "")))[:10]
                    
                    def safe_float(k, mult=1.0):
                        v = r.get(k)
                        if v is None or pd.isna(v):
                            return 0.0
                        return float(v) * mult
                        
                    clean_records.append({
                        "date": dt,
                        "open": safe_float("open", 1000.0),
                        "high": safe_float("high", 1000.0),
                        "low": safe_float("low", 1000.0),
                        "close": safe_float("close", 1000.0),
                        "volume": int(safe_float("volume"))
                    })
                _ohlcv_cache[ticker] = clean_records
                success_count += 1
                
                # Ghi nhận ngay vào cache đĩa sau mỗi mã tải thành công để đảm bảo khả năng resume
                _write_ohlcv_cache(_ohlcv_cache, today.isoformat())
                
        except BaseException as e:
            logger.debug(f"[Scanner] OHLCV load skip {ticker}: {e}")
            if isinstance(e, SystemExit):
                logger.warning(f"[Scanner] Tạm dừng tải lịch sử giá do chạm giới hạn Rate Limit của vnstock ở mã {ticker}.")
                break

    _ohlcv_loaded_date = today
    _write_ohlcv_cache(_ohlcv_cache, today.isoformat())
    logger.info(f"[Scanner] Trạng thái OHLCV hiện tại: {success_count}/{len(VN100_TICKERS)} mã khả dụng.")


def _score_ticker(ticker: str, live_price: float = None, live_vol: int = None) -> dict:
    """Chấm điểm kỹ thuật cho 1 mã (0-10 điểm)."""
    ohlcv = _ohlcv_cache.get(ticker, [])
    if not ohlcv or len(ohlcv) < 20:
        return None

    try:
        import pandas as pd
        try:
            import pandas_ta as ta
        except ImportError:
            import pandas_ta_classic as ta

        df = pd.DataFrame(ohlcv)
        df["close"] = pd.to_numeric(df["close"], errors="coerce")
        df["volume"] = pd.to_numeric(df["volume"], errors="coerce")
        df = df.dropna(subset=["close", "volume"])

        if len(df) < 20:
            return None

        # Cập nhật giá realtime nếu có
        if live_price and live_price > 0:
            last_close = live_price
        else:
            last_close = float(df["close"].iloc[-1])

        if live_vol and live_vol > 0:
            last_vol = live_vol
        else:
            last_vol = int(df["volume"].iloc[-1])

        # Tính các chỉ báo
        ma20 = float(ta.sma(df["close"], length=20).dropna().iloc[-1]) if len(df) >= 20 else None
        ma50 = float(ta.sma(df["close"], length=50).dropna().iloc[-1]) if len(df) >= 50 else None
        rsi_series = ta.rsi(df["close"], length=14)
        rsi = float(rsi_series.dropna().iloc[-1]) if rsi_series is not None and not rsi_series.dropna().empty else None
        
        macd_df = ta.macd(df["close"], fast=12, slow=26, signal=9) if len(df) >= 26 else None
        macd_hist = None
        if macd_df is not None and "MACDh_12_26_9" in macd_df.columns:
            macd_hist_s = macd_df["MACDh_12_26_9"].dropna()
            if not macd_hist_s.empty:
                macd_hist = float(macd_hist_s.iloc[-1])

        vol_avg20 = float(df["volume"].rolling(20).mean().dropna().iloc[-1]) if len(df) >= 20 else None
        prev_close = float(df["close"].iloc[-2]) if len(df) >= 2 else last_close

        # ===== CHẤM ĐIỂM =====
        score = 0
        reasons = []

        # 1. Xu hướng (2 điểm): Giá > MA20 > MA50 = uptrend
        if ma20 and ma50:
            if last_close > ma20 > ma50:
                score += 2
                reasons.append("Uptrend (Giá > MA20 > MA50)")
            elif last_close < ma20 < ma50:
                reasons.append("Downtrend (Giá < MA20 < MA50)")
            else:
                score += 1
                reasons.append("Đi ngang")
        elif ma20:
            if last_close > ma20:
                score += 1
                reasons.append("Giá > MA20")

        # 2. RSI (2 điểm): RSI vùng 45-65 là tốt nhất
        if rsi is not None:
            if 45 <= rsi <= 65:
                score += 2
                reasons.append(f"RSI tốt ({rsi:.1f})")
            elif 35 <= rsi < 45 or 65 < rsi <= 75:
                score += 1
                reasons.append(f"RSI trung tính ({rsi:.1f})")
            elif rsi < 30:
                reasons.append(f"RSI quá bán ({rsi:.1f})")
            else:
                reasons.append(f"RSI quá mua ({rsi:.1f})")

        # 3. MACD (2 điểm): MACD histogram > 0 = tăng momentum
        if macd_hist is not None:
            if macd_hist > 0:
                score += 2
                reasons.append(f"MACD tích cực (+{macd_hist:.2f})")
            else:
                reasons.append(f"MACD tiêu cực ({macd_hist:.2f})")

        # 4. Volume (2 điểm): Volume hôm nay > Volume TB 20 phiên
        if vol_avg20 and vol_avg20 > 0:
            vol_ratio = last_vol / vol_avg20
            if vol_ratio >= 1.2:
                score += 2
                reasons.append(f"Volume bùng nổ ({vol_ratio:.1f}x TB)")
            elif vol_ratio >= 0.8:
                score += 1
                reasons.append(f"Volume bình thường ({vol_ratio:.1f}x TB)")
            else:
                reasons.append(f"Volume yếu ({vol_ratio:.1f}x TB)")

        # 5. Momentum (2 điểm): Giá hôm nay > hôm qua
        if prev_close > 0:
            change_pct = (last_close - prev_close) / prev_close * 100
            if change_pct > 0.5:
                score += 2
                reasons.append(f"Momentum tăng (+{change_pct:.2f}%)")
            elif change_pct >= 0:
                score += 1
                reasons.append(f"Momentum nhẹ (+{change_pct:.2f}%)")
            else:
                reasons.append(f"Momentum giảm ({change_pct:.2f}%)")
        else:
            change_pct = 0

        # Xác định hạng mức
        if score >= 7:
            strength = "STRONG"
            strength_label = "Mạnh"
        elif score >= 4:
            strength = "NEUTRAL"
            strength_label = "Trung tính"
        else:
            strength = "WEAK"
            strength_label = "Yếu"

        return {
            "ticker": ticker,
            "score": score,
            "max_score": 10,
            "strength": strength,
            "strength_label": strength_label,
            "price": round(last_close),
            "change_pct": round(change_pct, 2),
            "rsi": round(rsi, 1) if rsi else None,
            "macd_hist": round(macd_hist, 2) if macd_hist else None,
            "ma20": round(ma20) if ma20 else None,
            "ma50": round(ma50) if ma50 else None,
            "vol_ratio": round(last_vol / vol_avg20, 2) if vol_avg20 else None,
            "reasons": reasons,
        }

    except Exception as e:
        logger.debug(f"[Scanner] Score error {ticker}: {e}")
        return None


def scan_all_stocks(force_refresh: bool = False) -> dict:
    """
    Quét toàn bộ 60 mã và trả về kết quả xếp hạng.
    Chỉ tốn 1 request batch lên sàn mỗi 5 phút.
    """
    global _scan_cache

    if not force_refresh and _is_cache_valid():
        logger.debug("[Scanner] Trả về kết quả từ cache.")
        return _scan_cache["results"]

    logger.info("[Scanner] Bắt đầu quét 60 mã VN100...")
    start_time = time.time()

    # Bước 1: Đảm bảo OHLCV đã được tải (chỉ tải 1 lần/ngày)
    _load_ohlcv_batch()

    # Bước 2: Lấy giá realtime của toàn bộ 60 mã (1 request batch duy nhất)
    live_prices = {}
    try:
        from vnstock.api.trading import Trading
        import pandas as pd
        t = Trading(symbol=VN100_TICKERS[0], source="VCI", show_log=False)
        df_board = t.price_board(symbols_list=VN100_TICKERS)
        if df_board is not None and not df_board.empty:
            for _, row in df_board.iterrows():
                ticker = row.get(("listing", "symbol"))
                if not ticker or pd.isna(ticker):
                    continue
                ticker = str(ticker).upper()
                
                def safe(v, default=0.0):
                    if v is None or pd.isna(v): return default
                    return float(v)
                
                price = safe(row.get(("match", "match_price")))
                vol = int(safe(row.get(("match", "accumulated_volume")), 0))
                
                if price < 1000:
                    price *= 1000
                    
                live_prices[ticker] = {"price": price, "volume": vol}
        logger.info(f"[Scanner] Đã lấy giá realtime: {len(live_prices)}/{len(VN100_TICKERS)} mã.")
    except BaseException as e:
        logger.warning(f"[Scanner] Không lấy được giá realtime: {e}")

    # Bước 3: Chấm điểm từng mã
    results = []
    for ticker in VN100_TICKERS:
        live = live_prices.get(ticker, {})
        scored = _score_ticker(
            ticker,
            live_price=live.get("price"),
            live_vol=live.get("volume"),
        )
        if scored:
            results.append(scored)

    # Bước 4: Sắp xếp theo điểm giảm dần
    results.sort(key=lambda x: (-x["score"], -x.get("change_pct", 0)))

    elapsed = time.time() - start_time
    logger.info(f"[Scanner] Quét xong {len(results)}/{len(VN100_TICKERS)} mã trong {elapsed:.1f}s.")

    summary = {
        "scanned_at": time.strftime("%Y-%m-%dT%H:%M:%S"),
        "total_scanned": len(results),
        "strong_count": sum(1 for r in results if r["strength"] == "STRONG"),
        "neutral_count": sum(1 for r in results if r["strength"] == "NEUTRAL"),
        "weak_count": sum(1 for r in results if r["strength"] == "WEAK"),
        "top_strong": [r for r in results if r["strength"] == "STRONG"][:10],
        "top_weak": list(reversed([r for r in results if r["strength"] == "WEAK"]))[:10],
        "all_results": results,
        "elapsed_seconds": round(elapsed, 1),
        "request_cost": 1,  # Chỉ tốn đúng 1 batch request
    }

    _scan_cache["results"] = summary
    _scan_cache["timestamp"] = time.time()

    return summary


def preload_ohlcv():
    """Gọi lúc khởi động server để tải trước OHLCV - không block main thread."""
    import threading
    def _load():
        try:
            _load_ohlcv_batch()
        except Exception as e:
            logger.warning(f"[Scanner] Preload OHLCV failed: {e}")
    t = threading.Thread(target=_load, daemon=True)
    t.start()
    logger.info("[Scanner] Đã kích hoạt preload OHLCV nền.")


def get_signal_candidates(scan_results: dict = None) -> dict:
    """
    Lọc ra danh sách tín hiệu BUY (>=7/10) và SELL (<=3/10) từ kết quả quét.
    Nếu không truyền scan_results, tự động gọi scan_all_stocks().
    """
    if scan_results is None:
        scan_results = scan_all_stocks()

    if not scan_results or "all_results" not in scan_results:
        return {"buy_signals": [], "sell_signals": [], "scanned_at": None}

    all_results = scan_results.get("all_results", [])

    buy_signals = [r for r in all_results if r.get("score", 0) >= 7]
    sell_signals = [r for r in all_results if r.get("score", 0) <= 3]

    # Sắp xếp: BUY theo điểm cao nhất trước, SELL theo điểm thấp nhất trước
    buy_signals.sort(key=lambda x: -x.get("score", 0))
    sell_signals.sort(key=lambda x: x.get("score", 0))

    return {
        "buy_signals": buy_signals,
        "sell_signals": sell_signals,
        "total_buy": len(buy_signals),
        "total_sell": len(sell_signals),
        "scanned_at": scan_results.get("scanned_at"),
        "total_scanned": scan_results.get("total_scanned", 0),
    }

