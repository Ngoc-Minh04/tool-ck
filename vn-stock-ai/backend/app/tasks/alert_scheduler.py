from apscheduler.schedulers.asyncio import AsyncIOScheduler
from loguru import logger
import json
from pathlib import Path

scheduler = AsyncIOScheduler()

from datetime import datetime

async def check_alerts():
    from app.services.database import get_all_alerts, update_alert, create_alert_log
    try:
        alerts = get_all_alerts()
    except Exception as e:
        logger.error(f"Error loading alerts from database: {e}")
        return

    now = datetime.now()

    for alert in alerts:
        # 1. Reset daily alert if it's a new day
        if alert.get("mode") == "daily" and alert.get("triggered") and alert.get("last_triggered_at"):
            try:
                lt_dt = datetime.fromisoformat(alert["last_triggered_at"])
                if now.date() > lt_dt.date():
                    alert["triggered"] = False
                    update_alert(alert["id"], {"triggered": False})
            except Exception as e:
                logger.error(f"Error resetting daily alert: {e}")

        # 2. Check triggered status and cooldown
        if alert.get("triggered"):
            if alert.get("mode") == "continuous":
                if alert.get("last_triggered_at"):
                    try:
                        lt_dt = datetime.fromisoformat(alert["last_triggered_at"])
                        cooldown_mins = int(alert.get("cooldown", 15))
                        if (now - lt_dt).total_seconds() < cooldown_mins * 60:
                            continue
                    except Exception as e:
                        logger.error(f"Error checking continuous cooldown: {e}")
                        continue
            else:
                continue

        try:
            from app.services.vnstock_service import get_ohlcv
            from app.services.telegram_service import send_alert

            period = "3mo"
            condition = alert["condition"]
            if "ma200" in condition:
                period = "1y"

            ohlcv = get_ohlcv(alert["ticker"], period)
            if not ohlcv or len(ohlcv) < 2:
                continue

            current = ohlcv[-1]["close"]
            prev_close = ohlcv[-2]["close"]
            change_pct = ((current - prev_close) / prev_close) * 100 if prev_close else 0.0

            target = alert.get("price", 0.0)
            hit = False
            trigger_reason = ""

            # Check based on condition
            if condition == "above":
                hit = current >= target
                trigger_reason = f"Đã vượt trên {target:,.0f} VND"
            elif condition == "below":
                hit = current <= target
                trigger_reason = f"Đã xuống dưới {target:,.0f} VND"
            elif condition == "volume_above":
                current_vol = ohlcv[-1].get("volume", 0)
                hit = current_vol >= target
                trigger_reason = f"Khối lượng giao dịch vượt trên {target:,.0f} CP (Đạt: {current_vol:,.0f} CP)"
            elif condition == "pct_change_above":
                hit = change_pct >= target
                trigger_reason = f"Tăng trong phiên đạt +{change_pct:.2f}% (Ngưỡng: +{target}%)"
            elif condition == "pct_change_below":
                hit = change_pct <= -target
                trigger_reason = f"Giảm trong phiên đạt {change_pct:.2f}% (Ngưỡng: -{target}%)"
            elif condition == "pct_change_abs":
                hit = abs(change_pct) >= target
                trigger_reason = f"Biến động trong phiên đạt {change_pct:.2f}% (Ngưỡng: +/-{target}%)"
            elif condition.startswith("rsi_") or condition.startswith("price_") or condition.startswith("macd_"):
                # Compute indicators
                from app.services.indicator_service import compute_indicators
                indicators = compute_indicators(ohlcv)

                if condition == "rsi_above":
                    rsi_val = indicators.get("rsi")
                    if rsi_val is not None:
                        hit = rsi_val >= target
                        trigger_reason = f"RSI đạt {rsi_val:.1f} (Ngưỡng: >{target})"
                elif condition == "rsi_below":
                    rsi_val = indicators.get("rsi")
                    if rsi_val is not None:
                        hit = rsi_val <= target
                        trigger_reason = f"RSI đạt {rsi_val:.1f} (Ngưỡng: <{target})"
                elif condition == "price_above_ma20":
                    ma20_val = indicators.get("ma20")
                    if ma20_val is not None:
                        hit = current >= ma20_val
                        trigger_reason = f"Giá ({current:,.0f}) cắt lên trên MA20 ({ma20_val:,.0f})"
                elif condition == "price_below_ma20":
                    ma20_val = indicators.get("ma20")
                    if ma20_val is not None:
                        hit = current <= ma20_val
                        trigger_reason = f"Giá ({current:,.0f}) cắt xuống dưới MA20 ({ma20_val:,.0f})"
                elif condition == "price_above_ma50":
                    ma50_val = indicators.get("ma50")
                    if ma50_val is not None:
                        hit = current >= ma50_val
                        trigger_reason = f"Giá ({current:,.0f}) cắt lên trên MA50 ({ma50_val:,.0f})"
                elif condition == "price_below_ma50":
                    ma50_val = indicators.get("ma50")
                    if ma50_val is not None:
                        hit = current <= ma50_val
                        trigger_reason = f"Giá ({current:,.0f}) cắt xuống dưới MA50 ({ma50_val:,.0f})"
                elif condition == "price_above_ma200":
                    ma200_val = indicators.get("ma200")
                    if ma200_val is not None:
                        hit = current >= ma200_val
                        trigger_reason = f"Giá ({current:,.0f}) cắt lên trên MA200 ({ma200_val:,.0f})"
                elif condition == "price_below_ma200":
                    ma200_val = indicators.get("ma200")
                    if ma200_val is not None:
                        hit = current <= ma200_val
                        trigger_reason = f"Giá ({current:,.0f}) cắt xuống dưới MA200 ({ma200_val:,.0f})"
                elif condition == "macd_cross_up":
                    macd_hist = indicators.get("macd_hist")
                    if macd_hist is not None:
                        hit = macd_hist >= 0
                        trigger_reason = f"MACD nằm trên đường Tín hiệu (Histogram: {macd_hist:.4f})"
                elif condition == "macd_cross_down":
                    macd_hist = indicators.get("macd_hist")
                    if macd_hist is not None:
                        hit = macd_hist <= 0
                        trigger_reason = f"MACD nằm dưới đường Tín hiệu (Histogram: {macd_hist:.4f})"

            if hit:
                import html
                safe_ticker = html.escape(str(alert['ticker']))
                safe_reason = html.escape(str(trigger_reason))
                safe_mode = html.escape(str(alert.get('mode', 'once')))
                safe_note = html.escape(str(alert.get('note', '') or '—'))

                # Format message specifically for volume if needed
                if condition == "volume_above":
                    current_vol = ohlcv[-1].get("volume", 0)
                    msg = (
                        f"<b>ALERT (Khối lượng)</b>: {safe_ticker}\n"
                        f"Khối lượng hiện tại: <b>{current_vol:,.0f}</b> CP\n"
                        f"Điều kiện: <b>{safe_reason}</b>\n"
                        f"Giá hiện tại: <b>{current:,.0f}</b> VND\n"
                        f"Chế độ: {safe_mode}\n"
                        f"Ghi chú: {safe_note}"
                    )
                else:
                    msg = (
                        f"<b>ALERT</b>: {safe_ticker}\n"
                        f"Gia hien tai: <b>{current:,.0f}</b> VND\n"
                        f"Dieu kien: <b>{safe_reason}</b>\n"
                        f"Che do: {safe_mode}\n"
                        f"Ghi chu: {safe_note}"
                    )
                await send_alert(alert.get("telegram_chat_id", ""), msg)
                alert["triggered"] = True
                alert["last_triggered_at"] = now.isoformat()
                update_alert(alert["id"], {
                    "triggered": True,
                    "last_triggered_at": now.isoformat()
                })
                
                # Write alert log
                import uuid
                log_id = str(uuid.uuid4())
                log_data = {
                    "id": log_id,
                    "alert_id": alert["id"],
                    "ticker": alert["ticker"],
                    "condition": alert["condition"],
                    "price": alert.get("price"),
                    "trigger_price": current,
                    "triggered_at": now.isoformat(),
                    "note": alert.get("note")
                }
                try:
                    create_alert_log(log_data)
                except Exception as ex:
                    logger.error(f"Error creating alert log: {ex}")

                logger.info(f"Alert triggered: {alert['ticker']} {condition} {target} (Mode: {alert.get('mode')})")
        except Exception as e:
            logger.error(f"Alert check error for {alert.get('ticker')}: {e}")


