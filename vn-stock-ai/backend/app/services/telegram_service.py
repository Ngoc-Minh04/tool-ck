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
        
    chat_ids = [cid.strip() for cid in str(target_chat).split(",") if cid.strip()]
    url = f"https://api.telegram.org/bot{token}/sendMessage"
    
    overall_success = True
    async with httpx.AsyncClient() as client:
        for cid in chat_ids:
            try:
                resp = await client.post(url, json={
                    "chat_id": cid,
                    "text": message,
                    "parse_mode": "HTML"
                }, timeout=10)
                resp.raise_for_status()
                logger.info(f"Telegram alert sent to {cid}")
            except Exception as e:
                logger.error(f"Telegram send error to {cid}: {e}")
                overall_success = False
                
    return overall_success
