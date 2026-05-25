import { NavLink } from 'react-router-dom'
import { isMarketOpen } from '../../utils/formatters'
import { useWatchlist } from '../../store/watchlistStore'

const NAV = [
  { to: '/', icon: '📊', label: 'Phân tích', key: '1' },
  { to: '/market', icon: '🌐', label: 'Thị trường', key: '2' },
  { to: '/chat', icon: '💬', label: 'Chat AI', key: '3' },
  { to: '/backtest', icon: '🧪', label: 'Backtest', key: null },
  { to: '/history', icon: '📋', label: 'Lịch sử', key: '4' },
  { to: '/watchlist', icon: '⭐', label: 'Watchlist', key: '5' },
  { to: '/settings', icon: '⚙️', label: 'Cài đặt', key: '6' },
]

export default function Sidebar() {
  const open = isMarketOpen()
  const { items } = useWatchlist()

  return (
    <aside className="fixed left-0 top-0 h-screen w-56 bg-[#0a1628] border-r border-white/10 flex flex-col z-40">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/10">
        <div className="flex items-center gap-2">
          <span className="text-2xl">📈</span>
          <div>
            <div className="font-bold text-cyan-400 text-sm leading-tight">VN Stock AI</div>
            <div className="text-xs text-slate-500">Predictor v2.0</div>
          </div>
        </div>
        {/* Market status */}
        <div className={`mt-3 flex items-center gap-1.5 text-xs px-2 py-1 rounded-full w-fit
          ${open ? 'bg-green-500/15 text-green-400' : 'bg-slate-700/50 text-slate-400'}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${open ? 'bg-green-400 animate-pulse' : 'bg-slate-500'}`} />
          {open ? 'Thị trường mở' : 'Thị trường đóng'}
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {NAV.map(({ to, icon, label, key }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150
              ${isActive
                ? 'bg-cyan-500/20 text-cyan-400 font-medium border border-cyan-500/30'
                : 'text-slate-400 hover:bg-white/5 hover:text-white'}`
            }
          >
            <span className="text-base">{icon}</span>
            <span className="flex-1">{label}</span>
            {/* Watchlist count badge */}
            {to === '/watchlist' && items.length > 0 && (
              <span style={{
                background: 'rgba(251,191,36,0.2)', color: '#fbbf24',
                fontSize: 10, fontWeight: 700,
                padding: '1px 6px', borderRadius: 10,
                border: '1px solid rgba(251,191,36,0.3)',
              }}>
                {items.length}
              </span>
            )}
            {/* Keyboard shortcut hint */}
            {key && (
              <span className="text-[10px] text-slate-600 font-mono">{key}</span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-white/10 text-xs text-slate-600 text-center">
        vnstock v4 · Claude AI
      </div>
    </aside>
  )
}