# ===== SIGNAL SCANNER JOBS =====

# Cache RAM anti-spam: lưu {ticker: {"buy": timestamp, "sell": timestamp}}
_signal_sent_cache: dict = {}
# Lưu tập hợp tín hiệu lần quét trước (để so sánh phát hiện tín hiệu mới)
_last_signal_set: dict = {"buy": set(), "sell": set()}
# Lưu kết quả tín hiệu mới nhất để API frontend lấy
_latest_signals: dict = {"buy_signals": [], "sell_signals": [], "scanned_at": None, "total_scanned": 0}


def _get_default_chat_id() -> str:
    """Lấy telegram_chat_id đầu tiên có trong database hoặc từ config settings."""
    try:
        from app.services.database import get_all_alerts
        alerts = get_all_alerts()
        for a in alerts:
            cid = a.get("telegram_chat_id", "").strip()
            if cid:
                return cid
    except Exception as e:
        logger.warning(f"[Signal] Không lấy được Chat ID từ DB: {e}")
    
    # Fallback về cấu hình mặc định trong file .env
    from app.config import settings
    if settings.TELEGRAM_CHAT_ID:
        return settings.TELEGRAM_CHAT_ID.strip()
    return ""


def _is_anti_spam(ticker: str, signal_type: str) -> bool:
    """Kiểm tra xem tín hiệu này đã gửi trong vòng 24 giờ chưa."""
    import time
    entry = _signal_sent_cache.get(ticker, {})
    last_ts = entry.get(signal_type, 0)
    return (time.time() - last_ts) < 86400  # 24 giờ


