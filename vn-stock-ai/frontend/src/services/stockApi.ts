import axios from 'axios'
import { enrichOHLCV } from '../utils/indicators'

const BASE = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000'
const api = axios.create({ baseURL: BASE, timeout: 30000 })

function mockOHLCV(ticker: string, days = 90): any[] {
  const data: any[] = []
  let price = 20000 + Math.random() * 80000
  const today = new Date()
  for (let i = days; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    if (d.getDay() === 0 || d.getDay() === 6) continue
    const change = (Math.random() - 0.48) * 0.05
    price = price * (1 + change)
    const open = price * (1 + (Math.random() - 0.5) * 0.02)
    const high = Math.max(open, price) * (1 + Math.random() * 0.02)
    const low = Math.min(open, price) * (1 - Math.random() * 0.02)
    data.push({
      date: d.toISOString().split('T')[0],
      open: +open.toFixed(2),
      high: +high.toFixed(2),
      low: +low.toFixed(2),
      close: +price.toFixed(2),
      volume: Math.floor(Math.random() * 5e6 + 500000),
    })
  }
  return enrichOHLCV(data)
}

function mockInfo(ticker: string): any {
  const sectors: Record<string, string> = {
    VCB: 'Ngân hàng', BID: 'Ngân hàng', CTG: 'Ngân hàng', ACB: 'Ngân hàng',
    MBB: 'Ngân hàng', TCB: 'Ngân hàng', HPG: 'Thép', FPT: 'Công nghệ',
    VIC: 'Bất động sản', VNM: 'Thực phẩm', SSI: 'Chứng khoán', HCM: 'Chứng khoán',
    GAS: 'Dầu khí', PLX: 'Dầu khí', MSN: 'Hàng tiêu dùng', VHM: 'Bất động sản',
  }
  return {
    ticker,
    name: `${ticker} Corp`,
    sector: sectors[ticker] || 'Khác',
    industry: sectors[ticker] || 'Khác',
    exchange: 'HOSE',
    pe: +(10 + Math.random() * 20).toFixed(1),
    pb: +(0.8 + Math.random() * 3).toFixed(2),
    roe: +(10 + Math.random() * 20).toFixed(1),
    roa: +(3 + Math.random() * 8).toFixed(1),
    eps: Math.floor(1000 + Math.random() * 5000),
    market_cap: Math.floor(1e11 + Math.random() * 1e13),
    dividend_yield: +(Math.random() * 0.06).toFixed(3),
    outstanding_shares: Math.floor(1e8 + Math.random() * 1e10),
  }
}

function mockTechnicals(ohlcv: any[]): any {
  if (!ohlcv.length) return null
  const last = ohlcv[ohlcv.length - 1]
  const closes = ohlcv.map(d => d.close)
  const highs = ohlcv.map(d => d.high)
  const lows = ohlcv.map(d => d.low)
  const recentLow = Math.min(...lows.slice(-20))
  const recentHigh = Math.max(...highs.slice(-20))
  return {
    close: last.close,
    ma20: last.ma20,
    ma50: last.ma50,
    ma200: last.ma200,
    rsi: last.rsi,
    macd: last.macd,
    macd_signal: last.macd_signal,
    macd_hist: last.macd_hist,
    bb_upper: last.bb_upper,
    bb_mid: last.bb_mid,
    bb_lower: last.bb_lower,
    avg_volume: Math.floor(ohlcv.slice(-20).reduce((a, d) => a + d.volume, 0) / 20),
    trend: last.ma20 && last.ma50 ? (last.ma20 > last.ma50 ? 'uptrend' : 'downtrend') : 'sideways',
    support: +recentLow.toFixed(2),
    resistance: +recentHigh.toFixed(2),
  }
}

function mockMarketOverview(): any[] {
  return [
    { index: 'VN-Index', close: 1245.32 + (Math.random() - 0.5) * 20, change_pct: (Math.random() * 2 - 1).toFixed(2), advance: 195, decline: 154, unchanged: 23 },
    { index: 'HNX-Index', close: 228.45 + (Math.random() - 0.5) * 5, change_pct: (Math.random() * 2 - 1).toFixed(2), advance: 85, decline: 62, unchanged: 15 },
    { index: 'UPCOM-Index', close: 92.18 + (Math.random() - 0.5) * 2, change_pct: (Math.random() * 1.5 - 0.75).toFixed(2), advance: 120, decline: 98, unchanged: 40 },
  ]
}

