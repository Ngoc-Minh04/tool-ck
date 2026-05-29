import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import asyncio
import html
from app.services.scanner_service import scan_all_stocks, get_signal_candidates

def build_message():
    results = scan_all_stocks()
    candidates = get_signal_candidates(results)
    buy_list = candidates.get("buy_signals", [])
    sell_list = candidates.get("sell_signals", [])
    total_scanned = candidates.get("total_scanned", 0)

    now_str = "22:02 29/05/2026"
    trigger_label = "🖐️ Gửi thủ công"

    lines = [f"<b>{trigger_label} — {now_str}</b>"]
    lines.append(f"Quét <b>{total_scanned}</b> mã VN100 · Thuật toán Kỹ thuật + AI Ensemble\n")

    if buy_list:
        lines.append("🟢 <b>TÍN HIỆU MUA (BUY)</b>")
        for item in buy_list[:8]:
            ticker = html.escape(str(item.get("ticker", "?")))
            score = item.get("score", 0)
            price = item.get("price", 0)
            price_str = f"{price/1000:.1f}k" if price >= 1000 else f"{price}"
            rsi = item.get("rsi")
            rsi_str = f"RSI {rsi:.0f}" if rsi else ""
            ai_trend = item.get("ai_trend", "")
            ai_str = f" · AI: {html.escape(str(ai_trend))}" if ai_trend else ""
            reasons = item.get("reasons", [])
            top_reason = html.escape(str(reasons[0])) if reasons else ""
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
        for item in sell_list[:5]:
            ticker = html.escape(str(item.get("ticker", "?")))
            score = item.get("score", 0)
            price = item.get("price", 0)
            price_str = f"{price/1000:.1f}k" if price >= 1000 else f"{price}"
            rsi = item.get("rsi")
            rsi_str = f"RSI {rsi:.0f}" if rsi else ""
            reasons = item.get("reasons", [])
            top_reason = html.escape(str(reasons[0])) if reasons else ""
            lines.append(
                f"  <b>{ticker}</b> · {price_str} · Điểm <b>{score}/10</b>"
                f"{' · ' + rsi_str if rsi_str else ''}"
                f"\n  <i>{top_reason}</i>"
            )
    else:
        lines.append("🔴 <b>CẢNH BÁO BÁN:</b> Không có mã yếu đáng kể")

    lines.append("")
    lines.append("<i>⚠️ Đây là tín hiệu kỹ thuật + AI tự động, không phải khuyến nghị đầu tư.</i>")

    return "\n".join(lines)

msg = build_message()
print("MESSAGE LENGTH:", len(msg))
with open("scratch/debug_message.html", "w", encoding="utf-8") as f:
    f.write(msg)

# Test telegram api error description
import httpx
from app.config import settings

async def test_telegram_send():
    token = settings.TELEGRAM_BOT_TOKEN
    chat_id = settings.TELEGRAM_CHAT_ID
    url = f"https://api.telegram.org/bot{token}/sendMessage"
    async with httpx.AsyncClient() as client:
        resp = await client.post(url, json={
            "chat_id": chat_id,
            "text": msg,
            "parse_mode": "HTML"
        })
        print("STATUS:", resp.status_code)
        print("RESPONSE:", resp.text)

asyncio.run(test_telegram_send())