def _mark_sent(ticker: str, signal_type: str):
    import time
    if ticker not in _signal_sent_cache:
        _signal_sent_cache[ticker] = {}
    _signal_sent_cache[ticker][signal_type] = time.time()


async def _run_signal_scan_and_notify(trigger: str = "schedule"):
    """
    Lõi chính: Quét tín hiệu, lọc anti-spam, cập nhật _latest_signals, gửi Telegram.
    trigger: 'schedule' | 'intraday' | 'manual'
    """
    global _latest_signals, _last_signal_set

    try:
        from fastapi.concurrency import run_in_threadpool
        from app.services.scanner_service import scan_all_stocks, get_signal_candidates
        from app.services.telegram_service import send_signal_digest

        logger.info(f"[Signal] Bắt đầu quét tín hiệu (trigger={trigger})...")
        scan_results = await run_in_threadpool(scan_all_stocks, trigger == "schedule")
        candidates = get_signal_candidates(scan_results)

        buy_list = candidates.get("buy_signals", [])
        sell_list = candidates.get("sell_signals", [])
        scanned_at = candidates.get("scanned_at")
        total_scanned = candidates.get("total_scanned", 0)

        # Cập nhật latest_signals cho API frontend
        _latest_signals = {
            "buy_signals": buy_list,
            "sell_signals": sell_list,
            "scanned_at": scanned_at,
            "total_buy": len(buy_list),
            "total_sell": len(sell_list),
            "total_scanned": total_scanned,
        }

        # Với intraday: chỉ gửi Telegram nếu có mã MỚI chưa thấy lần trước
        if trigger == "intraday":
            current_buy_set = {r["ticker"] for r in buy_list}
            current_sell_set = {r["ticker"] for r in sell_list}
            new_buys = current_buy_set - _last_signal_set["buy"]
            new_sells = current_sell_set - _last_signal_set["sell"]
            _last_signal_set = {"buy": current_buy_set, "sell": current_sell_set}

            if not new_buys and not new_sells:
                logger.debug("[Signal] Intraday: Không có tín hiệu mới, bỏ qua gửi Telegram.")
                return

            # Chỉ gửi các mã mới
            buy_to_send = [r for r in buy_list if r["ticker"] in new_buys and not _is_anti_spam(r["ticker"], "buy")]
            sell_to_send = [r for r in sell_list if r["ticker"] in new_sells and not _is_anti_spam(r["ticker"], "sell")]
        elif trigger == "manual":
            # Với manual (gửi thủ công): gửi toàn bộ danh sách hiện tại, không lọc anti-spam để người dùng thấy kết quả ngay
            buy_to_send = list(buy_list)
            sell_to_send = list(sell_list)
        else:
            # Với schedule: lọc anti-spam và gửi tất cả
            buy_to_send = [r for r in buy_list if not _is_anti_spam(r["ticker"], "buy")]
            sell_to_send = [r for r in sell_list if not _is_anti_spam(r["ticker"], "sell")]

        if not buy_to_send and not sell_to_send and trigger == "intraday":
            logger.debug("[Signal] Tất cả tín hiệu mới đều đã gửi trong 24h, bỏ qua.")
            return

        chat_id = _get_default_chat_id()
        if not chat_id:
            logger.warning("[Signal] Không có Chat ID Telegram, bỏ qua gửi.")
            return

        success = await send_signal_digest(
            chat_id=chat_id,
            buy_list=buy_to_send,
            sell_list=sell_to_send,
            scanned_at=scanned_at,
            total_scanned=total_scanned,
            trigger=trigger,
        )

        if success:
            for r in buy_to_send:
                _mark_sent(r["ticker"], "buy")
            for r in sell_to_send:
                _mark_sent(r["ticker"], "sell")
            logger.info(f"[Signal] Đã gửi Telegram: {len(buy_to_send)} BUY, {len(sell_to_send)} SELL.")

    except Exception as e:
        logger.error(f"[Signal] Lỗi quét/gửi tín hiệu: {e}")


