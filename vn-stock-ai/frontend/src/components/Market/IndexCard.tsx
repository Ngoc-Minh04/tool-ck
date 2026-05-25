import { motion } from 'framer-motion'

interface Props {
  index: string
  close: number
  change: number
  change_pct: number
  advance?: number
  decline?: number
  unchanged?: number
  volume?: number
}

export default function IndexCard({ index, close, change, change_pct, advance, decline, unchanged }: Props) {
  const up = Number(change_pct) >= 0
  const pct = Number(change_pct)
  const barTotal = (advance || 0) + (decline || 0) + (unchanged || 0)
  const advPct = barTotal ? ((advance || 0) / barTotal) * 100 : 0
  const decPct = barTotal ? ((decline || 0) / barTotal) * 100 : 0

  return (
    <motion.div whileHover={{ scale: 1.02 }} transition={{ type: 'spring', stiffness: 300 }}
      className="bg-[#0d1b2a] border border-white/10 rounded-2xl p-4 hover:border-cyan-500/30 transition-colors">
      {/* Index name */}
      <div className="flex justify-between items-start mb-3">
        <div>
          <div className="text-xs text-slate-500 font-medium">{index}</div>
          <div className="text-xl font-bold font-mono text-white mt-0.5">
            {Number(close).toLocaleString('vi-VN', { minimumFractionDigits: 2 })}
          </div>
        </div>
        <div className={`text-right`}>
          <div className={`text-sm font-bold ${up ? 'text-green-400' : 'text-red-400'}`}>
            {up ? '+' : ''}{pct.toFixed(2)}%
          </div>
          <div className={`text-xs ${up ? 'text-green-400/70' : 'text-red-400/70'}`}>
            {up ? '▲' : '▼'} {Math.abs(Number(change)).toFixed(2)}
          </div>
        </div>
      </div>

      {/* Advance/Decline bar */}
      {barTotal > 0 && (
        <div>
          <div className="flex rounded-full overflow-hidden h-1.5 mb-1.5">
            <div style={{ width: `${advPct}%` }} className="bg-green-500" />
            <div style={{ width: `${100 - advPct - decPct}%` }} className="bg-slate-600" />
            <div style={{ width: `${decPct}%` }} className="bg-red-500" />
          </div>
          <div className="flex justify-between text-xs text-slate-600">
            <span className="text-green-400/70">▲{advance}</span>
            <span className="text-slate-600">{unchanged}</span>
            <span className="text-red-400/70">▼{decline}</span>
          </div>
        </div>
      )}
    </motion.div>
  )
}
