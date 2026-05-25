import { useState } from 'react'
import { motion } from 'framer-motion'

const PERIODS = ['1mo', '3mo', '6mo', '1y', '3y']
const EXCHANGES = ['HOSE', 'HNX', 'UPCOM']
const POPULAR = ['VCB', 'BID', 'CTG', 'ACB', 'MBB', 'TCB', 'HPG', 'FPT', 'VNM', 'VIC', 'SSI', 'GAS']

interface Props {
  onAnalyze: (ticker: string, period: string, exchange: string) => void
  loading: boolean
}

export default function TickerForm({ onAnalyze, loading }: Props) {
  const [ticker, setTicker] = useState('')
  const [period, setPeriod] = useState('3mo')
  const [exchange, setExchange] = useState('HOSE')

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (ticker.trim()) onAnalyze(ticker.trim().toUpperCase(), period, exchange)
  }

  return (
    <div className="bg-[#0d1b2a] rounded-2xl border border-white/10 p-5">
      <form onSubmit={submit} className="flex flex-col gap-4">
        <div className="flex gap-3">
          {/* Ticker input */}
          <div className="flex-1 relative">
            <input
              value={ticker}
              onChange={e => setTicker(e.target.value.toUpperCase())}
              placeholder="Nhập mã CK... VCB, HPG, FPT"
              maxLength={10}
              className="w-full bg-[#050d17] border border-white/15 rounded-xl px-4 py-3 text-white text-lg font-mono tracking-wider
                placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 transition"
            />
          </div>
          {/* Period select */}
          <select
            value={period}
            onChange={e => setPeriod(e.target.value)}
            className="bg-[#050d17] border border-white/15 rounded-xl px-3 py-3 text-slate-300 text-sm
              focus:outline-none focus:border-cyan-500/50 transition"
          >
            {PERIODS.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          {/* Exchange */}
          <select
            value={exchange}
            onChange={e => setExchange(e.target.value)}
            className="bg-[#050d17] border border-white/15 rounded-xl px-3 py-3 text-slate-300 text-sm
              focus:outline-none focus:border-cyan-500/50 transition"
          >
            {EXCHANGES.map(ex => <option key={ex} value={ex}>{ex}</option>)}
          </select>
          {/* Submit */}
          <motion.button
            whileTap={{ scale: 0.97 }}
            type="submit"
            disabled={loading || !ticker.trim()}
            className="px-6 py-3 bg-cyan-500 hover:bg-cyan-400 disabled:bg-slate-700 disabled:text-slate-500
              text-[#050d17] font-bold rounded-xl transition-all flex items-center gap-2 min-w-[120px] justify-center"
          >
            {loading ? (
              <><span className="animate-spin">⟳</span> Đang phân tích</>
            ) : '🔍 Phân tích'}
          </motion.button>
        </div>

        {/* Quick picks */}
        <div className="flex flex-wrap gap-2">
          <span className="text-xs text-slate-600 self-center">Phổ biến:</span>
          {POPULAR.map(t => (
            <button key={t} type="button"
              onClick={() => { setTicker(t); onAnalyze(t, period, exchange) }}
              className="px-2.5 py-1 text-xs bg-white/5 hover:bg-cyan-500/15 hover:text-cyan-400
                border border-white/10 hover:border-cyan-500/30 rounded-lg transition-all font-mono">
              {t}
            </button>
          ))}
        </div>
      </form>
    </div>
  )
}
