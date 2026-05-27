// ===== TRANG AUTO SCAN - XẾP HẠNG 60 MÃ VN100 =====

import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, RefreshCw, TrendingUp, TrendingDown, Minus, Activity, Clock, ChevronRight, BarChart2, Shield, Target } from 'lucide-react';
import Header from '../components/Layout/Header';
import { stockApi } from '../services/stockApi';

// ===== HỆ THỐNG MÀU =====
const STRENGTH_CONFIG = {
  STRONG: {
    label: 'Mạnh',
    color: '#4ade80',
    bg: 'rgba(74,222,128,0.08)',
    border: 'rgba(74,222,128,0.25)',
    glow: 'rgba(74,222,128,0.15)',
    icon: TrendingUp,
    dot: '#4ade80',
  },
  NEUTRAL: {
    label: 'Trung tính',
    color: '#f59e0b',
    bg: 'rgba(245,158,11,0.08)',
    border: 'rgba(245,158,11,0.25)',
    glow: 'rgba(245,158,11,0.1)',
    icon: Minus,
    dot: '#f59e0b',
  },
  WEAK: {
    label: 'Yếu',
    color: '#f87171',
    bg: 'rgba(248,113,113,0.08)',
    border: 'rgba(248,113,113,0.25)',
    glow: 'rgba(248,113,113,0.1)',
    icon: TrendingDown,
    dot: '#f87171',
  },
};

// ===== SCORE BAR =====
const ScoreBar = ({ score, maxScore = 10 }) => {
  const pct = (score / maxScore) * 100;
  const color = score >= 7 ? '#4ade80' : score >= 4 ? '#f59e0b' : '#f87171';
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex-1 h-1.5 rounded-full bg-slate-800/80 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: color, boxShadow: `0 0 6px ${color}` }}
        />
      </div>
      <span className="text-xs font-bold font-num w-6 text-right" style={{ color }}>
        {score}
      </span>
    </div>
  );
};

// ===== STOCK ROW =====
const StockRow = ({ item, rank, onClick }) => {
  const cfg = STRENGTH_CONFIG[item.strength] || STRENGTH_CONFIG.NEUTRAL;
  const Icon = cfg.icon;
  const isUp = item.change_pct >= 0;

  return (
    <div
      onClick={onClick}
      className="grid items-center px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-200 group"
      style={{
        gridTemplateColumns: '28px 70px 1fr 80px 60px 80px 60px',
        background: cfg.bg,
        border: `1px solid ${cfg.border}`,
        marginBottom: '4px',
      }}
      onMouseEnter={e => { e.currentTarget.style.background = cfg.glow; e.currentTarget.style.borderColor = cfg.color + '60'; }}
      onMouseLeave={e => { e.currentTarget.style.background = cfg.bg; e.currentTarget.style.borderColor = cfg.border; }}
    >
      {/* Rank */}
      <span className="text-xs text-slate-500 font-num font-bold">#{rank}</span>

      {/* Ticker */}
      <div className="flex items-center gap-1.5">
        <span
          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
          style={{ background: cfg.dot, boxShadow: `0 0 4px ${cfg.dot}` }}
        />
        <span className="text-sm font-bold text-slate-100">{item.ticker}</span>
      </div>

      {/* Score Bar */}
      <div className="px-2">
        <ScoreBar score={item.score} />
      </div>

      {/* Giá */}
      <span
        className="text-xs font-bold font-num text-right"
        style={{ color: isUp ? '#4ade80' : '#f87171' }}
      >
        {item.price ? (item.price / 1000).toFixed(1) : '–'}
      </span>

      {/* % thay đổi */}
      <span
        className="text-xs font-bold font-num text-right"
        style={{ color: isUp ? '#4ade80' : '#f87171' }}
      >
        {isUp ? '+' : ''}{item.change_pct?.toFixed(2)}%
      </span>

      {/* RSI */}
      <span className="text-xs font-num text-slate-400 text-right">
        {item.rsi ? item.rsi.toFixed(0) : '–'}
      </span>

      {/* Phân tích nhanh */}
      <div className="flex justify-end">
        <ChevronRight
          size={14}
          className="text-slate-600 group-hover:text-cyan-400 transition-colors"
        />
      </div>
    </div>
  );
};

