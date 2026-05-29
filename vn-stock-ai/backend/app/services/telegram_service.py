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


async def send_signal_digest(chat_id: str, buy_list: list, sell_list: list,
                              scanned_at: str = None, total_scanned: int = 0,
                              trigger: str = "auto"):
    """
    Gửi tin nhắn tổng hợp tín hiệu BUY/SELL đẹp về Telegram.
    trigger: 'schedule' (lịch cố định), 'intraday' (phát hiện mới), 'manual' (thủ công)
    """
    from datetime import datetime

    now_str = scanned_at or datetime.now().strftime("%H:%M %d/%m/%Y")
    trigger_label = {
        "schedule": "📅 Báo cáo định kỳ",
        "intraday": "⚡ Tín hiệu mới phát sinh",
        "manual": "🖐️ Gửi thủ công",
    }.get(trigger, "🔔 Scanner AI")

    lines = [f"<b>{trigger_label} — {now_str}</b>"]
    lines.append(f"Quét <b>{total_scanned}</b> mã VN100 · Thuật toán Kỹ thuật + AI Ensemble\n")

    if buy_list:
        lines.append("🟢 <b>TÍN HIỆU MUA (BUY)</b>")
        for item in buy_list[:8]:  # Tối đa 8 mã
            ticker = item.get("ticker", "?")
            score = item.get("score", 0)
            price = item.get("price", 0)
            price_str = f"{price/1000:.1f}k" if price >= 1000 else f"{price}"
            rsi = item.get("rsi")
            rsi_str = f"RSI {rsi:.0f}" if rsi else ""
            ai_trend = item.get("ai_trend", "")
            ai_str = f" · AI: {ai_trend}" if ai_trend else ""
            reasons = item.get("reasons", [])
            top_reason = reasons[0] if reasons else ""
            lines.append(
                f"  <b>{ticker}</b> · {price_str} · Điểm <b>{score}/10</b>"
                f"{' · ' + rsi_str if rsi_str else ''}{ai_str}"
                f"\n  <i>{top_reason}</i>"
            )
    else:
        lines.append("🟢 <b>TÍN HIỆU MUA:</b> Không có mã đủ tiêu chuẩn")

    lines.append("")

    if sell_list:
        lines.append("🔴 <b>CẢNH BÁO BÁN (SELL)</b>")
        for item in sell_list[:5]:  # Tối đa 5 mã
            ticker = item.get("ticker", "?")
            score = item.get("score", 0)
            price = item.get("price", 0)
            price_str = f"{price/1000:.1f}k" if price >= 1000 else f"{price}"
            rsi = item.get("rsi")
            rsi_str = f"RSI {rsi:.0f}" if rsi else ""
            reasons = item.get("reasons", [])
            top_reason = reasons[0] if reasons else ""
            lines.append(
                f"  <b>{ticker}</b> · {price_str} · Điểm <b>{score}/10</b>"
                f"{' · ' + rsi_str if rsi_str else ''}"
                f"\n  <i>{top_reason}</i>"
            )
    else:
        lines.append("🔴 <b>CẢNH BÁO BÁN:</b> Không có mã yếu đáng kể")

    lines.append("")
    lines.append("<i>⚠️ Đây là tín hiệu kỹ thuật + AI tự động, không phải khuyến nghị đầu tư.</i>")

    message = "\n".join(lines)
    return await send_alert(chat_id, message)

