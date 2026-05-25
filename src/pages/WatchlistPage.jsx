import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash2, TrendingUp, AlertCircle, ArrowRight } from 'lucide-react';
import useWatchlist from '../store/watchlistStore';
import Header from '../components/Layout/Header';

export default function WatchlistPage() {
  const { items, remove } = useWatchlist();
  const navigate = useNavigate();

  const handleRowClick = (item) => {
    navigate(`/analyze?ticker=${item.ticker}&exchange=${item.exchange}`);
  };

  const handleRemove = (e, ticker) => {
    e.stopPropagation();
    remove(ticker);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title="Danh sách theo dõi" />

      <div className="flex-1 overflow-y-auto p-6">
        {items.length === 0 ? (
          <div className="glass-card p-12 text-center max-w-lg mx-auto mt-12 animate-fade-in-up">
            <div className="text-6xl mb-4 text-slate-500">⭐</div>
            <h3 className="text-lg font-bold text-slate-200 mb-2">Chưa có mã nào trong watchlist</h3>
            <p className="text-sm text-slate-500 mb-6">
              Bắt đầu thêm các cổ phiếu tiềm năng vào danh sách theo dõi để cập nhật nhanh chóng tín hiệu giao dịch và xu hướng kỹ thuật.
            </p>
            <button
              onClick={() => navigate('/analyze')}
              className="px-5 py-2.5 rounded-lg bg-cyan-500 text-slate-900 font-semibold cursor-pointer text-sm transition-all flex items-center gap-2 mx-auto"
              style={{
                boxShadow: '0 4px 14px rgba(79, 195, 247, 0.3)',
              }}
              onMouseOver={(e) => { e.currentTarget.style.transform = 'scale(1.03)'; }}
              onMouseOut={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
            >
              Phân tích mã đầu tiên <ArrowRight size={16} />
            </button>
          </div>
        ) : (
          <div className="space-y-4 max-w-4xl mx-auto">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400 font-medium">Bạn đang theo dõi {items.length} mã cổ phiếu</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {items.map((item) => {
                const signalColor = item.lastSignal === 'BUY' ? '#00e676' 
                                  : item.lastSignal === 'SELL' ? '#ff5252' 
                                  : '#ffb300';
                
                const signalBg = item.lastSignal === 'BUY' ? 'rgba(0, 230, 118, 0.1)' 
                               : item.lastSignal === 'SELL' ? 'rgba(255, 82, 82, 0.1)' 
                               : 'rgba(255, 179, 0, 0.1)';

                return (
                  <div
                    key={item.ticker}
                    onClick={() => handleRowClick(item)}
                    className="glass-card p-5 cursor-pointer flex items-center justify-between border border-transparent transition-all duration-200"
                    style={{
                      border: '1px solid rgba(79, 195, 247, 0.08)',
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(79, 195, 247, 0.3)';
                      e.currentTarget.style.background = 'rgba(26, 47, 69, 0.4)';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(79, 195, 247, 0.08)';
                      e.currentTarget.style.background = 'rgba(13, 27, 42, 0.3)';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-slate-100">{item.ticker}</span>
                        <span className="text-xxs px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-semibold uppercase">
                          {item.exchange}
                        </span>
                      </div>
                      
                      <div className="text-xxs text-slate-500">
                        Thêm vào: {new Date(item.addedAt).toLocaleDateString('vi-VN')}
                      </div>

                      {item.note && (
                        <p className="text-xs text-slate-400 italic">
                          Ghi chú: {item.note}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-4">
                      {/* Signal Pill */}
                      {item.lastSignal ? (
                        <span
                          className="text-xs px-2.5 py-1 rounded-full font-bold uppercase flex items-center gap-1.5"
                          style={{
                            color: signalColor,
                            background: signalBg,
                            border: `1px solid ${signalColor}30`,
                          }}
                        >
                          <TrendingUp size={12} /> {item.lastSignal}
                        </span>
                      ) : (
                        <span className="text-xs px-2.5 py-1 rounded-full text-slate-500 bg-slate-800/50 border border-slate-700/50 uppercase">
                          Chưa phân tích
                        </span>
                      )}

                      {/* Remove Button */}
                      <button
                        onClick={(e) => handleRemove(e, item.ticker)}
                        className="p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 cursor-pointer transition-all border-none bg-transparent"
                        title="Xóa khỏi danh sách"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
