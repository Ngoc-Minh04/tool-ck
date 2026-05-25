import { useWatchlist } from '@/store/watchlistStore'
import { useNavigate } from 'react-router-dom'

export default function WatchlistPage() {
  const { items, remove } = useWatchlist()
  const navigate = useNavigate()

  if (items.length === 0) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', height: '60vh', gap: 16, color: '#64748b',
      }}>
        <div style={{ fontSize: 52 }}>☆</div>
        <p style={{ fontSize: 14, margin: 0 }}>Chưa có mã nào trong watchlist</p>
        <button
          onClick={() => navigate('/')}
          style={{
            fontSize: 13, padding: '8px 20px',
            border: '1px solid rgba(79,195,247,0.3)', borderRadius: 8,
            cursor: 'pointer', background: 'transparent', color: '#4fc3f7',
          }}
        >
          Phân tích mã đầu tiên →
        </button>
      </div>
    )
  }

  return (
    <div style={{ padding: '24px', maxWidth: 800, margin: '0 auto' }}>
      <h1 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16, color: '#e2e8f0' }}>
        Watchlist ({items.length} mã)
      </h1>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {items.map(item => (
          <div
            key={item.ticker}
            onClick={() => navigate(`/?ticker=${item.ticker}`)}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '12px 16px',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 10, cursor: 'pointer',
              background: 'rgba(255,255,255,0.03)',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(79,195,247,0.05)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontWeight: 700, fontSize: 15, color: '#e2e8f0' }}>
                {item.ticker}
              </span>
              <span style={{ fontSize: 11, color: '#64748b', background: 'rgba(255,255,255,0.05)',
                padding: '2px 8px', borderRadius: 4 }}>
                {item.exchange}
              </span>
              {item.lastSignal && (
                <span style={{
                  fontSize: 11, padding: '2px 10px', borderRadius: 20, fontWeight: 600,
                  background: item.lastSignal === 'BUY' ? 'rgba(34,197,94,0.15)' :
                    item.lastSignal === 'SELL' ? 'rgba(239,68,68,0.15)' : 'rgba(251,191,36,0.15)',
                  color: item.lastSignal === 'BUY' ? '#22c55e' :
                    item.lastSignal === 'SELL' ? '#ef4444' : '#fbbf24',
                }}>
                  {item.lastSignal}
                </span>
              )}
              {item.note && (
                <span style={{ fontSize: 12, color: '#64748b' }}>{item.note}</span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 11, color: '#475569' }}>
                {new Date(item.addedAt).toLocaleDateString('vi-VN')}
              </span>
              <button
                onClick={e => { e.stopPropagation(); remove(item.ticker) }}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: 16, color: '#475569', padding: '2px 6px',
                  borderRadius: 4, lineHeight: 1, transition: 'color 0.2s',
                }}
                onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')}
                onMouseLeave={e => (e.currentTarget.style.color = '#475569')}
              >
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
