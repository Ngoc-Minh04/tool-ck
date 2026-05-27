from fastapi import APIRouter, BackgroundTasks
from fastapi.concurrency import run_in_threadpool
from app.services.scanner_service import scan_all_stocks
from app.services.cache_service import cache_get, cache_set

router = APIRouter()


@router.get("/results")
async def get_scan_results():
    """Trả về kết quả scan hiện tại từ cache (cực nhanh, không tốn request)."""
    # Thử lấy từ cache server trước
    cached = await cache_get("scanner:results")
    if cached:
        return cached

    # Chạy scan trong thread pool để không block event loop
    results = await run_in_threadpool(scan_all_stocks)
    await cache_set("scanner:results", results, ttl=300)  # Cache 5 phút
    return results


@router.post("/refresh")
async def refresh_scan(background_tasks: BackgroundTasks):
    """Kích hoạt quét lại toàn bộ 60 mã (chạy nền, không block response)."""
    async def _do_refresh():
        results = await run_in_threadpool(scan_all_stocks, True)
        await cache_set("scanner:results", results, ttl=300)

    background_tasks.add_task(_do_refresh)
    return {"status": "Đang quét lại, kết quả sẽ cập nhật sau 30-60 giây..."}
