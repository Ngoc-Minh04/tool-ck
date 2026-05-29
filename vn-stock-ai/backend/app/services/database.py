import sqlite3
import json
from pathlib import Path
from typing import List, Dict, Optional
from loguru import logger

DB_FILE = Path("alerts.db")

def get_db_connection():
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    with get_db_connection() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS alerts (
                id TEXT PRIMARY KEY,
                ticker TEXT NOT NULL,
                condition TEXT NOT NULL,
                price REAL NOT NULL,
                telegram_chat_id TEXT,
                note TEXT,
                mode TEXT NOT NULL DEFAULT 'once',
                cooldown INTEGER NOT NULL DEFAULT 15,
                triggered INTEGER NOT NULL DEFAULT 0,
                last_triggered_at TEXT,
                created_at TEXT NOT NULL
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS alert_logs (
                id TEXT PRIMARY KEY,
                alert_id TEXT,
                ticker TEXT NOT NULL,
                condition TEXT NOT NULL,
                price REAL,
                trigger_price REAL,
                triggered_at TEXT NOT NULL,
                note TEXT
            )
        """)
        conn.commit()
    migrate_json_to_sqlite()

def migrate_json_to_sqlite():
    json_file = Path("alerts.json")
    if json_file.exists():
        try:
            alerts = json.loads(json_file.read_text())
            with get_db_connection() as conn:
                for alert in alerts:
                    exists = conn.execute("SELECT 1 FROM alerts WHERE id = ?", (alert["id"],)).fetchone()
                    if not exists:
                        conn.execute("""
                            INSERT INTO alerts (id, ticker, condition, price, telegram_chat_id, note, mode, cooldown, triggered, last_triggered_at, created_at)
                            VALUES (:id, :ticker, :condition, :price, :telegram_chat_id, :note, :mode, :cooldown, :triggered, :last_triggered_at, :created_at)
                        """, {
                            "id": alert["id"],
                            "ticker": alert["ticker"],
                            "condition": alert["condition"],
                            "price": alert["price"],
                            "telegram_chat_id": alert.get("telegram_chat_id"),
                            "note": alert.get("note"),
                            "mode": alert.get("mode", "once"),
                            "cooldown": alert.get("cooldown", 15),
                            "triggered": 1 if alert.get("triggered") else 0,
                            "last_triggered_at": alert.get("last_triggered_at"),
                            "created_at": alert["created_at"]
                        })
                conn.commit()
            backup_file = Path("alerts_backup.json")
            if backup_file.exists():
                backup_file.unlink()
            json_file.rename(backup_file)
            logger.info("Migrated alerts.json to SQLite alerts.db successfully.")
        except Exception as e:
            logger.error(f"Failed to migrate JSON alerts to SQLite: {e}")

# Khởi tạo db và migrate khi module được import
init_db()

def get_all_alerts() -> List[Dict]:
    with get_db_connection() as conn:
        rows = conn.execute("SELECT * FROM alerts ORDER BY created_at DESC").fetchall()
        alerts = []
        for r in rows:
            alert = dict(r)
            alert["triggered"] = bool(alert["triggered"])
            alerts.append(alert)
        return alerts

def create_alert(alert_data: Dict) -> Dict:
    with get_db_connection() as conn:
        conn.execute("""
            INSERT INTO alerts (id, ticker, condition, price, telegram_chat_id, note, mode, cooldown, triggered, last_triggered_at, created_at)
            VALUES (:id, :ticker, :condition, :price, :telegram_chat_id, :note, :mode, :cooldown, :triggered, :last_triggered_at, :created_at)
        """, {
            "id": alert_data["id"],
            "ticker": alert_data["ticker"],
            "condition": alert_data["condition"],
            "price": alert_data["price"],
            "telegram_chat_id": alert_data.get("telegram_chat_id"),
            "note": alert_data.get("note"),
            "mode": alert_data.get("mode", "once"),
            "cooldown": alert_data.get("cooldown", 15),
            "triggered": 1 if alert_data.get("triggered") else 0,
            "last_triggered_at": alert_data.get("last_triggered_at"),
            "created_at": alert_data["created_at"]
        })
        conn.commit()
    return alert_data

def update_alert(alert_id: str, updates: Dict) -> bool:
    if not updates:
        return False
    
    fields = []
    values = {}
    for k, v in updates.items():
        if k == "triggered":
            fields.append(f"{k} = :triggered")
            values["triggered"] = 1 if v else 0
        else:
            fields.append(f"{k} = :{k}")
            values[k] = v
            
    values["id"] = alert_id
    query = f"UPDATE alerts SET {', '.join(fields)} WHERE id = :id"
    
    with get_db_connection() as conn:
        cursor = conn.execute(query, values)
        conn.commit()
        return cursor.rowcount > 0

def delete_alert(alert_id: str) -> bool:
    with get_db_connection() as conn:
        cursor = conn.execute("DELETE FROM alerts WHERE id = ?", (alert_id,))
        conn.commit()
        return cursor.rowcount > 0

def get_alert_logs() -> List[Dict]:
    with get_db_connection() as conn:
        rows = conn.execute("SELECT * FROM alert_logs ORDER BY triggered_at DESC LIMIT 100").fetchall()
        return [dict(r) for r in rows]

def create_alert_log(log_data: Dict) -> Dict:
    with get_db_connection() as conn:
        conn.execute("""
            INSERT INTO alert_logs (id, alert_id, ticker, condition, price, trigger_price, triggered_at, note)
            VALUES (:id, :alert_id, :ticker, :condition, :price, :trigger_price, :triggered_at, :note)
        """, {
            "id": log_data["id"],
            "alert_id": log_data.get("alert_id"),
            "ticker": log_data["ticker"],
            "condition": log_data["condition"],
            "price": log_data.get("price"),
            "trigger_price": log_data.get("trigger_price"),
            "triggered_at": log_data["triggered_at"],
            "note": log_data.get("note")
        })
        conn.commit()
    return log_data

def clear_alert_logs() -> bool:
    with get_db_connection() as conn:
        cursor = conn.execute("DELETE FROM alert_logs")
        conn.commit()
        return True

def bulk_delete_alerts(ids: List[str]) -> bool:
    if not ids:
        return False
    placeholders = ", ".join("?" for _ in ids)
    with get_db_connection() as conn:
        cursor = conn.execute(f"DELETE FROM alerts WHERE id IN ({placeholders})", ids)
        conn.commit()
        return cursor.rowcount > 0

def bulk_update_alerts_status(ids: List[str], triggered: bool) -> bool:
    if not ids:
        return False
    placeholders = ", ".join("?" for _ in ids)
    status_val = 1 if triggered else 0
    with get_db_connection() as conn:
        # We pass status_val as the first param, then the IDs
        cursor = conn.execute(f"UPDATE alerts SET triggered = ? WHERE id IN ({placeholders})", [status_val] + ids)
        conn.commit()
        return cursor.rowcount > 0
