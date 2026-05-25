import { useWatchlist } from '@/store/watchlistStore'

interface Props {
  ticker: string
  exchange?: string
}

export function WatchlistButton({ ticker, exchange = 'HOSE' }: Props) {
  const { has, add, remove } = useWatchlist()
  const watching = has(ticker)

  return (
    <button
      onClick={() => watching ? remove(ticker) : add(ticker, exchange)}
      title={watching ? 'Bỏ khỏi watchlist' : 'Thêm vào watchlist'}
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '6px 14px', borderRadius: 8, fontSize: 13,
        cursor: 'pointer', transition: 'all 0.2s',
        border: watching ? '1px solid rgba(251,191,36,0.4)' : '1px solid rgba(255,255,255,0.1)',
        background: watching ? 'rgba(251,191,36,0.1)' : 'rgba(255,255,255,0.05)',
        color: watching ? '#fbbf24' : '#94a3b8',
        fontWeight: 500,
      }}
    >
      {watching ? '★ Đang theo dõi' : '☆ Thêm watchlist'}
    </button>
  )
}
