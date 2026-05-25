import React from 'react';
import useWatchlist from '../../store/watchlistStore';

export function WatchlistButton({ ticker, exchange = 'HOSE' }) {
  const { has, add, remove } = useWatchlist();
  const watching = has(ticker);

  const handleToggle = (e) => {
    e.stopPropagation();
    if (watching) {
      remove(ticker);
    } else {
      add(ticker, exchange);
    }
  };

  return (
    <button
      onClick={handleToggle}
      className="text-xs px-3 py-1.5 rounded-lg cursor-pointer transition-all duration-200 flex items-center gap-1.5 font-medium border-none"
      style={{
        background: watching ? 'rgba(255, 179, 0, 0.15)' : 'rgba(26, 47, 69, 0.8)',
        color: watching ? '#ffb300' : '#8892b0',
        border: `1px solid ${watching ? 'rgba(255, 179, 0, 0.35)' : 'rgba(79, 195, 247, 0.15)'}`,
        boxShadow: watching ? '0 0 10px rgba(255, 179, 0, 0.1)' : 'none',
      }}
      onMouseOver={(e) => {
        e.currentTarget.style.transform = 'translateY(-1px)';
        if (!watching) {
          e.currentTarget.style.color = '#4fc3f7';
          e.currentTarget.style.border = '1px solid rgba(79, 195, 247, 0.3)';
        }
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        if (!watching) {
          e.currentTarget.style.color = '#8892b0';
          e.currentTarget.style.border = '1px solid rgba(79, 195, 247, 0.15)';
        }
      }}
    >
      <span>{watching ? '★ Đang theo dõi' : '☆ Thêm watchlist'}</span>
    </button>
  );
}

export default WatchlistButton;
