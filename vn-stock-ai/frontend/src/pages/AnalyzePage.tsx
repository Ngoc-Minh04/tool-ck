import { useState } from 'react'
import TickerForm from '../components/Analysis/TickerForm'
import ResultCard from '../components/Analysis/ResultCard'
import MetricsRow from '../components/Analysis/MetricsRow'
import CandlestickChart from '../components/Chart/CandlestickChart'
import IndicatorPanel from '../components/Chart/IndicatorPanel'
import TimeframeSelector from '../components/Chart/TimeframeSelector'
import SourcePills from '../components/UI/SourcePills'
import Disclaimer from '../components/UI/Disclaimer'
import { CardSkeleton, ChartSkeleton } from '../components/UI/LoadingSkeleton'
import { useClaude } from '../hooks/useClaude'
import { useStockData } from '../hooks/useStockData'
import { useAppStore } from '../store/appStore'
import { STOCK_ANALYST_SYSTEM_PROMPT, buildAnalysisPrompt } from '../constants/prompts'
import toast from 'react-hot-toast'

export default function AnalyzePage() {
  const [ticker, setTicker] = useState('')
  const [period, setPeriod] = useState('3mo')
  const [result, setResult] = useState('')
  const [saved, setSaved] = useState(false)
  const { loading: aiLoading, streamContent, analyze, clearStream } = useClaude()
  const { ohlcv, info, technicals, loading: dataLoading, fetchAll } = useStockData()
  const { activeSources } = useAppStore()

  const loading = aiLoading || dataLoading

  const handleAnalyze = async (t: string, p: string, exchange: string) => {
    setTicker(t)
    setPeriod(p)
    setSaved(false)
    clearStream()
    setResult('')

    const data = await fetchAll(t, p)
    const tech = data?.technicals || {}
    const fund = data?.info || {}

    const userMsg = buildAnalysisPrompt(t, exchange, p, tech, fund, activeSources)
    const res = await analyze({ systemPrompt: STOCK_ANALYST_SYSTEM_PROMPT, userMessage: userMsg, stream: true })
    if (res) setResult(res)
  }

  const handlePeriodChange = (p: string) => {
    setPeriod(p)
    if (ticker) handleAnalyze(ticker, p, 'HOSE')
  }

  const handleCopyPrompt = () => {
    if (!ticker) return
    const userMsg = buildAnalysisPrompt(ticker, 'HOSE', period, technicals || {}, info || {}, activeSources)
    const fullPrompt = `Hãy đóng vai trò là một chuyên gia phân tích tài chính chứng khoán cao cấp. Dưới đây là dữ liệu giao dịch và thông tin cơ bản hiện tại của mã cổ phiếu ${ticker}. Hãy phân tích kỹ thuật và cơ bản, sau đó đưa ra nhận định xu hướng và khuyến nghị hành động mua/bán/theo dõi chi tiết.\n\n---\n\n${userMsg}`
    navigator.clipboard.writeText(fullPrompt)
    toast.success('Đã sao chép Prompt phân tích kèm dữ liệu thật! Hãy dán (Ctrl+V) vào Claude.ai hoặc ChatGPT.')
  }

  return (
    <div className="space-y-5 max-w-5xl mx-auto">
      <TickerForm onAnalyze={handleAnalyze} loading={loading} />
      <SourcePills />

      {(ticker || loading) && (
        <>
          {/* Timeframe and Copy Prompt */}
          {ticker && (
            <div className="flex flex-wrap items-center justify-between gap-3 bg-[#0d1b2a]/50 p-3 rounded-xl border border-white/5">
              <TimeframeSelector period={period} onPeriodChange={handlePeriodChange} />
              <button
                onClick={handleCopyPrompt}
                className="flex items-center gap-1.5 px-4 py-2 bg-cyan-500/10 hover:bg-cyan-500/25
                  text-cyan-400 hover:text-white border border-cyan-500/20 hover:border-cyan-500/40
                  rounded-xl text-xs font-semibold transition-all shadow-md active:scale-95"
              >
                📋 Sao chép Prompt phân tích (dán vào ChatGPT/Claude.ai)
              </button>
            </div>
          )}

          {/* Metrics row */}
          {(technicals || info) && !dataLoading && (
            <MetricsRow technicals={technicals} info={info} />
          )}

          {/* Chart */}
          {dataLoading ? <ChartSkeleton height={360} /> : ohlcv.length > 0 && (
            <div className="bg-[#0d1b2a] rounded-2xl border border-white/10 p-4 space-y-3">
              <div className="text-xs text-slate-500 font-medium">Biểu đồ giá · MA20/50/200 · Volume</div>
              <CandlestickChart data={ohlcv} height={340} />
              <IndicatorPanel data={ohlcv} />
            </div>
          )}

          {/* AI Result */}
          {(aiLoading || result) ? (
            <ResultCard
              ticker={ticker}
              content={aiLoading ? streamContent : result}
              streaming={aiLoading}
              technicals={technicals}
              info={info}
              onSave={() => setSaved(true)}
              saved={saved}
            />
          ) : dataLoading && <CardSkeleton />}

          <Disclaimer />
        </>
      )}

      {!ticker && !loading && (
        <div className="text-center py-20 text-slate-700">
          <div className="text-5xl mb-4">📊</div>
          <div className="text-lg font-medium text-slate-500">Nhập mã CK để bắt đầu phân tích</div>
          <div className="text-sm mt-1">AI sẽ phân tích kỹ thuật + cơ bản và đưa ra khuyến nghị</div>
        </div>
      )}
    </div>
  )
}
