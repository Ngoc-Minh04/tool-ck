from fastapi import APIRouter, BackgroundTasks
from fastapi.concurrency import run_in_threadpool
from app.services.scanner_service import scan_all_stocks, get_signal_candidates
from app.services.cache_service import cache_get, cache_set

router = APIRouter()


@router.get("/results")
async def get_scan_results():
    """Trả về kết quả scan hiện tại từ cache (cực nhanh, không tốn request)."""
    cached = await cache_get("scanner:results")
    if cached:
        return cached

    results = await run_in_threadpool(scan_all_stocks)
    await cache_set("scanner:results", results, ttl=300)
    return results


@router.post("/refresh")
async def refresh_scan(background_tasks: BackgroundTasks):
    """Kích hoạt quét lại toàn bộ 60 mã (chạy nền, không block response)."""
    async def _do_refresh():
        results = await run_in_threadpool(scan_all_stocks, True)
        await cache_set("scanner:results", results, ttl=300)

    background_tasks.add_task(_do_refresh)
    return {"status": "Đang quét lại, kết quả sẽ cập nhật sau 30-60 giây..."}


@router.get("/signals")
async def get_signals():
    """
    Trả về danh sách tín hiệu BUY/SELL mới nhất đã qua lọc.
    Lần đầu: chạy scan ngay. Sau đó: lấy từ RAM (cập nhật theo scheduler).
    """
    from app.tasks.alert_scheduler import get_latest_signals
    latest = get_latest_signals()

    # Nếu chưa có dữ liệu (server vừa khởi động), chạy ngay lập tức
    if not latest.get("scanned_at"):
        results = await run_in_threadpool(scan_all_stocks)
        candidates = get_signal_candidates(results)
        return {"data": candidates}

    return {"data": latest}


@router.post("/signals/send")
async def send_signals_telegram(background_tasks: BackgroundTasks):
    """Kích hoạt gửi tín hiệu về Telegram thủ công ngay lập tức."""
    from app.tasks.alert_scheduler import _run_signal_scan_and_notify

    async def _do_send():
        await _run_signal_scan_and_notify(trigger="manual")

    background_tasks.add_task(_do_send)
    return {"status": "ok", "message": "Đang quét và gửi tín hiệu về Telegram..."}

