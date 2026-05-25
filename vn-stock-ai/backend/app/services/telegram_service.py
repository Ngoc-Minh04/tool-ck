import httpx
from app.config import settings
from loguru import logger

async def send_alert(chat_id: str, message: str):
    token = settings.TELEGRAM_BOT_TOKEN
    if not token:
        logger.warning("Telegram token not configured, skipping alert")
        return False
    target_chat = chat_id or settings.TELEGRAM_CHAT_ID
    if not target_chat:
        logger.warning("No Telegram chat ID configured")
        return False
    url = f"https://api.telegram.org/bot{token}/sendMessage"
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.post(url, json={
                "chat_id": target_chat,
                "text": message,
                "parse_mode": "HTML"
            }, timeout=10)
            resp.raise_for_status()
            logger.info(f"Telegram alert sent to {target_chat}")
            return True
        except Exception as e:
            logger.error(f"Telegram send error: {e}")
            return False
