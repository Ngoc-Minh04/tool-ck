// ===== TRANG AUTO SCAN - XẾP HẠNG 60 MÃ VN100 =====

import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, RefreshCw, TrendingUp, TrendingDown, Minus, Activity, Clock, ChevronRight, BarChart2, Shield, Target, Bell, Send } from 'lucide-react';
import Header from '../components/Layout/Header';
import { stockApi } from '../services/stockApi';
import toast from 'react-hot-toast';

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
      <span className="text-xs text-slate-500 font-num font-bold">#{rank}</span>
      <div className="flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: cfg.dot, boxShadow: `0 0 4px ${cfg.dot}` }} />
        <span className="text-sm font-bold text-slate-100">{item.ticker}</span>
      </div>
      <div className="px-2"><ScoreBar score={item.score} /></div>
      <span className="text-xs font-bold font-num text-right" style={{ color: isUp ? '#4ade80' : '#f87171' }}>
        {item.price ? (item.price / 1000).toFixed(1) : '–'}
      </span>
      <span className="text-xs font-bold font-num text-right" style={{ color: isUp ? '#4ade80' : '#f87171' }}>
        {isUp ? '+' : ''}{item.change_pct?.toFixed(2)}%
      </span>
      <span className="text-xs font-num text-slate-400 text-right">
        {item.rsi ? item.rsi.toFixed(0) : '–'}
      </span>
      <div className="flex justify-end">
        <ChevronRight size={14} className="text-slate-600 group-hover:text-cyan-400 transition-colors" />
      </div>
    </div>
  );
};

