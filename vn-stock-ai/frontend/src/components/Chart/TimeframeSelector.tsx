const FRAMES = ['1D', '1W', '1M']
const PERIODS = [
  { label: '1T', value: '1mo' },
  { label: '3T', value: '3mo' },
  { label: '6T', value: '6mo' },
  { label: '1N', value: '1y' },
  { label: '3N', value: '3y' },
]

interface Props {
  period: string
  onPeriodChange: (p: string) => void
  interval?: string
  onIntervalChange?: (i: string) => void
}

export default function TimeframeSelector({ period, onPeriodChange, interval = '1D', onIntervalChange }: Props) {
  return (
    <div className="flex items-center gap-4">
      <div className="flex gap-1 bg-white/5 rounded-lg p-1">
        {PERIODS.map(p => (
          <button key={p.value} onClick={() => onPeriodChange(p.value)}
            className={`px-3 py-1 text-xs rounded-md transition-all font-medium
              ${period === p.value
                ? 'bg-cyan-500 text-[#050d17]'
                : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
            {p.label}
          </button>
        ))}
      </div>
      {onIntervalChange && (
        <div className="flex gap-1 bg-white/5 rounded-lg p-1">
          {FRAMES.map(f => (
            <button key={f} onClick={() => onIntervalChange(f)}
              className={`px-2.5 py-1 text-xs rounded-md transition-all
                ${interval === f
                  ? 'bg-white/15 text-white'
                  : 'text-slate-500 hover:text-slate-300'}`}>
              {f}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
