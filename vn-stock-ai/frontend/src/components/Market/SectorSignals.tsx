const SECTORS = [
  { name: 'Ngân hàng', tickers: ['VCB', 'BID', 'CTG', 'ACB', 'MBB'], color: '#4fc3f7' },
  { name: 'Thép', tickers: ['HPG', 'HSG', 'NKG'], color: '#f59e0b' },
  { name: 'Bất động sản', tickers: ['VHM', 'VIC', 'KDH', 'DXG'], color: '#a78bfa' },
  { name: 'Chứng khoán', tickers: ['SSI', 'HCM', 'VIX', 'VND'], color: '#22c55e' },
  { name: 'Công nghệ', tickers: ['FPT', 'CMG'], color: '#38bdf8' },
  { name: 'Dầu khí', tickers: ['GAS', 'PLX', 'PVD'], color: '#fb923c' },
]

function mockSectorChange(name: string): number {
  const seed = name.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  return parseFloat(((((seed * 9301 + 49297) % 233280) / 233280) * 6 - 3).toFixed(2))
}

export default function SectorSignals() {
  return (
    <div className="bg-[#0d1b2a] rounded-xl border border-white/10 p-4">
      <div className="text-sm font-semibold text-white mb-3">📊 Tín hiệu nhóm ngành</div>
      <div className="space-y-2">
        {SECTORS.map(s => {
          const chg = mockSectorChange(s.name)
          const up = chg >= 0
          const pct = Math.abs(chg)
          return (
            <div key={s.name} className="flex items-center gap-3">
              <div className="w-24 text-xs text-slate-400 shrink-0">{s.name}</div>
              <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${up ? 'bg-green-400' : 'bg-red-400'}`}
                  style={{ width: `${Math.min(pct * 15, 100)}%`, marginLeft: up ? 0 : undefined }}
                />
              </div>
              <div className={`text-xs font-mono w-14 text-right font-semibold ${up ? 'text-green-400' : 'text-red-400'}`}>
                {up ? '+' : '-'}{pct.toFixed(2)}%
              </div>
              <div className="flex gap-1">
                {s.tickers.slice(0, 3).map(t => (
                  <span key={t} className="text-xs font-mono px-1 py-0.5 rounded bg-white/5 text-slate-500">{t}</span>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
