import { useAppStore } from '../../store/appStore'

const ALL_SOURCES = [
  { key: 'fireant', label: 'FireAnt', icon: '🔥' },
  { key: 'ssi', label: 'SSI iBoard', icon: '📊' },
  { key: 'vietstock', label: 'VietStock', icon: '📈' },
  { key: 'cafef', label: 'CafeF', icon: '☕' },
  { key: 'tcbs', label: 'TCBS', icon: '💼' },
  { key: 'vndirect', label: 'VNDirect', icon: '🏦' },
]

export default function SourcePills() {
  const { activeSources, toggleSource } = useAppStore()
  return (
    <div className="flex flex-wrap gap-2">
      <span className="text-xs text-slate-600 self-center">Nguồn:</span>
      {ALL_SOURCES.map(s => {
        const active = activeSources.includes(s.key)
        return (
          <button key={s.key} onClick={() => toggleSource(s.key)}
            className={`flex items-center gap-1 px-2.5 py-1 text-xs rounded-full border transition-all
              ${active
                ? 'bg-cyan-500/15 text-cyan-400 border-cyan-500/35'
                : 'bg-white/4 text-slate-600 border-white/10 hover:border-white/20 hover:text-slate-400'}`}>
            <span>{s.icon}</span>{s.label}
          </button>
        )
      })}
    </div>
  )
}
