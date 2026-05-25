import { useState } from 'react'
import { useAppStore } from '../store/appStore'
import SignalBadge from '../components/Analysis/SignalBadge'
import { exportHistoryCSV } from '../utils/exportCsv'

export default function HistoryPage() {
  const { history, removeHistory, clearHistory } = useAppStore()
  const [search, setSearch] = useState('')
  const [sigFilter, setSigFilter] = useState('ALL')

  const filtered = history.filter(h => {
    const matchSearch = h.ticker.toLowerCase().includes(search.toLowerCase())
    const matchSig = sigFilter === 'ALL' || h.signal === sigFilter
    return matchSearch && matchSig
  })


  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-3 items-center">
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="🔍 Tìm theo mã CK..."
          className="bg-[#0d1b2a] border border-white/15 rounded-lg px-3 py-2 text-sm text-white
            placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/50 w-48" />
        <div className="flex gap-1">
          {['ALL', 'BUY', 'HOLD', 'SELL'].map(s => (
            <button key={s} onClick={() => setSigFilter(s)}
              className={`px-3 py-1.5 text-xs rounded-lg border transition-all
                ${sigFilter === s
                  ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/35'
                  : 'bg-white/5 text-slate-500 border-white/10 hover:border-white/20'}`}>
              {s}
            </button>
          ))}
        </div>
        <div className="flex-1" />
        <span className="text-xs text-slate-600">{filtered.length} kết quả</span>
        {filtered.length > 0 && (
          <button onClick={() => exportHistoryCSV(filtered)}
            className="text-xs px-3 py-1.5 bg-white/5 hover:bg-cyan-500/15 text-slate-400 hover:text-cyan-400
              border border-white/10 hover:border-cyan-500/30 rounded-lg transition-all">
            📥 Export CSV
          </button>
        )}
        {history.length > 0 && (
          <button onClick={clearHistory}
            className="text-xs px-3 py-1.5 text-slate-600 hover:text-red-400 bg-white/4 hover:bg-red-500/10
              border border-white/10 hover:border-red-500/25 rounded-lg transition-all">
            🗑 Xóa tất cả
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20 text-slate-700">
          <div className="text-4xl mb-3">📋</div>
          <div className="text-slate-500">{history.length === 0 ? 'Chưa có lịch sử phân tích' : 'Không tìm thấy kết quả'}</div>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((item, i) => (
            <div key={i} className="bg-[#0d1b2a] rounded-xl border border-white/10 p-4
              hover:border-white/20 transition-colors group">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="font-mono font-bold text-cyan-400 text-sm">{item.ticker}</span>
                  <SignalBadge signal={item.signal} size="sm" />
                  <span className="text-xs text-slate-600">
                    {new Date(item.timestamp).toLocaleString('vi-VN')}
                  </span>
                </div>
                <button onClick={() => removeHistory(i)}
                  className="opacity-0 group-hover:opacity-100 text-xs text-slate-700 hover:text-red-400
                    transition-all px-2 py-1 rounded-lg hover:bg-red-500/10">
                  ✕
                </button>
              </div>
              <p className="text-xs text-slate-500 mt-2 line-clamp-3 leading-relaxed">
                {item.content.replace(/[#*_`>]/g, '').slice(0, 300)}...
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
