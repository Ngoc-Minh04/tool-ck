import { useState } from 'react'
import { motion } from 'framer-motion'

const STRATEGIES = [
  { value: 'ma_cross', label: 'MA Cross (20/50)', desc: 'Giao nhau MA20 và MA50' },
  { value: 'rsi', label: 'RSI Mean Reversion', desc: 'Mua RSI<30, bán RSI>70' },
  { value: 'macd', label: 'MACD Signal', desc: 'Mua khi MACD cắt Signal lên' },
]
const PERIODS = ['6mo', '1y', '2y', '3y']

interface Props { onRun: (params: any) => void; loading: boolean }

export default function BacktestForm({ onRun, loading }: Props) {
  const [ticker, setTicker] = useState('VCB')
  const [strategy, setStrategy] = useState('ma_cross')
  const [period, setPeriod] = useState('1y')
  const [capital, setCapital] = useState('100000000')

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    onRun({ ticker: ticker.toUpperCase(), strategy, period, initial_capital: Number(capital) })
  }

  return (
    <form onSubmit={submit} className="bg-[#0d1b2a] rounded-2xl border border-white/10 p-5 space-y-4">
      <div className="text-sm font-semibold text-white">⚙️ Cấu hình Backtest</div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-slate-500 mb-1 block">Mã CK</label>
          <input value={ticker} onChange={e => setTicker(e.target.value.toUpperCase())} placeholder="VCB"
            className="w-full bg-[#050d17] border border-white/15 rounded-lg px-3 py-2 text-white text-sm font-mono
              focus:outline-none focus:border-cyan-500/50 transition" />
        </div>
        <div>
          <label className="text-xs text-slate-500 mb-1 block">Khoảng thời gian</label>
          <select value={period} onChange={e => setPeriod(e.target.value)}
            className="w-full bg-[#050d17] border border-white/15 rounded-lg px-3 py-2 text-slate-300 text-sm
              focus:outline-none focus:border-cyan-500/50 transition">
            {PERIODS.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="text-xs text-slate-500 mb-2 block">Chiến lược</label>
        <div className="grid grid-cols-3 gap-2">
          {STRATEGIES.map(s => (
            <button key={s.value} type="button" onClick={() => setStrategy(s.value)}
              className={`p-3 rounded-xl border text-left transition-all
                ${strategy === s.value
                  ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-400'
                  : 'bg-white/3 border-white/10 text-slate-400 hover:border-white/20'}`}>
              <div className="text-xs font-semibold">{s.label}</div>
              <div className="text-xs opacity-60 mt-0.5">{s.desc}</div>
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="text-xs text-slate-500 mb-1 block">Vốn ban đầu (VND)</label>
        <input type="number" value={capital} onChange={e => setCapital(e.target.value)}
          className="w-full bg-[#050d17] border border-white/15 rounded-lg px-3 py-2 text-white text-sm font-mono
            focus:outline-none focus:border-cyan-500/50 transition" />
      </div>
      <motion.button whileTap={{ scale: 0.97 }} type="submit" disabled={loading}
        className="w-full py-2.5 bg-violet-500 hover:bg-violet-400 disabled:bg-slate-700 disabled:text-slate-500
          text-white font-bold rounded-xl transition-all text-sm">
        {loading ? '⟳ Đang chạy backtest...' : '🧪 Chạy Backtest'}
      </motion.button>
    </form>
  )
}