function mockTopMovers(): any {
  const tickers = ['ACB','VCB','HPG','FPT','VNM','MBB','TCB','SSI','HCM','VHM','GAS','PLX','CTG','BID','MSN','VIC']
  const gainers = tickers.slice(0, 5).map(t => ({
    ticker: t, price: +(20000 + Math.random() * 80000).toFixed(0),
    change_pct: +(Math.random() * 6.5 + 0.5).toFixed(2), volume: Math.floor(Math.random() * 1e7 + 1e5)
  }))
  const losers = tickers.slice(5, 10).map(t => ({
    ticker: t, price: +(20000 + Math.random() * 80000).toFixed(0),
    change_pct: -(Math.random() * 6.5 + 0.5).toFixed(2), volume: Math.floor(Math.random() * 1e7 + 1e5)
  }))
  const volume = tickers.slice(10).map(t => ({
    ticker: t, price: +(20000 + Math.random() * 80000).toFixed(0),
    change_pct: (Math.random() * 4 - 2).toFixed(2), volume: Math.floor(Math.random() * 2e7 + 5e6)
  }))
  return { gainers, losers, volume }
}

function mockForeignFlow(): any[] {
  return ['VCB','HPG','FPT','VNM','VHM'].map(t => ({
    ticker: t,
    buy_val: +(Math.random() * 100).toFixed(2),
    sell_val: +(Math.random() * 100).toFixed(2),
    net_val: (Math.random() * 60 - 30).toFixed(2),
  }))
}

export const stockApi = {
  async getOHLCV(ticker: string, period = '3mo'): Promise<any[]> {
    try {
      const res = await api.get(`/stock/${ticker}/ohlcv`, { params: { period } })
      const raw = res.data?.data || res.data || []
      return enrichOHLCV(raw)
    } catch {
      return mockOHLCV(ticker)
    }
  },

  async getInfo(ticker: string): Promise<any> {
    try {
      const res = await api.get(`/stock/${ticker}/info`)
      return res.data?.data || res.data
    } catch {
      return mockInfo(ticker)
    }
  },

  async getTechnicals(ticker: string, period = '3mo'): Promise<any> {
    try {
      const res = await api.get(`/stock/${ticker}/technicals`, { params: { period } })
      return res.data?.data || res.data
    } catch {
      const ohlcv = mockOHLCV(ticker)
      return mockTechnicals(ohlcv)
    }
  },

  async getFullAnalysis(ticker: string, period = '3mo'): Promise<{ ohlcv: any[]; info: any; technicals: any }> {
    try {
      const res = await api.get(`/stock/${ticker}/full`, { params: { period } })
      const { ohlcv, info, technicals } = res.data?.data || res.data || {}
      return { ohlcv: enrichOHLCV(ohlcv || []), info: info || null, technicals: technicals || null }
    } catch {
      const ohlcv = mockOHLCV(ticker)
      return { ohlcv, info: mockInfo(ticker), technicals: mockTechnicals(ohlcv) }
    }
  },

  async getMarketOverview(): Promise<any[]> {
    try {
      const res = await api.get('/market/overview')
      return res.data?.data || res.data || []
    } catch {
      return mockMarketOverview()
    }
  },

  async getTopMovers(): Promise<any> {
    try {
      const res = await api.get('/market/movers')
      return res.data?.data || res.data
    } catch {
      return mockTopMovers()
    }
  },

  async getForeignFlow(): Promise<any[]> {
    try {
      const res = await api.get('/market/foreign')
      return res.data?.data || res.data || []
    } catch {
      return mockForeignFlow()
    }
  },

  async getAlerts(): Promise<any[]> {
    try {
      const res = await api.get('/alerts')
      return res.data?.data || res.data || []
    } catch {
      return []
    }
  },

  async createAlert(body: any): Promise<any> {
    const res = await api.post('/alerts', body)
    return res.data
  },

  async deleteAlert(id: string): Promise<void> {
    await api.delete(`/alerts/${id}`)
  },

  async healthCheck(): Promise<boolean> {
    try {
      await api.get('/health', { timeout: 3000 })
      return true
    } catch {
      return false
    }
  },

  async backtest(body: { ticker: string; strategy: string; period: string; initial_capital: number }): Promise<any> {
    const res = await api.post('/stock/backtest', body)
    return res.data?.data || res.data
  },

  async getSupportResistance(ticker: string, period = '3mo'): Promise<any> {
    try {
      const res = await api.get('/stock/support-resistance', { params: { ticker, period } })
      return res.data?.data || res.data
    } catch {
      return { supports: [], resistances: [], pivot_points: {} }
    }
  },

  async getNews(ticker: string): Promise<any[]> {
    try {
      const res = await api.get('/stock/news', { params: { ticker } })
      return res.data?.data || res.data || []
    } catch {
      return []
    }
  },

  async getPeers(ticker: string): Promise<any> {
    try {
      const res = await api.get('/stock/peers', { params: { ticker } })
      return res.data?.data || res.data
    } catch {
      return { ticker: ticker.toUpperCase(), industry: '', peers: [] }
    }
  },

  async getHealthDetail(): Promise<any> {
    try {
      const res = await api.get('/health')
      return res.data
    } catch {
      return { status: 'offline' }
    }
  },
}

