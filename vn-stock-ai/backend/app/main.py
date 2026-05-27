import sys
import io

class SafeStreamWrapper:
    def __init__(self, original_stream):
        self.original_stream = original_stream
    def write(self, data):
        try:
            self.original_stream.write(data)
        except UnicodeEncodeError:
            try:
                self.original_stream.write(data.encode('ascii', errors='replace').decode('ascii'))
            except:
                pass
    def flush(self):
        self.original_stream.flush()
    def __getattr__(self, name):
        return getattr(self.original_stream, name)

sys.stdout = SafeStreamWrapper(sys.stdout)
sys.stderr = SafeStreamWrapper(sys.stderr)

import time
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import stock, market, screener, alerts, scanner as scanner_router
from app.routers import claude as claude_router
from app.config import settings
from app.tasks.alert_scheduler import start_scheduler, scheduler
from app.services.cache_service import init_redis
from loguru import logger

try:
    from slowapi import Limiter, _rate_limit_exceeded_handler
    from slowapi.util import get_remote_address
    from slowapi.errors import RateLimitExceeded
    limiter = Limiter(key_func=get_remote_address)
    HAS_SLOWAPI = True
except ImportError:
    limiter = None
    HAS_SLOWAPI = False

START_TIME = time.time()

app = FastAPI(
    title="VN Stock AI Predictor API",
    description="FastAPI backend cho phân tích chứng khoán Việt Nam với Claude AI",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

if HAS_SLOWAPI:
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(stock.router, prefix="/stock", tags=["Stock"])
app.include_router(market.router, prefix="/market", tags=["Market"])
app.include_router(screener.router, prefix="/screener", tags=["Screener"])
app.include_router(alerts.router, prefix="/alerts", tags=["Alerts"])
app.include_router(claude_router.router, prefix="/claude", tags=["Claude AI"])
app.include_router(scanner_router.router, prefix="/scanner", tags=["Auto Scanner"])


@app.on_event("startup")
async def startup():
    logger.info("Starting VN Stock AI API v2.0...")
    
    # Tự động gán API key của vnstock vào biến môi trường hệ thống để thư viện tự động sử dụng
    if settings.VNSTOCK_API_KEY:
        import os
        os.environ['VNSTOCK_API_KEY'] = settings.VNSTOCK_API_KEY
        logger.info("Đã cấu hình VNSTOCK_API_KEY vào biến môi trường hệ thống (Community/Sponsor).")
            
    await init_redis(settings.REDIS_URL)
    start_scheduler()
    # Tải trước OHLCV 60 mã VN100 vào cache nền để lần scan đầu tiên nhanh hơn
    from app.services.scanner_service import preload_ohlcv
    preload_ohlcv()
    logger.info("API ready at http://localhost:8000")


@app.get("/", tags=["Root"])
def root():
    return {
        "message": "VN Stock AI Predictor API v2.0",
        "docs": "/docs",
        "health": "/health",
    }


@app.get("/health", tags=["Root"])
async def health():
    from app.services.cache_service import _USE_REDIS
    redis_ok = _USE_REDIS

    scheduler_running = False
    try:
        scheduler_running = scheduler.running
    except Exception:
        pass

    # Kiểm tra tier của vnstock
    vnstock_tier = "unknown"
    has_key = False
    try:
        from vnai.beam.auth import authenticator
        status_info = authenticator.check_api_key_status()
        vnstock_tier = status_info.get("tier", "unknown")
        has_key = status_info.get("has_api_key", False)
    except Exception:
        pass

    return {
        "status": "ok",
        "version": "2.0.0",
        "uptime_seconds": round(time.time() - START_TIME),
        "redis": "ok" if redis_ok else "unavailable",
        "vnstock_status": "ok",
        "vnstock_tier": vnstock_tier,
        "vnstock_has_key": has_key,
        "scheduler": "running" if scheduler_running else "stopped",
    }
