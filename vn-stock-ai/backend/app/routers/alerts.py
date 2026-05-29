from fastapi import APIRouter, HTTPException
from app.models.schemas import AlertCreate
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

@router.delete("/{alert_id}")
def delete_alert(alert_id: str):
    success = db_delete_alert(alert_id)
    if not success:
        raise HTTPException(status_code=404, detail="Alert not found")
    return {"deleted": alert_id}
