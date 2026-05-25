import { useLocation } from 'react-router-dom'
import { useAppStore } from '../../store/appStore'

const PAGE_TITLES: Record<string, { title: string; sub: string }> = {
  '/': { title: 'Phân tích cổ phiếu', sub: 'AI-powered · vnstock3 data' },
  '/market': { title: 'Tổng quan thị trường', sub: 'VNINDEX · VN30 · HNX · UPCOM' },
  '/chat': { title: 'Chat với AI', sub: 'Claude Sonnet 4.5' },
  '/backtest': { title: 'Backtest chiến lược', sub: 'MA Cross · RSI · MACD' },
  '/history': { title: 'Lịch sử phân tích', sub: 'Tất cả phân tích đã thực hiện' },
  '/settings': { title: 'Cài đặt', sub: 'API Keys · Thông báo · Giao diện' },
}

export default function Header() {
  const { pathname } = useLocation()
  const { backendStatus } = useAppStore()
  const page = PAGE_TITLES[pathname] || { title: pathname, sub: '' }

  return (
    <header className="fixed top-0 left-56 right-0 h-14 bg-[#0a1628]/80 backdrop-blur border-b border-white/10 z-30 flex items-center justify-between px-6">
      <div>
        <h1 className="text-white font-semibold text-sm leading-tight">{page.title}</h1>
        <p className="text-slate-500 text-xs">{page.sub}</p>
      </div>
      <div className="flex items-center gap-3">
        {/* Backend status */}
        <div className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border
          ${backendStatus === 'online'
            ? 'bg-green-500/10 text-green-400 border-green-500/20'
            : backendStatus === 'offline'
            ? 'bg-red-500/10 text-red-400 border-red-500/20'
            : 'bg-slate-700/50 text-slate-500 border-slate-700'}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${
            backendStatus === 'online' ? 'bg-green-400 animate-pulse'
            : backendStatus === 'offline' ? 'bg-red-400'
            : 'bg-slate-500'}`} />
          {backendStatus === 'online' ? 'Backend Online'
            : backendStatus === 'offline' ? 'Mock Data'
            : 'Kiểm tra...'}
        </div>
        <span className="text-slate-700 text-xs">VN Stock AI v2</span>
      </div>
    </header>
  )
}