// ===== SUMMARY CARD =====
const SummaryCard = ({ label, value, color, icon: Icon }) => (
  <div
    className="flex flex-col items-center justify-center p-3 rounded-xl text-center"
    style={{ background: 'rgba(13,27,42,0.7)', border: '1px solid rgba(79,195,247,0.08)' }}
  >
    {Icon && <Icon size={16} className="mb-1" style={{ color }} />}
    <div className="text-2xl font-bold font-num" style={{ color }}>{value}</div>
    <div className="text-xs text-slate-500 mt-0.5">{label}</div>
  </div>
);

// ===== MAIN PAGE =====
export default function ScannerPage() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('strong'); // 'strong' | 'weak' | 'all'
  const [lastUpdated, setLastUpdated] = useState(null);
  const intervalRef = useRef(null);

  const fetchResults = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true);
    setError(null);
    try {
      const res = await stockApi.getScanResults();
      if (res && res.scanned_at) {
        setData(res);
        setLastUpdated(new Date());
      }
    } catch (e) {
      if (showLoading) setError('Chưa có kết quả scan. Nhấn "Quét ngay" để bắt đầu!');
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  const handleScan = async () => {
    setScanning(true);
    try {
      await stockApi.triggerScan();
      // Chờ 5 giây rồi lấy kết quả
      setTimeout(() => fetchResults(true), 5000);
      setTimeout(() => { setScanning(false); fetchResults(true); }, 45000);
    } catch (e) {
      setScanning(false);
    }
  };

  useEffect(() => {
    fetchResults(true);
    // Tự động làm mới mỗi 5 phút
    intervalRef.current = setInterval(() => fetchResults(false), 300000);
    return () => clearInterval(intervalRef.current);
  }, [fetchResults]);

  const handleRowClick = (ticker) => {
    navigate(`/analyze?ticker=${ticker}&exchange=HOSE&autorun=1`);
  };

  const fmtTime = (d) => d?.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  const displayList = data
    ? activeTab === 'strong'
      ? data.top_strong || []
      : activeTab === 'weak'
      ? data.top_weak || []
      : data.all_results || []
    : [];

  const marketMood = data
    ? data.strong_count > data.weak_count
      ? { label: 'Thị trường TÍCH CỰC', color: '#4ade80' }
      : data.weak_count > data.strong_count
      ? { label: 'Thị trường TIÊU CỰC', color: '#f87171' }
      : { label: 'Thị trường ĐI NGANG', color: '#f59e0b' }
    : null;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title="Auto Scan - Xếp hạng VN100" />

      <div className="flex-1 overflow-y-auto p-5">
        <div className="max-w-4xl mx-auto space-y-4">

          {/* Hero Banner */}
          <div
            className="p-4 rounded-2xl flex items-center justify-between flex-wrap gap-3"
            style={{
              background: 'linear-gradient(135deg, rgba(13,27,42,0.9) 0%, rgba(6,60,60,0.6) 100%)',
              border: '1px solid rgba(79,195,247,0.15)',
            }}
          >
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Zap size={18} style={{ color: '#4fc3f7' }} />
                <h2 className="text-base font-bold text-slate-100">Quét sức mạnh kỹ thuật 60 mã VN100</h2>
              </div>
              <p className="text-xs text-slate-400">
                Chấm điểm theo Xu hướng · RSI · MACD · Volume · Momentum — Cập nhật mỗi 5 phút
              </p>
              {marketMood && (
                <div
                  className="mt-2 text-xs font-bold px-2.5 py-0.5 rounded-full inline-flex items-center gap-1"
                  style={{ color: marketMood.color, background: marketMood.color + '15', border: `1px solid ${marketMood.color}30` }}
                >
                  <Activity size={10} />
                  {marketMood.label}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {lastUpdated && (
                <span className="text-[11px] text-slate-500 flex items-center gap-1">
                  <Clock size={10} />
                  {fmtTime(lastUpdated)}
                </span>
              )}
              <button
                onClick={handleScan}
                disabled={scanning}
                className="flex items-center gap-1.5 text-xs px-4 py-2 rounded-xl cursor-pointer border-none transition-all font-semibold disabled:opacity-60"
                style={{
                  background: scanning ? 'rgba(79,195,247,0.1)' : 'linear-gradient(135deg, #06b6d4, #0891b2)',
                  color: '#fff',
                  boxShadow: scanning ? 'none' : '0 4px 14px rgba(6,182,212,0.35)',
                }}
              >
                <RefreshCw size={12} className={scanning ? 'animate-spin' : ''} />
                {scanning ? 'Đang quét...' : 'Quét ngay'}
              </button>
            </div>
          </div>

          {/* Stats Row */}
          {data && (
            <div className="grid grid-cols-4 gap-3">
              <SummaryCard label="Đã quét" value={data.total_scanned} color="#4fc3f7" icon={BarChart2} />
              <SummaryCard label="Mạnh" value={data.strong_count} color="#4ade80" icon={TrendingUp} />
              <SummaryCard label="Trung tính" value={data.neutral_count} color="#f59e0b" icon={Target} />
              <SummaryCard label="Yếu" value={data.weak_count} color="#f87171" icon={Shield} />
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-2">
            {[
              { key: 'strong', label: '⚡ Mạnh nhất (Top 10)', color: '#4ade80' },
              { key: 'weak', label: '⚠️ Yếu nhất (Top 10)', color: '#f87171' },
              { key: 'all', label: '📊 Tất cả', color: '#4fc3f7' },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className="text-xs px-4 py-2 rounded-xl cursor-pointer border-none font-semibold transition-all"
                style={{
                  background: activeTab === tab.key ? tab.color + '20' : 'rgba(13,27,42,0.7)',
                  color: activeTab === tab.key ? tab.color : '#64748b',
                  border: `1px solid ${activeTab === tab.key ? tab.color + '40' : 'rgba(79,195,247,0.08)'}`,
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Table Header */}
          {displayList.length > 0 && (
            <div
              className="grid text-[10px] text-slate-500 font-semibold uppercase px-3 py-2 rounded-xl"
              style={{
                gridTemplateColumns: '28px 70px 1fr 80px 60px 80px 60px',
                background: 'rgba(9,20,32,0.8)',
                border: '1px solid rgba(79,195,247,0.06)',
              }}
            >
              <span>#</span>
              <span>Mã</span>
              <span className="px-2">Điểm (0–10)</span>
              <span className="text-right">Giá (k₫)</span>
              <span className="text-right">% Ngày</span>
              <span className="text-right">RSI</span>
              <span></span>
            </div>
          )}

          {/* Content */}
          {loading ? (
            <div
              className="flex flex-col items-center justify-center py-20 rounded-2xl"
              style={{ background: 'rgba(13,27,42,0.5)', border: '1px solid rgba(79,195,247,0.08)' }}
            >
              <RefreshCw size={28} className="animate-spin text-cyan-400 mb-3" />
              <p className="text-sm text-slate-400">Đang tải dữ liệu scan...</p>
            </div>
          ) : error ? (
            <div
              className="flex flex-col items-center justify-center py-20 rounded-2xl text-center"
              style={{ background: 'rgba(13,27,42,0.5)', border: '1px solid rgba(79,195,247,0.08)' }}
            >
              <BarChart2 size={40} className="text-slate-600 mb-3" />
              <p className="text-sm text-slate-400 mb-4">{error}</p>
              <button
                onClick={handleScan}
                disabled={scanning}
                className="flex items-center gap-2 text-sm px-5 py-2.5 rounded-xl cursor-pointer border-none font-semibold"
                style={{ background: 'linear-gradient(135deg, #06b6d4, #0891b2)', color: '#fff' }}
              >
                <Zap size={14} />
                Bắt đầu quét 60 mã VN100
              </button>
            </div>
          ) : (
            <div>
              {displayList.map((item, i) => (
                <StockRow
                  key={item.ticker}
                  item={item}
                  rank={i + 1}
                  onClick={() => handleRowClick(item.ticker)}
                />
              ))}

              {displayList.length === 0 && data && (
                <div className="text-center py-10 text-slate-500 text-sm">
                  Không có dữ liệu. Nhấn "Quét ngay" để bắt đầu.
                </div>
              )}
            </div>
          )}

          {/* Info Footer */}
          {data && (
            <div className="text-center py-2 text-[10px] text-slate-600">
              ⚡ Chỉ tốn {data.request_cost || 1} request mỗi lần quét · Cache 5 phút ·
              Quét xong trong {data.elapsed_seconds}s
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
