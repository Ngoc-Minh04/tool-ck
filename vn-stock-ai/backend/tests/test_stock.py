import pytest
from unittest.mock import patch


@pytest.mark.asyncio
async def test_health(client):
    r = await client.get("/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


@pytest.mark.asyncio
async def test_ohlcv_mock(client):
    """Test fallback mock data khi vnstock lỗi"""
    with patch("app.services.vnstock_service.get_ohlcv") as mock:
        mock.return_value = [
            {"date": "2024-01-01", "open": 20.0, "high": 21.0,
             "low": 19.5, "close": 20.5, "volume": 1000000}
        ]
        r = await client.get("/stock/ohlcv?ticker=ACB&period=1mo")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        assert "close" in data[0]


@pytest.mark.asyncio
async def test_technicals_structure(client):
    with patch("app.services.vnstock_service.get_ohlcv") as mock:
        mock.return_value = [
            {"date": f"2024-01-{i:02d}", "open": 20 + i * 0.1,
             "high": 21 + i * 0.1, "low": 19 + i * 0.1,
             "close": 20.5 + i * 0.1, "volume": 1000000}
            for i in range(1, 61)
        ]
        r = await client.get("/stock/technicals?ticker=ACB")
        assert r.status_code == 200
        data = r.json()
        assert "rsi" in data
        assert "trend" in data
        assert data["trend"] in ["uptrend", "downtrend", "sideways", "unknown"]


@pytest.mark.asyncio
async def test_support_resistance(client):
    with patch("app.services.vnstock_service.get_ohlcv") as mock:
        mock.return_value = [
            {"date": f"2024-01-{i:02d}", "open": 20.0, "high": 22.0,
             "low": 18.0, "close": 20.5, "volume": 1000000}
            for i in range(1, 61)
        ]
        r = await client.get("/stock/support-resistance?ticker=ACB")
        assert r.status_code == 200
        data = r.json()
        assert "supports" in data
        assert "resistances" in data
        assert "pivot_points" in data


@pytest.mark.asyncio
async def test_market_overview_structure(client):
    with patch("app.services.vnstock_service.get_market_overview") as mock:
        mock.return_value = [
            {"index": "VNINDEX", "close": 1250.0, "change": -5.2,
             "change_pct": -0.41, "volume": 500000000}
        ]
        r = await client.get("/market/overview")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)


@pytest.mark.asyncio
async def test_alert_crud(client):
    # Tạo alert
    r = await client.post("/alerts", json={
        "ticker": "ACB", "condition": "above",
        "price": 25000.0, "telegram_chat_id": None, "note": "test"
    })
    assert r.status_code == 200
    alert_id = r.json()["id"]

    # Lấy danh sách
    r = await client.get("/alerts")
    assert r.status_code == 200
    assert any(a["id"] == alert_id for a in r.json())

    # Xóa
    r = await client.delete(f"/alerts/{alert_id}")
    assert r.status_code == 200
