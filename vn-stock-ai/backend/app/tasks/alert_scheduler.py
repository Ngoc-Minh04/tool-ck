from apscheduler.schedulers.asyncio import AsyncIOScheduler
from loguru import logger
import json
from pathlib import Path

scheduler = AsyncIOScheduler()

async def check_alerts():
    alerts_file = Path("alerts.json")
    if not alerts_file.exists():
        return
    try:
        alerts = json.loads(alerts_file.read_text())
    except:
        return

    changed = False
    for alert in alerts:
        if alert.get("triggered"):
            continue
        try:
            from app.services.vnstock_service import get_ohlcv
            from app.services.telegram_service import send_alert
            ohlcv = get_ohlcv(alert["ticker"], "1mo")
            if not ohlcv:
                continue
            current = ohlcv[-1]["close"]
            condition = alert["condition"]
            target = alert["price"]
            hit = (condition == "above" and current >= target) or \
                  (condition == "below" and current <= target)
            if hit:
                direction = "vuot tren" if condition == "above" else "xuong duoi"
                msg = (
                    f"<b>ALERT</b>: {alert['ticker']}\n"
                    f"Gia hien tai: <b>{current:,.0f}</b> VND\n"
                    f"Da {direction} {target:,.0f} VND\n"
                    f"Ghi chu: {alert.get('note', '')}"
                )
                await send_alert(alert.get("telegram_chat_id", ""), msg)
                alert["triggered"] = True
                changed = True
                logger.info(f"Alert triggered: {alert['ticker']} {condition} {target}")
        except Exception as e:
            logger.error(f"Alert check error for {alert.get('ticker')}: {e}")

    if changed:
        alerts_file.write_text(json.dumps(alerts, default=str, ensure_ascii=False, indent=2))

def start_scheduler():
    scheduler.add_job(check_alerts, "interval", minutes=5, id="alert_checker",
                      replace_existing=True)
    scheduler.start()
    logger.info("Alert scheduler started")
