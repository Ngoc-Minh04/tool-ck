import sys
import os

# Thêm thư mục gốc vào path để import được app
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.services.scanner_service import scan_all_stocks
import traceback

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

try:
    print("Testing /scanner/results endpoint via TestClient...")
    res = client.get("/scanner/results")
    print("Response status:", res.status_code)
    print("Response body:", res.text[:500])
except Exception as e:
    print("ERROR DURING ENDPOINT TEST:")
    import traceback
    traceback.print_exc()
