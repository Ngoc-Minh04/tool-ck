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
                # Format message specifically for volume if needed
                if condition == "volume_above":
                    msg = (
                        f"<b>ALERT (Khối lượng)</b>: {alert['ticker']}\n"
                        f"Khối lượng hiện tại: <b>{ohlcv[-1].get('volume', 0):,.0f}</b> CP\n"
                        f"Điều kiện: <b>{trigger_reason}</b>\n"
                        f"Giá hiện tại: <b>{current:,.0f}</b> VND\n"
                        f"Chế độ: {alert.get('mode', 'once')}\n"
                        f"Ghi chú: {alert.get('note', '') or '—'}"
                    )
                else:
                    msg = (
                        f"<b>ALERT</b>: {alert['ticker']}\n"
                        f"Gia hien tai: <b>{current:,.0f}</b> VND\n"
                        f"Dieu kien: <b>{trigger_reason}</b>\n"
                        f"Che do: {alert.get('mode', 'once')}\n"
                        f"Ghi chu: {alert.get('note', '') or '—'}"
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

def start_scheduler():
    scheduler.add_job(check_alerts, "interval", seconds=15, id="alert_checker",
                      replace_existing=True)
    scheduler.start()
    logger.info("Alert scheduler started")
