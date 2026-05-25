from fastapi import APIRouter, HTTPException
from app.models.schemas import AlertCreate
from datetime import datetime
import uuid, json
from pathlib import Path

router = APIRouter()
ALERTS_FILE = Path("alerts.json")

def load_alerts():
    if ALERTS_FILE.exists():
        try:
            return json.loads(ALERTS_FILE.read_text())
        except:
            return []
    return []

def save_alerts(alerts):
    ALERTS_FILE.write_text(json.dumps(alerts, default=str, ensure_ascii=False, indent=2))

@router.get("")
def get_alerts():
    return load_alerts()

@router.post("")
def create_alert(body: AlertCreate):
    alerts = load_alerts()
    alert = {
        **body.model_dump(),
        "id": str(uuid.uuid4()),
        "created_at": datetime.now().isoformat(),
        "triggered": False
    }
    alerts.append(alert)
    save_alerts(alerts)
    return alert

@router.delete("/{alert_id}")
def delete_alert(alert_id: str):
    alerts = load_alerts()
    original_len = len(alerts)
    alerts = [a for a in alerts if a["id"] != alert_id]
    if len(alerts) == original_len:
        raise HTTPException(status_code=404, detail="Alert not found")
    save_alerts(alerts)
    return {"deleted": alert_id}