async def send_daily_signal_digest():
    """Job theo lịch cố định (09:30 và 14:30) — luôn gửi báo cáo tổng hợp."""
    await _run_signal_scan_and_notify(trigger="schedule")


async def send_intraday_signal_alert():
    """Job quét liên tục mỗi 15 phút — chỉ gửi khi có tín hiệu MỚI."""
    from app.services.vnstock_service import is_market_active
    if not is_market_active():
        logger.debug("[Signal] Ngoài giờ giao dịch, bỏ qua intraday scan.")
        return
    await _run_signal_scan_and_notify(trigger="intraday")


def get_latest_signals() -> dict:
    """Trả về kết quả tín hiệu mới nhất (cho API endpoint)."""
    return _latest_signals


def start_scheduler():
    scheduler.add_job(check_alerts, "interval", seconds=15, id="alert_checker",
                      replace_existing=True)

    # Job báo cáo tổng hợp lúc 09:30 và 14:30 các ngày giao dịch (T2-T6)
    scheduler.add_job(send_daily_signal_digest, "cron",
                      hour=9, minute=30, day_of_week="mon-fri",
                      id="signal_digest_morning", replace_existing=True)
    scheduler.add_job(send_daily_signal_digest, "cron",
                      hour=14, minute=30, day_of_week="mon-fri",
                      id="signal_digest_afternoon", replace_existing=True)

    # Job quét liên tục mỗi 15 phút
    scheduler.add_job(send_intraday_signal_alert, "interval", minutes=15,
                      id="signal_intraday", replace_existing=True)

    scheduler.start()
    logger.info("Alert scheduler started (alerts: 15s, signal digest: 09:30+14:30, intraday: 15min)")

