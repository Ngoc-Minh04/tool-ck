from pydantic import BaseModel
from typing import Optional, Literal
from datetime import datetime

class OHLCVItem(BaseModel):
    date: str
    open: float
    high: float
    low: float
    close: float
    volume: int

class StockInfo(BaseModel):
    ticker: str
    company_name: str
    industry: str
    pe: Optional[float] = None
    pb: Optional[float] = None
    eps: Optional[float] = None
    roe: Optional[float] = None
    roa: Optional[float] = None
    market_cap: Optional[float] = None

class Technicals(BaseModel):
    rsi: Optional[float] = None
    macd: Optional[float] = None
    macd_signal: Optional[float] = None
    macd_hist: Optional[float] = None
    bb_upper: Optional[float] = None
    bb_lower: Optional[float] = None
    bb_mid: Optional[float] = None
    ma20: Optional[float] = None
    ma50: Optional[float] = None
    ma200: Optional[float] = None
    atr: Optional[float] = None
    obv: Optional[float] = None
    stoch_k: Optional[float] = None
    stoch_d: Optional[float] = None
    trend: str = "sideways"
    volume_avg20: Optional[float] = None
    close: Optional[float] = None

class AlertCreate(BaseModel):
    ticker: str
    condition: Literal["above", "below"]
    price: float
    telegram_chat_id: Optional[str] = None
    note: Optional[str] = None

class Alert(AlertCreate):
    id: str
    created_at: datetime
    triggered: bool = False

class BacktestRequest(BaseModel):
    ticker: str
    strategy: Literal["ma_cross", "rsi", "macd"]
    period: str = "1y"
    initial_capital: float = 100_000_000

class BacktestResult(BaseModel):
    ticker: str
    strategy: str
    total_return: float
    sharpe_ratio: float
    max_drawdown: float
    win_rate: float
    total_trades: int
    equity_curve: list
