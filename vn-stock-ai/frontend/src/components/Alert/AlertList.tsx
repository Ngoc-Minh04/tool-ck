interface Alert { id: string; ticker: string; condition: string; price: number; note?: string; triggered?: boolean; created_at?: string }
interface Props { alerts: Alert[]; onDelete: (id: string) => void }

export default function AlertList({ alerts, onDelete }: Props) {
  if (!alerts.length) return (
    <div className="bg-[#0d1b2a] rounded-2xl border border-white/10 p-8 text-center text-slate-600 text-sm">
      Chưa có alert nào. Tạo cảnh báo giá ở trên.
    </div>
  )
  return (
    <div className="bg-[#0d1b2a] rounded-2xl border border-white/10 overflow-hidden">
      <div className="px-4 py-3 border-b border-white/10 text-xs text-slate-500 font-medium">
        {alerts.length} alert đang hoạt động
      </div>
      <div className="divide-y divide-white/5">
        {alerts.map(a => (
          <div key={a.id} className={`flex items-center justify-between px-4 py-3 ${a.triggered ? 'opacity-50' : ''}`}>
            <div className="flex items-center gap-3">
              <span className="font-mono font-bold text-cyan-400">{a.ticker}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full border
                ${a.condition === 'above'
                  ? 'text-green-400 bg-green-500/10 border-green-500/25'
                  : 'text-red-400 bg-red-500/10 border-red-500/25'}`}>
                {a.condition === 'above' ? '↑ trên' : '↓ dưới'}
              </span>
              <span className="font-mono text-sm text-white">{a.price.toLocaleString('vi-VN')}</span>
              {a.note && <span className="text-xs text-slate-600">— {a.note}</span>}
            </div>
            <div className="flex items-center gap-2">
              {a.triggered && <span className="text-xs text-yellow-400 bg-yellow-500/10 px-2 py-0.5 rounded-full border border-yellow-500/25">Đã kích hoạt</span>}
              <button onClick={() => onDelete(a.id)}
                className="text-xs px-2.5 py-1 text-slate-500 hover:text-red-400 bg-white/5 hover:bg-red-500/10
                  border border-white/10 hover:border-red-500/25 rounded-lg transition-all">
                🗑
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
