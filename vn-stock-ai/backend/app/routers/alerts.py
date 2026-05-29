from fastapi import APIRouter, HTTPException
from app.models.schemas import AlertCreate
from app.services.telegram_service import send_alert
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import uuid
from app.services.database import get_all_alerts, create_alert as db_create_alert, update_alert, delete_alert as db_delete_alert

router = APIRouter()

@router.get("")
def get_alerts():
    return get_all_alerts()

@router.post("")
def create_alert(body: AlertCreate):
    alert = {
        **body.model_dump(),
        "id": str(uuid.uuid4()),
        "created_at": datetime.now().isoformat(),
        "triggered": False,
        "last_triggered_at": None
    }
    db_create_alert(alert)
    return alert

@router.post("/{alert_id}/reactivate")
def reactivate_alert(alert_id: str):
    success = update_alert(alert_id, {"triggered": False})
    if not success:
        raise HTTPException(status_code=404, detail="Alert not found")
    return {"reactivated": alert_id}

@router.patch("/{alert_id}")
def edit_alert(alert_id: str, body: dict):
    """Cập nhật thông tin cảnh báo (giá, điều kiện, ghi chú, telegram, mode, cooldown)"""
    allowed_fields = {"ticker", "condition", "price", "telegram_chat_id", "note", "mode", "cooldown"}
    updates = {k: v for k, v in body.items() if k in allowed_fields}
    if not updates:
        raise HTTPException(status_code=400, detail="No valid fields to update")
    success = update_alert(alert_id, updates)
    if not success:
        raise HTTPException(status_code=404, detail="Alert not found")
    return {"updated": alert_id}


class TelegramTestRequest(BaseModel):
    telegram_chat_id: str
    message: Optional[str] = None


@router.post("/test-telegram")
async def test_telegram(body: TelegramTestRequest):
    """Gửi tin nhắn thử nghiệm tới Telegram Chat ID để kiểm tra kết nối"""
    msg = body.message or (
        "✅ <b>VN Stock AI — Kiểm tra kết nối thành công!</b>\n"
        "Bạn đã thiết lập đúng Telegram Chat ID.\n"
        "Hệ thống sẽ gửi cảnh báo giá tới đây khi điều kiện khớp."
    )
    success = await send_alert(body.telegram_chat_id, msg)
    if not success:
        raise HTTPException(status_code=400, detail="Không thể gửi tin nhắn Telegram. Vui lòng kiểm tra lại Bot Token và Chat ID.")
    return {"sent": True, "telegram_chat_id": body.telegram_chat_id}


@router.delete("/{alert_id}")
def delete_alert(alert_id: str):
    success = db_delete_alert(alert_id)
    if not success:
        raise HTTPException(status_code=404, detail="Alert not found")
    return {"deleted": alert_id}
