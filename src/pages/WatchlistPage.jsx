// ===== TRANG WATCHLIST VỚI GIÁ REALTIME =====

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash2, TrendingUp, TrendingDown, AlertCircle, ArrowRight, RefreshCw, Activity, Plus, Eye } from 'lucide-react';
import useWatchlist from '../store/watchlistStore';
import Header from '../components/Layout/Header';
import { stockApi } from '../services/stockApi';

const POLL_INTERVAL = 1500; // 1.5 giây

const PriceBadge = ({ price, changePct }) => {
  if (!price) return (
    <span className="text-xs text-slate-600 font-mono">– – –</span>
  );
  const isUp = changePct >= 0;
  const color = changePct === 0 ? '#f59e0b' : isUp ? '#4ade80' : '#f87171';
  const bg = changePct === 0 ? 'rgba(245,158,11,0.1)' : isUp ? 'rgba(74,222,128,0.1)' : 'rgba(248,113,113,0.1)';

  return (
    <div className="text-right">
      <div className="text-base font-bold font-num" style={{ color }}>
        {(price / 1000).toFixed(1)}
      </div>
      <div
        className="text-xs px-1.5 py-0.5 rounded-full font-semibold font-num inline-flex items-center gap-0.5 mt-0.5"
        style={{ color, background: bg }}
      >
        {isUp ? '▲' : '▼'} {Math.abs(changePct).toFixed(2)}%
      </div>
    </div>
  );
};

