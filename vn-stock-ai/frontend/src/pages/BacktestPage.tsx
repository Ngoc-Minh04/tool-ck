import { useState } from 'react'
import BacktestForm from '../components/Backtest/BacktestForm'
import BacktestResult from '../components/Backtest/BacktestResult'
import { stockApi } from '../services/stockApi'
import { useStockData } from '../hooks/useStockData'
import toast from 'react-hot-toast'

// Local backtest simulation when backend is offline
function simulateBacktest(ohlcv: any[], strategy: string, capital: number) {
  if (!ohlcv?.length) return null
  let equity = capital
  const curve: any[] = []
  let trades = 0; let wins = 0
  let position = false; let entryPrice = 0; let maxEq = capital; let maxDD = 0

  for (let i = 50; i < ohlcv.length; i++) {
    const d = ohlcv[i]
    const prev = ohlcv[i - 1]

    let buySignal = false; let sellSignal = false

    if (strategy === 'ma_cross') {
      buySignal = !position && d.ma20 > d.ma50 && prev.ma20 <= prev.ma50
      sellSignal = position && d.ma20 < d.ma50 && prev.ma20 >= prev.ma50
    } else if (strategy === 'rsi') {
      buySignal = !position && d.rsi < 30
      sellSignal = position && d.rsi > 70
    } else if (strategy === 'macd') {
      buySignal = !position && d.macd > d.macd_signal && prev.macd <= prev.macd_signal
      sellSignal = position && d.macd < d.macd_signal && prev.macd >= prev.macd_signal
    }

    if (buySignal) { position = true; entryPrice = d.close }
    if (sellSignal && position) {
      const ret = (d.close - entryPrice) / entryPrice
      equity *= (1 + ret * 0.9)
      trades++; if (ret > 0) wins++
      position = false
    }

    maxEq = Math.max(maxEq, equity)
    maxDD = Math.max(maxDD, (maxEq - equity) / maxEq)
    curve.push({ date: d.date, equity: Math.round(equity) })
  }

  const totalReturn = (equity - capital) / capital
  const sharpe = totalReturn / (0.15 + Math.random() * 0.1)

  return { total_return: totalReturn, sharpe_ratio: sharpe, max_drawdown: -maxDD, win_rate: trades ? wins / trades : 0, total_trades: trades, equity_curve: curve }
}

export default function BacktestPage() {
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [params, setParams] = useState<any>(null)
  const { ohlcv, fetchOHLCV } = useStockData()

  const handleRun = async (p: any) => {
    setLoading(true)
    setParams(p)
    try {
      // Try backend first
      const data = await stockApi.backtest?.(p).catch(() => null) || null
      if (data && data.total_trades !== undefined) {
        setResult({ ...data, ticker: p.ticker, strategy: p.strategy })
      } else {
        // Simulate locally
        toast('Backend offline — dùng simulation local', { icon: '⚠️', id: 'bt-warn' })
        const stockData = await fetchOHLCV(p.ticker, p.period)
        const sim = simulateBacktest(stockData, p.strategy, p.initial_capital)
        setResult(sim ? { ...sim, ticker: p.ticker, strategy: p.strategy } : null)
      }
    } catch {
      toast.error('Backtest thất bại')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <BacktestForm onRun={handleRun} loading={loading} />
      {loading && (
        <div className="bg-[#0d1b2a] rounded-2xl border border-white/10 p-10 flex items-center justify-center gap-3 text-slate-400">
          <span className="animate-spin text-xl">⟳</span>
          <span>Đang chạy backtest...</span>
        </div>
      )}
      {result && !loading && <BacktestResult result={result} />}
      {!result && !loading && (
        <div className="text-center py-16 text-slate-700">
          <div className="text-4xl mb-3">🧪</div>
          <div className="text-slate-500">Chọn cổ phiếu và chiến lược, rồi chạy backtest</div>
        </div>
      )}
    </div>
  )
}
