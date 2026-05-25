import { useState, useCallback } from 'react'
import { stockApi } from '../services/stockApi'
import { generateMockOHLCV } from '../utils/mockData'
import { compute_indicators_client, enrichOHLCV } from '../utils/indicators'
import toast from 'react-hot-toast'

export function useStockData() {
  const [ohlcv, setOhlcv] = useState<any[]>([])
  const [info, setInfo] = useState<any>(null)
  const [technicals, setTechnicals] = useState<any>(null)
  const [sr, setSr] = useState<any>(null)
  const [news, setNews] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [isOffline, setIsOffline] = useState(false)
  const [backendOk, setBackendOk] = useState<boolean | null>(null)

  const fetchAll = useCallback(async (ticker: string, period = '3mo') => {
    setLoading(true)
    try {
      const isOk = await stockApi.healthCheck()
      setBackendOk(isOk)

      if (isOk) {
        // Backend online — fetch dữ liệu thật
        const [fullData, srData, newsData] = await Promise.all([
          stockApi.getFullAnalysis(ticker, period),
          stockApi.getSupportResistance(ticker, period),
          stockApi.getNews(ticker),
        ])
        setOhlcv(fullData.ohlcv || [])
        setInfo(fullData.info || null)
        setTechnicals(fullData.technicals || null)
        setSr(srData || null)
        setNews(newsData || [])
        setIsOffline(false)
        return fullData
      } else {
        // Backend offline → fallback sang mock data
        _loadMockData(ticker, period)
        toast('Backend offline — đang dùng dữ liệu mô phỏng', { icon: '⚠️', id: 'backend-warn' })
        return null
      }
    } catch (err: any) {
      setBackendOk(false)
      _loadMockData(ticker, period)
      toast('Dùng mock data (backend chưa chạy)', { icon: '⚠️', id: 'backend-warn' })
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const _loadMockData = (ticker: string, period: string) => {
    const days = period === '1mo' ? 30 : period === '6mo' ? 180 : period === '1y' ? 365 : 90
    const mockRaw = generateMockOHLCV(ticker, days)
    const mockData = enrichOHLCV(mockRaw)
    const closes = mockData.map((d: any) => d.close)
    const highs = mockData.map((d: any) => d.high)
    const lows = mockData.map((d: any) => d.low)
    const lastH = highs[highs.length - 2] ?? highs[highs.length - 1]
    const lastL = lows[lows.length - 2] ?? lows[lows.length - 1]
    const lastC = closes[closes.length - 2] ?? closes[closes.length - 1]
    const pivots = compute_indicators_client.pivotPoints(lastH, lastL, lastC)
    const currentPrice = closes[closes.length - 1]

    setOhlcv(mockData)
    setIsOffline(true)
    setTechnicals({
      close: currentPrice,
      rsi: compute_indicators_client.rsi(closes),
      ma20: compute_indicators_client.ma(closes, 20),
      ma50: compute_indicators_client.ma(closes, 50),
      ma200: compute_indicators_client.ma(closes, 200),
      trend: (() => {
        const ma20 = compute_indicators_client.ma(closes, 20)
        const ma50 = compute_indicators_client.ma(closes, 50)
        if (ma20 && ma50) return ma20 > ma50 ? 'uptrend' : 'downtrend'
        return 'sideways'
      })(),
      macd: null, macd_signal: null, macd_hist: null,
      bb_upper: null, bb_lower: null, bb_mid: null,
      volume_avg20: null, atr: null,
    })
    setInfo({
      ticker: ticker.toUpperCase(),
      company_name: ticker.toUpperCase(),
      industry: 'N/A (offline)',
      pe: null, pb: null, roe: null, roa: null, eps: null, market_cap: null,
    })
    setSr({
      current_price: currentPrice,
      pivot_points: { pivot: pivots.PP, r1: pivots.R1, r2: pivots.R2, s1: pivots.S1, s2: pivots.S2 },
      supports: [pivots.S1, pivots.S2].filter(Boolean),
      resistances: [pivots.R1, pivots.R2].filter(Boolean),
      swing_highs: [], swing_lows: [], volume_zones: [],
    })
    setNews([])
  }

  const fetchOHLCV = useCallback(async (ticker: string, period = '3mo') => {
    setLoading(true)
    try {
      const data = await stockApi.getOHLCV(ticker, period)
      setOhlcv(data)
      return data
    } catch {
      const days = period === '1mo' ? 30 : period === '6mo' ? 180 : 90
      const mock = enrichOHLCV(generateMockOHLCV(ticker, days))
      setOhlcv(mock)
      return mock
    } finally {
      setLoading(false)
    }
  }, [])

  return { ohlcv, info, technicals, sr, news, loading, isOffline, backendOk, fetchAll, fetchOHLCV }
}

export default useStockData
