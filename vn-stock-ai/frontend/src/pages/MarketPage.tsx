import IndexCard from '../components/Market/IndexCard'
import TopMovers from '../components/Market/TopMovers'
import ForeignFlow from '../components/Market/ForeignFlow'
import SectorSignals from '../components/Market/SectorSignals'
import { useMarket } from '../hooks/useMarket'
import { motion } from 'framer-motion'

export default function MarketPage() {
  const { indices, movers, foreign, loading, refresh } = useMarket()

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-white font-semibold">Tổng quan thị trường</h2>
          <p className="text-xs text-slate-500 mt-0.5">Dữ liệu tự động làm mới mỗi 60 giây</p>
        </div>
        <button onClick={refresh} disabled={loading}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-white/5 hover:bg-cyan-500/15
            border border-white/10 hover:border-cyan-500/30 text-slate-400 hover:text-cyan-400
            rounded-lg transition-all">
          <span className={loading ? 'animate-spin' : ''}>⟳</span>
          {loading ? 'Đang tải...' : 'Làm mới'}
        </button>
      </div>

      {/* Index Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {indices.length > 0 ? indices.map((idx, i) => (
          <motion.div key={idx.index || i} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}>
            <IndexCard
              index={idx.index}
              close={idx.close}
              change={idx.change}
              change_pct={idx.change_pct}
              advance={idx.advance}
              decline={idx.decline}
              unchanged={idx.unchanged}
            />
          </motion.div>
        )) : Array(4).fill(0).map((_, i) => (
          <div key={i} className="h-28 bg-[#0d1b2a] rounded-2xl border border-white/10 animate-pulse" />
        ))}
      </div>

      {/* Top Movers */}
      <div>
        <div className="text-sm font-semibold text-white mb-3">🚀 Top biến động</div>
        <TopMovers movers={movers} />
      </div>

      {/* Foreign + Sector */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ForeignFlow data={foreign} />
        <SectorSignals />
      </div>
    </div>
  )
}
