interface MoverItem { ticker: string; price?: number; close?: number; change_pct: number; volume: number }
interface Props { movers: { gainers?: MoverItem[]; losers?: MoverItem[]; volume?: MoverItem[]; top_gain?: MoverItem[]; top_loss?: MoverItem[]; top_volume?: MoverItem[] } | null }

function MoverRow({ item, type }: { item: MoverItem; type: 'gain' | 'loss' | 'vol' }) {
  const price = item.close || item.price || 0
  const pct = Number(item.change_pct)
  const isGain = type === 'gain'
  return (
    <div className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
      <div className="flex items-center gap-2">
        <span className="font-mono font-bold text-sm text-white">{item.ticker}</span>
        <span className="text-xs text-slate-500">{price.toLocaleString('vi-VN')}</span>
      </div>
      <div className="text-right">
        <div className={`text-sm font-bold ${pct >= 0 ? 'text-green-400' : 'text-red-400'}`}>
          {pct >= 0 ? '+' : ''}{pct.toFixed(2)}%
        </div>
        <div className="text-xs text-slate-600">{(item.volume / 1e6).toFixed(1)}M</div>
      </div>
    </div>
  )
}

export default function TopMovers({ movers }: Props) {
  if (!movers) return <div className="text-slate-600 text-sm text-center py-8">Đang tải...</div>
  const gainers = movers.gainers || movers.top_gain || []
  const losers = movers.losers || movers.top_loss || []
  const vols = movers.volume || movers.top_volume || []

  return (
    <div className="grid grid-cols-3 gap-4">
      <div className="bg-[#0d1b2a] rounded-xl border border-white/10 p-4">
        <div className="text-xs font-semibold text-green-400 mb-3 flex items-center gap-1">
          <span>▲</span> Top tăng
        </div>
        {gainers.map((item, i) => <MoverRow key={i} item={item} type="gain" />)}
      </div>
      <div className="bg-[#0d1b2a] rounded-xl border border-white/10 p-4">
        <div className="text-xs font-semibold text-red-400 mb-3 flex items-center gap-1">
          <span>▼</span> Top giảm
        </div>
        {losers.map((item, i) => <MoverRow key={i} item={item} type="loss" />)}
      </div>
      <div className="bg-[#0d1b2a] rounded-xl border border-white/10 p-4">
        <div className="text-xs font-semibold text-cyan-400 mb-3 flex items-center gap-1">
          <span>📊</span> Top khối lượng
        </div>
        {vols.map((item, i) => <MoverRow key={i} item={item} type="vol" />)}
      </div>
    </div>
  )
}