const SignalPill = ({ signal }) => {
  if (!signal) return (
    <span className="text-xs px-2 py-0.5 rounded-full text-slate-500 bg-slate-800/50 border border-slate-700/50">
      Chưa phân tích
    </span>
  );
  const cfg = {
    BUY:  { color: '#4ade80', bg: 'rgba(74,222,128,0.1)',  icon: '📈' },
    HOLD: { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',  icon: '⏸️' },
    SELL: { color: '#f87171', bg: 'rgba(248,113,113,0.1)', icon: '📉' },
  }[signal] || { color: '#94a3b8', bg: 'rgba(148,163,184,0.1)', icon: '–' };

  return (
    <span
      className="text-xs px-2.5 py-1 rounded-full font-bold uppercase"
      style={{ color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.color}30` }}
    >
      {cfg.icon} {signal}
    </span>
  );
};

export default function WatchlistPage() {
  const { items, remove } = useWatchlist();
  const navigate = useNavigate();

  const [quotes, setQuotes] = useState({}); // { TICKER: { price, changePct, volume } }
  const [loadingQuotes, setLoadingQuotes] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const intervalRef = useRef(null);

  const fetchQuotes = useCallback(async () => {
    if (!items.length) return;
    setLoadingQuotes(true);
    try {
      const tickers = items.map(i => i.ticker).join(',');
      const data = await stockApi.getQuickQuotes(tickers);
      const map = {};
      (data || []).forEach(q => {
        map[q.ticker] = {
          price: q.close || q.price || 0,
          changePct: q.change_pct ?? 0,
          volume: q.volume ?? 0,
          isLive: q.is_live ?? false,
        };
      });
      setQuotes(map);
      setLastUpdated(new Date());
    } catch (e) {
      console.warn('Watchlist quote fetch failed', e);
    } finally {
      setLoadingQuotes(false);
    }
  }, [items]);

  // Poll mỗi 15 giây
  useEffect(() => {
    fetchQuotes();
    intervalRef.current = setInterval(fetchQuotes, POLL_INTERVAL);
    return () => clearInterval(intervalRef.current);
  }, [fetchQuotes]);

  const handleRowClick = (item) => {
    navigate(`/analyze?ticker=${item.ticker}&exchange=${item.exchange}&autorun=1`);
  };

  const handleRemove = (e, ticker) => {
    e.stopPropagation();
    remove(ticker);
  };

  const fmtVol = (v) => {
    if (!v) return '–';
    if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
    if (v >= 1e3) return `${(v / 1e3).toFixed(0)}K`;
    return String(v);
  };

  const fmtTime = (d) => d?.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  // Summary stats
  const gainers = items.filter(i => (quotes[i.ticker]?.changePct ?? 0) > 0).length;
  const losers  = items.filter(i => (quotes[i.ticker]?.changePct ?? 0) < 0).length;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title="Danh sách theo dõi" />

      <div className="flex-1 overflow-y-auto p-6">
        {items.length === 0 ? (
          <div
            className="glass-card p-12 text-center max-w-lg mx-auto mt-12 animate-fade-in-up"
            style={{ border: '1px solid rgba(79,195,247,0.1)' }}
          >
            <div className="text-6xl mb-4">⭐</div>
            <h3 className="text-lg font-bold text-slate-200 mb-2">Chưa có mã nào trong watchlist</h3>
            <p className="text-sm text-slate-500 mb-6">
              Thêm cổ phiếu vào danh sách để theo dõi giá realtime và tín hiệu AI.
            </p>
            <button
              onClick={() => navigate('/analyze')}
              className="px-5 py-2.5 rounded-lg bg-cyan-500 text-slate-900 font-semibold cursor-pointer text-sm transition-all flex items-center gap-2 mx-auto hover:scale-105"
              style={{ boxShadow: '0 4px 14px rgba(79,195,247,0.3)' }}
            >
              Phân tích mã đầu tiên <ArrowRight size={16} />
            </button>
          </div>
        ) : (
          <div className="space-y-4 max-w-4xl mx-auto">

            {/* Toolbar */}
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-sm text-slate-400 font-medium">
                  Đang theo dõi <span className="text-cyan-400 font-bold">{items.length}</span> mã
                </span>
                {/* Mini stats */}
                <div className="flex gap-2">
                  <span
                    className="text-xs px-2 py-0.5 rounded-full font-semibold"
                    style={{ background: 'rgba(74,222,128,0.1)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.2)' }}
                  >
                    ▲ {gainers} tăng
                  </span>
                  <span
                    className="text-xs px-2 py-0.5 rounded-full font-semibold"
                    style={{ background: 'rgba(248,113,113,0.1)', color: '#f87171', border: '1px solid rgba(248,113,113,0.2)' }}
                  >
                    ▼ {losers} giảm
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {lastUpdated && (
                  <span className="text-xs text-slate-500 flex items-center gap-1">
                    <Activity size={11} />
                    Cập nhật: {fmtTime(lastUpdated)}
                  </span>
                )}
                <button
                  onClick={fetchQuotes}
                  disabled={loadingQuotes}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg cursor-pointer border-none transition-all disabled:opacity-50"
                  style={{ background: 'rgba(79,195,247,0.1)', color: '#4fc3f7', border: '1px solid rgba(79,195,247,0.2)' }}
                >
                  <RefreshCw size={11} className={loadingQuotes ? 'animate-spin' : ''} />
                  Làm mới
                </button>
                <button
                  onClick={() => navigate('/analyze')}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg cursor-pointer border-none transition-all"
                  style={{ background: 'rgba(79,195,247,0.15)', color: '#4fc3f7', border: '1px solid rgba(79,195,247,0.3)' }}
                >
                  <Plus size={11} />
                  Thêm mã
                </button>
              </div>
            </div>

            {/* Table Header */}
            <div
              className="grid text-xs text-slate-500 font-semibold uppercase px-4 py-2 rounded-lg"
              style={{
                gridTemplateColumns: '1fr 90px 90px 90px 100px 80px 44px',
                background: 'rgba(13,27,42,0.6)',
                border: '1px solid rgba(79,195,247,0.06)',
              }}
            >
              <span>Mã / Sàn</span>
              <span className="text-right">Giá (k₫)</span>
              <span className="text-right">% Thay đổi</span>
              <span className="text-right">Volume</span>
              <span className="text-center">Tín hiệu AI</span>
              <span className="text-center">Trạng thái</span>
              <span />
            </div>

            {/* Rows */}
            <div className="space-y-2">
              {items.map((item) => {
                const q = quotes[item.ticker];
                const changePct = q?.changePct ?? null;
                const rowColor = changePct === null ? 'rgba(79,195,247,0.08)'
                  : changePct > 0 ? 'rgba(74,222,128,0.06)'
                  : changePct < 0 ? 'rgba(248,113,113,0.06)'
                  : 'rgba(245,158,11,0.06)';

                return (
                  <div
                    key={item.ticker}
                    onClick={() => handleRowClick(item)}
                    className="grid items-center cursor-pointer rounded-xl px-4 py-3 transition-all duration-200"
                    style={{
                      gridTemplateColumns: '1fr 90px 90px 90px 100px 80px 44px',
                      background: rowColor,
                      border: '1px solid rgba(79,195,247,0.08)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(79,195,247,0.3)';
                      e.currentTarget.style.transform = 'translateY(-1px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(79,195,247,0.08)';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    {/* Ticker + Exchange */}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-100">{item.ticker}</span>
                        <span
                          className="text-xs px-1.5 py-0.5 rounded font-semibold"
                          style={{ background: 'rgba(79,195,247,0.1)', color: '#4fc3f7' }}
                        >
                          {item.exchange}
                        </span>
                      </div>
                      {item.note && (
                        <div className="text-xs text-slate-500 italic truncate max-w-[140px] mt-0.5">{item.note}</div>
                      )}
                      <div className="text-xs text-slate-600 mt-0.5">
                        {new Date(item.addedAt).toLocaleDateString('vi-VN')}
                      </div>
                    </div>

                    {/* Giá */}
                    <div className="text-right">
                      {q?.price ? (
                        <span
                          className="text-sm font-bold font-num"
                          style={{ color: changePct > 0 ? '#4ade80' : changePct < 0 ? '#f87171' : '#f59e0b' }}
                        >
                          {(q.price / 1000).toFixed(1)}
                        </span>
                      ) : (
                        <span className="text-slate-600 text-sm">–</span>
                      )}
                    </div>

                    {/* % thay đổi */}
                    <div className="text-right">
                      {changePct !== null ? (
                        <span
                          className="text-xs font-bold font-num px-1.5 py-0.5 rounded-full"
                          style={{
                            color: changePct > 0 ? '#4ade80' : changePct < 0 ? '#f87171' : '#f59e0b',
                            background: changePct > 0 ? 'rgba(74,222,128,0.12)' : changePct < 0 ? 'rgba(248,113,113,0.12)' : 'rgba(245,158,11,0.12)',
                          }}
                        >
                          {changePct >= 0 ? '▲' : '▼'} {Math.abs(changePct).toFixed(2)}%
                        </span>
                      ) : (
                        <span className="text-slate-600 text-xs">–</span>
                      )}
                    </div>

                    {/* Volume */}
                    <div className="text-right text-xs text-slate-400 font-num">
                      {fmtVol(q?.volume)}
                    </div>

                    {/* Tín hiệu AI */}
                    <div className="flex justify-center">
                      <SignalPill signal={item.lastSignal} />
                    </div>

                    {/* Live status */}
                    <div className="flex justify-center">
                      {q ? (
                        <span
                          className="text-xs px-2 py-0.5 rounded-full flex items-center gap-1"
                          style={{
                            color: q.isLive ? '#4ade80' : '#f59e0b',
                            background: q.isLive ? 'rgba(74,222,128,0.1)' : 'rgba(245,158,11,0.1)',
                          }}
                        >
                          <span
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ background: q.isLive ? '#4ade80' : '#f59e0b', animation: q.isLive ? 'pulse 1.5s infinite' : 'none' }}
                          />
                          {q.isLive ? 'Live' : 'Cache'}
                        </span>
                      ) : (
                        <span className="text-slate-600 text-xs">–</span>
                      )}
                    </div>

                    {/* Remove */}
                    <div className="flex justify-center">
                      <button
                        onClick={(e) => handleRemove(e, item.ticker)}
                        className="p-1.5 rounded-lg transition-all cursor-pointer border-none bg-transparent text-slate-600 hover:text-red-400 hover:bg-red-500/10"
                        title="Xóa khỏi danh sách"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Quick Analyze CTA */}
            <div
              className="text-center py-3 text-xs text-slate-600"
              style={{ borderTop: '1px solid rgba(79,195,247,0.06)' }}
            >
              <Eye size={11} className="inline mr-1" />
              Nhấn vào mã để xem phân tích chi tiết • Tự động cập nhật mỗi 1.5 giây
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