// ===== SIGNAL CARD (BUY hoặc SELL) =====
const SignalCard = ({ item, type, onClick }) => {
  const isBuy = type === 'buy';
  const color = isBuy ? '#4ade80' : '#f87171';
  const bg = isBuy ? 'rgba(74,222,128,0.07)' : 'rgba(248,113,113,0.07)';
  const border = isBuy ? 'rgba(74,222,128,0.25)' : 'rgba(248,113,113,0.25)';
  const isUp = item.change_pct >= 0;

  return (
    <div
      onClick={onClick}
      className="p-3 rounded-xl cursor-pointer transition-all duration-200"
      style={{ background: bg, border: `1px solid ${border}`, marginBottom: '6px' }}
      onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
      onMouseLeave={e => e.currentTarget.style.opacity = '1'}
    >
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <span
            className="text-xs font-bold px-1.5 py-0.5 rounded-md"
            style={{ background: color + '25', color }}
          >
            {isBuy ? '▲ BUY' : '▼ SELL'}
          </span>
          <span className="text-sm font-bold text-slate-100">{item.ticker}</span>
          <span className="text-xs text-slate-400 font-num">
            {item.price ? (item.price / 1000).toFixed(1) + 'k' : '–'}
          </span>
          <span
            className="text-xs font-bold font-num"
            style={{ color: isUp ? '#4ade80' : '#f87171' }}
          >
            {isUp ? '+' : ''}{item.change_pct?.toFixed(2)}%
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">Điểm</span>
          <span className="text-sm font-bold font-num" style={{ color }}>{item.score}/10</span>
        </div>
      </div>

      {/* Score bar */}
      <div className="mb-1.5">
        <ScoreBar score={item.score} />
      </div>

      {/* Chỉ báo nhanh */}
      <div className="flex items-center gap-3 text-[11px] text-slate-400">
        {item.rsi != null && (
          <span>RSI <b style={{ color: item.rsi < 30 ? '#4ade80' : item.rsi > 70 ? '#f87171' : '#f59e0b' }}>{item.rsi?.toFixed(0)}</b></span>
        )}
        {item.macd_hist != null && (
          <span>MACD <b style={{ color: item.macd_hist > 0 ? '#4ade80' : '#f87171' }}>{item.macd_hist > 0 ? '+' : ''}{item.macd_hist?.toFixed(2)}</b></span>
        )}
        {item.vol_ratio != null && (
          <span>Vol <b style={{ color: item.vol_ratio >= 1.2 ? '#4ade80' : '#94a3b8' }}>{item.vol_ratio?.toFixed(1)}x</b></span>
        )}
        {item.ai_trend && (
          <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-full"
            style={{ background: item.ai_trend.includes('TĂNG') ? 'rgba(74,222,128,0.15)' : 'rgba(248,113,113,0.15)', color: item.ai_trend.includes('TĂNG') ? '#4ade80' : '#f87171' }}>
            AI: {item.ai_trend}
          </span>
        )}
      </div>

      {/* Lý do đầu tiên */}
      {item.reasons?.[0] && (
        <div className="mt-1.5 text-[11px] text-slate-500 italic">{item.reasons[0]}</div>
      )}
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
  const [activeTab, setActiveTab] = useState('signals'); // 'signals' | 'strong' | 'weak' | 'all'
  const [lastUpdated, setLastUpdated] = useState(null);
  const [signalData, setSignalData] = useState(null);
  const [signalLoading, setSignalLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [countdown, setCountdown] = useState(null);
  const intervalRef = useRef(null);
  const countdownRef = useRef(null);

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

  const fetchSignals = useCallback(async () => {
    setSignalLoading(true);
    try {
      const res = await stockApi.getSignals();
      if (res) {
        setSignalData(res);
        setLastUpdated(new Date());
        // Reset đếm ngược 15 phút
        setCountdown(15 * 60);
      }
    } catch (e) {
      // Không hiện lỗi
    } finally {
      setSignalLoading(false);
    }
  }, []);

  const handleScan = async () => {
    setScanning(true);
    try {
      await stockApi.triggerScan();
      setTimeout(() => fetchResults(true), 5000);
      setTimeout(() => { setScanning(false); fetchResults(true); }, 45000);
    } catch (e) {
      setScanning(false);
    }
  };

  const handleSendTelegram = async () => {
    setSending(true);
    try {
      await stockApi.sendSignalsTelegram();
      toast.success('Đã kích hoạt gửi tín hiệu về Telegram! (mất 5-10 giây)');
      setTimeout(() => fetchSignals(), 8000);
    } catch (e) {
      toast.error('Không gửi được Telegram. Kiểm tra cài đặt Bot Token.');
    } finally {
      setTimeout(() => setSending(false), 10000);
    }
  };

  useEffect(() => {
    fetchResults(true);
    fetchSignals();
    // Tự động làm mới mỗi 5 phút
    intervalRef.current = setInterval(() => {
      fetchResults(false);
      fetchSignals();
    }, 300000);
    return () => clearInterval(intervalRef.current);
  }, [fetchResults, fetchSignals]);

  // Đồng hồ đếm ngược 15 phút cho tín hiệu
  useEffect(() => {
    if (countdown === null) return;
    countdownRef.current = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) { fetchSignals(); return 15 * 60; }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(countdownRef.current);
  }, [countdown, fetchSignals]);

  const handleRowClick = (ticker) => {
    navigate(`/analyze?ticker=${ticker}&exchange=HOSE&autorun=1`);
  };

  const fmtTime = (d) => d?.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  const fmtCountdown = (sec) => {
    if (!sec) return '';
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

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

  const TABS = [
    { key: 'signals', label: '🔔 Tín hiệu AI', color: '#a78bfa' },
    { key: 'strong', label: '⚡ Mạnh nhất (Top 10)', color: '#4ade80' },
    { key: 'weak', label: '⚠️ Yếu nhất (Top 10)', color: '#f87171' },
    { key: 'all', label: '📊 Tất cả', color: '#4fc3f7' },
  ];

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
          <div className="flex gap-2 flex-wrap">
            {TABS.map(tab => (
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

          {/* ===== TAB: TÍN HIỆU AI ===== */}
          {activeTab === 'signals' && (
            <div>
              {/* Header Tín hiệu AI */}
              <div
                className="p-4 rounded-2xl mb-4 flex items-center justify-between flex-wrap gap-3"
                style={{
                  background: 'linear-gradient(135deg, rgba(20,10,40,0.9) 0%, rgba(30,20,60,0.7) 100%)',
                  border: '1px solid rgba(167,139,250,0.2)',
                }}
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Bell size={16} style={{ color: '#a78bfa' }} />
                    <span className="text-sm font-bold text-slate-100">Tín hiệu BUY / SELL tự động</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Thuật toán kép: Điểm kỹ thuật ≥7/10 (STRONG) · Gửi Telegram lúc 09:30 &amp; 14:30
                  </p>
                  {countdown !== null && (
                    <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                      <Clock size={10} />
                      Cập nhật tiếp theo: <b className="text-slate-400">{fmtCountdown(countdown)}</b>
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={fetchSignals}
                    disabled={signalLoading}
                    className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl cursor-pointer border-none font-semibold disabled:opacity-60"
                    style={{ background: 'rgba(167,139,250,0.15)', color: '#a78bfa', border: '1px solid rgba(167,139,250,0.25)' }}
                  >
                    <RefreshCw size={11} className={signalLoading ? 'animate-spin' : ''} />
                    Cập nhật
                  </button>
                  <button
                    onClick={handleSendTelegram}
                    disabled={sending}
                    className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl cursor-pointer border-none font-semibold disabled:opacity-60 transition-all"
                    style={{
                      background: sending ? 'rgba(34,197,94,0.1)' : 'linear-gradient(135deg, #16a34a, #15803d)',
                      color: '#fff',
                      boxShadow: sending ? 'none' : '0 4px 12px rgba(22,163,74,0.3)',
                    }}
                  >
                    <Send size={11} className={sending ? 'animate-pulse' : ''} />
                    {sending ? 'Đang gửi...' : 'Gửi Telegram ngay'}
                  </button>
                </div>
              </div>

              {signalLoading ? (
                <div className="flex flex-col items-center justify-center py-16 rounded-2xl"
                  style={{ background: 'rgba(13,27,42,0.5)', border: '1px solid rgba(167,139,250,0.1)' }}>
                  <RefreshCw size={26} className="animate-spin mb-3" style={{ color: '#a78bfa' }} />
                  <p className="text-sm text-slate-400">Đang phân tích tín hiệu...</p>
                </div>
              ) : signalData ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Cột BUY */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <TrendingUp size={14} style={{ color: '#4ade80' }} />
                      <span className="text-sm font-bold" style={{ color: '#4ade80' }}>
                        BUY Signals ({signalData.total_buy || signalData.buy_signals?.length || 0})
                      </span>
                    </div>
                    {signalData.buy_signals?.length > 0 ? (
                      signalData.buy_signals.map(item => (
                        <SignalCard
                          key={item.ticker}
                          item={item}
                          type="buy"
                          onClick={() => handleRowClick(item.ticker)}
                        />
                      ))
                    ) : (
                      <div className="text-center py-10 text-slate-500 text-sm rounded-xl"
                        style={{ background: 'rgba(13,27,42,0.5)', border: '1px solid rgba(74,222,128,0.08)' }}>
                        Không có mã đủ tiêu chuẩn BUY
                        <br />
                        <span className="text-xs">(Điểm ≥7 + AI dự báo TĂNG)</span>
                      </div>
                    )}
                  </div>

                  {/* Cột SELL */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <TrendingDown size={14} style={{ color: '#f87171' }} />
                      <span className="text-sm font-bold" style={{ color: '#f87171' }}>
                        SELL Signals ({signalData.total_sell || signalData.sell_signals?.length || 0})
                      </span>
                    </div>
                    {signalData.sell_signals?.length > 0 ? (
                      signalData.sell_signals.map(item => (
                        <SignalCard
                          key={item.ticker}
                          item={item}
                          type="sell"
                          onClick={() => handleRowClick(item.ticker)}
                        />
                      ))
                    ) : (
                      <div className="text-center py-10 text-slate-500 text-sm rounded-xl"
                        style={{ background: 'rgba(13,27,42,0.5)', border: '1px solid rgba(248,113,113,0.08)' }}>
                        Không có mã cảnh báo SELL
                        <br />
                        <span className="text-xs">(Điểm ≤3 + AI dự báo GIẢM)</span>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-14 text-slate-500 text-sm rounded-xl"
                  style={{ background: 'rgba(13,27,42,0.5)', border: '1px dashed rgba(167,139,250,0.15)' }}>
                  <Bell size={32} className="mx-auto mb-3 opacity-30" style={{ color: '#a78bfa' }} />
                  Nhấn "Cập nhật" để tải tín hiệu mới nhất
                </div>
              )}

              {signalData?.scanned_at && (
                <div className="text-center py-2 mt-2 text-[10px] text-slate-600">
                  Quét lúc {signalData.scanned_at?.replace('T', ' ')?.slice(0, 16)} · {signalData.total_scanned || 60} mã VN100
                  <br />
                  Gửi Telegram tự động: 09:30 &amp; 14:30 và khi phát hiện tín hiệu mới mỗi 15 phút
                  <br />
                  ⚠️ Tín hiệu kỹ thuật + AI, không phải khuyến nghị đầu tư
                </div>
              )}
            </div>
          )}

          {/* ===== CÁC TAB KHÁC ===== */}
          {activeTab !== 'signals' && (
            <>
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
            </>
          )}

          {/* Info Footer */}
          {data && activeTab !== 'signals' && (
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
