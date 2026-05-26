// ===== SIDEBAR COMPONENT =====

import { NavLink, useLocation } from 'react-router-dom';
import {
  BarChart2, MessageSquare, History, Settings, TrendingUp,
  ChevronLeft, ChevronRight, Activity, Star, SlidersHorizontal
} from 'lucide-react';
import useAppStore from '../../store/appStore';
import useWatchlist from '../../store/watchlistStore';

const NAV_ITEMS = [
  { path: '/analyze',  icon: BarChart2,            label: 'Phân tích CK',    badge: null },
  { path: '/market',   icon: TrendingUp,           label: 'Thị trường',      badge: 'LIVE' },
  { path: '/screener', icon: SlidersHorizontal,    label: 'Screener',         badge: null },
  { path: '/chat',     icon: MessageSquare,        label: 'Chat với AI',     badge: null },
  { path: '/history',  icon: History,              label: 'Lịch sử',          badge: null },
  { path: '/watchlist',icon: Star,                 label: 'Watchlist',        badge: null },
  { path: '/settings', icon: Settings,             label: 'Cài đặt',          badge: null },
];

const Sidebar = () => {
  const sidebarOpen = useAppStore((s) => s.sidebarOpen);
  const toggleSidebar = useAppStore((s) => s.toggleSidebar);
  const history = useAppStore((s) => s.history);
  const watchlistLength = useWatchlist((s) => s.items.length);

  return (
    <aside
      className="flex flex-col transition-all duration-300 relative"
      style={{
        width: sidebarOpen ? 220 : 64,
        background: 'linear-gradient(180deg, #0f2035 0%, #0d1b2a 100%)',
        borderRight: '1px solid rgba(79, 195, 247, 0.1)',
        minHeight: '100vh',
        flexShrink: 0,
      }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5" style={{ borderBottom: '1px solid rgba(79,195,247,0.1)' }}>
        <div
          className="flex items-center justify-center rounded-lg flex-shrink-0"
          style={{ width: 32, height: 32, background: 'linear-gradient(135deg, #1a3a5c, #4fc3f7)', boxShadow: '0 0 12px rgba(79,195,247,0.4)' }}
        >
          <Activity size={18} color="#fff" />
        </div>
        {sidebarOpen && (
          <div className="overflow-hidden">
            <div className="text-sm font-bold gradient-text whitespace-nowrap">VN Stock AI</div>
            <div className="text-xs text-slate-500">Claude Analyzer</div>
          </div>
        )}
      </div>

      {/* Nav Items */}
      <nav className="flex-1 py-4 px-2 space-y-1">
        {NAV_ITEMS.map(({ path, icon: Icon, label, badge }) => (
          <NavLink
            key={path}
            to={path}
            className={({ isActive }) =>
              `sidebar-item ${isActive ? 'active' : ''} ${!sidebarOpen ? 'justify-center' : ''}`
            }
            title={!sidebarOpen ? label : undefined}
          >
            <Icon size={18} className="flex-shrink-0" />
            {sidebarOpen && (
              <span className="flex-1 whitespace-nowrap overflow-hidden text-ellipsis">{label}</span>
            )}
            {sidebarOpen && badge && (
              <span
                className="text-xs font-bold px-1.5 py-0.5 rounded animate-pulse-cyan"
                style={{ background: 'rgba(79,195,247,0.15)', color: '#4fc3f7', fontSize: '9px' }}
              >
                {badge}
              </span>
            )}
            {path === '/history' && sidebarOpen && history.length > 0 && (
              <span
                className="text-xs font-bold rounded-full flex items-center justify-center"
                style={{ background: '#1a3a5c', color: '#4fc3f7', minWidth: 20, height: 20, fontSize: '10px' }}
              >
                {history.length > 99 ? '99+' : history.length}
              </span>
            )}
            {path === '/watchlist' && sidebarOpen && watchlistLength > 0 && (
              <span
                className="text-xs font-bold rounded-full flex items-center justify-center"
                style={{ background: 'rgba(255,179,0,0.1)', color: '#ffb300', minWidth: 20, height: 20, fontSize: '10px', border: '1px solid rgba(255,179,0,0.2)' }}
              >
                {watchlistLength}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Version */}
      {sidebarOpen && (
        <div className="px-4 py-3 text-xs text-slate-600">
          v1.0.0 · Claude Powered
        </div>
      )}

      {/* Toggle Button */}
      <button
        onClick={toggleSidebar}
        className="absolute -right-3 top-20 flex items-center justify-center rounded-full cursor-pointer border-none"
        style={{
          width: 24,
          height: 24,
          background: '#1a3a5c',
          border: '1px solid rgba(79,195,247,0.3)',
          color: '#4fc3f7',
          zIndex: 10,
        }}
      >
        {sidebarOpen ? <ChevronLeft size={12} /> : <ChevronRight size={12} />}
      </button>
    </aside>
  );
};

export default Sidebar;
