// ===== TRANG SCREENER CỔ PHIẾU =====

import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Filter, TrendingUp, TrendingDown, BarChart2, RefreshCw, Search, ChevronUp, ChevronDown, Zap } from 'lucide-react';
import Header from '../components/Layout/Header';
import { stockApi } from '../services/stockApi';
import toast from 'react-hot-toast';

const EXCHANGE_OPTS = [
  { value: 'ALL',   label: 'Tất cả sàn' },
  { value: 'HOSE',  label: 'HOSE' },
  { value: 'HNX',   label: 'HNX' },
  { value: 'UPCOM', label: 'UPCOM' },
];

const PE_PRESETS = [
  { label: 'Tất cả', min: null, max: null },
  { label: 'P/E < 10', min: null, max: 10 },
  { label: '10–20', min: 10, max: 20 },
  { label: '20–30', min: 20, max: 30 },
  { label: 'P/E > 30', min: 30, max: null },
];

const ROE_PRESETS = [
  { label: 'Tất cả', min: null },
  { label: 'ROE > 10%', min: 10 },
  { label: 'ROE > 15%', min: 15 },
  { label: 'ROE > 20%', min: 20 },
];

const StatCard = ({ label, value, color = '#4fc3f7' }) => (
  <div
    className="flex flex-col items-center justify-center p-3 rounded-xl text-center"
    style={{ background: 'rgba(13,27,42,0.7)', border: '1px solid rgba(79,195,247,0.08)' }}
  >
    <div className="text-xl font-bold font-num" style={{ color }}>{value}</div>
    <div className="text-xs text-slate-500 mt-0.5">{label}</div>
  </div>
);

const SortIcon = ({ field, sortKey, sortAsc }) => {
  if (sortKey !== field) return <ChevronUp size={11} className="opacity-20" />;
  return sortAsc ? <ChevronUp size={11} style={{ color: '#4fc3f7' }} /> : <ChevronDown size={11} style={{ color: '#4fc3f7' }} />;
};

export default function ScreenerPage() {
  const navigate = useNavigate();

  const [exchange, setExchange] = useState('ALL');
  const [pePreset, setPePreset] = useState(0);
  const [roePreset, setRoePreset] = useState(0);
  const [search, setSearch] = useState('');

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sortKey, setSortKey] = useState('volume');
  const [sortAsc, setSortAsc] = useState(false);

  const pe = PE_PRESETS[pePreset];
  const roe = ROE_PRESETS[roePreset];

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        exchange: exchange === 'ALL' ? undefined : exchange,
        min_pe: pe.min,
        max_pe: pe.max,
        min_roe: roe.min,
      };
      const result = await stockApi.getScreener(params);
      setData(result || []);
    } catch (e) {
      toast.error('Không thể tải dữ liệu screener');
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [exchange, pePreset, roePreset]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSort = (key) => {
    if (sortKey === key) setSortAsc(a => !a);
    else { setSortKey(key); setSortAsc(false); }
  };

  // Filter + sort
  const filtered = data
    .filter(s => !search || s.ticker.includes(search.toUpperCase()) || false)
    .sort((a, b) => {
      const va = a[sortKey] ?? 0, vb = b[sortKey] ?? 0;
      return sortAsc ? va - vb : vb - va;
    });

  // Stats
  const gainers  = filtered.filter(s => s.change_pct > 0).length;
  const losers   = filtered.filter(s => s.change_pct < 0).length;
  const avgPE    = filtered.length ? (filtered.reduce((s, d) => s + (d.pe || 0), 0) / filtered.length).toFixed(1) : '–';
  const avgROE   = filtered.length ? (filtered.reduce((s, d) => s + (d.roe || 0), 0) / filtered.length).toFixed(1) : '–';

  const COLS = [
    { key: 'ticker',     label: 'Mã',          width: 80 },
    { key: 'close',      label: 'Giá (k₫)',    width: 90 },
    { key: 'change_pct', label: '% Thay đổi',  width: 100 },
    { key: 'volume',     label: 'KL giao dịch', width: 110 },
    { key: 'pe',         label: 'P/E',          width: 70 },
    { key: 'pb',         label: 'P/B',          width: 70 },
    { key: 'roe',        label: 'ROE (%)',       width: 80 },
    { key: 'exchange',   label: 'Sàn',          width: 70 },
  ];

  const fmtVol = (v) => {
    if (!v && v !== 0) return '–';
    if (v >= 1e6) return `${(v/1e6).toFixed(2)}M`;
    if (v >= 1e3) return `${(v/1e3).toFixed(0)}K`;
    return String(v);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title="Screener cổ phiếu" />

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-5xl mx-auto space-y-5">

          {/* Filter Panel */}
          <div
            className="p-4 rounded-2xl space-y-4"
            style={{ background: 'rgba(13,27,42,0.7)', border: '1px solid rgba(79,195,247,0.1)' }}
          >
            <div className="flex items-center gap-2 mb-1">
              <Filter size={15} style={{ color: '#4fc3f7' }} />
              <span className="text-sm font-semibold text-slate-200">Bộ lọc</span>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {/* Exchange */}
              <div>
                <div className="text-xs text-slate-500 mb-2">Sàn giao dịch</div>
                <div className="flex flex-wrap gap-1.5">
                  {EXCHANGE_OPTS.map(o => (
                    <button
                      key={o.value}
                      onClick={() => setExchange(o.value)}
                      className="text-xs px-2.5 py-1 rounded-full cursor-pointer border-none transition-all"
                      style={{
                        background: exchange === o.value ? 'rgba(79,195,247,0.2)' : 'rgba(26,47,69,0.7)',
                        color: exchange === o.value ? '#4fc3f7' : '#64748b',
                        border: `1px solid ${exchange === o.value ? 'rgba(79,195,247,0.4)' : 'rgba(79,195,247,0.08)'}`,
                        fontWeight: exchange === o.value ? 600 : 400,
                      }}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* P/E */}
              <div>
                <div className="text-xs text-slate-500 mb-2">Tỉ số P/E</div>
                <div className="flex flex-wrap gap-1.5">
                  {PE_PRESETS.map((p, i) => (
                    <button
                      key={i}
                      onClick={() => setPePreset(i)}
                      className="text-xs px-2.5 py-1 rounded-full cursor-pointer border-none transition-all"
                      style={{
                        background: pePreset === i ? 'rgba(250,204,21,0.15)' : 'rgba(26,47,69,0.7)',
                        color: pePreset === i ? '#facc15' : '#64748b',
                        border: `1px solid ${pePreset === i ? 'rgba(250,204,21,0.3)' : 'rgba(79,195,247,0.08)'}`,
                        fontWeight: pePreset === i ? 600 : 400,
                      }}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* ROE */}
              <div>
                <div className="text-xs text-slate-500 mb-2">ROE tối thiểu</div>
                <div className="flex flex-wrap gap-1.5">
                  {ROE_PRESETS.map((r, i) => (
                    <button
                      key={i}
                      onClick={() => setRoePreset(i)}
                      className="text-xs px-2.5 py-1 rounded-full cursor-pointer border-none transition-all"
                      style={{
                        background: roePreset === i ? 'rgba(74,222,128,0.15)' : 'rgba(26,47,69,0.7)',
                        color: roePreset === i ? '#4ade80' : '#64748b',
                        border: `1px solid ${roePreset === i ? 'rgba(74,222,128,0.3)' : 'rgba(79,195,247,0.08)'}`,
                        fontWeight: roePreset === i ? 600 : 400,
                      }}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-4 gap-3">
            <StatCard label="Kết quả" value={filtered.length} />
            <StatCard label="Tăng / Giảm" value={`${gainers} / ${losers}`} color={gainers > losers ? '#4ade80' : '#f87171'} />
            <StatCard label="P/E trung bình" value={avgPE} color="#facc15" />
            <StatCard label="ROE trung bình (%)" value={avgROE} color="#a78bfa" />
          </div>

          {/* Search + Refresh */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-xs">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value.toUpperCase())}
                placeholder="Tìm mã CK..."
                className="input-dark pl-8 text-sm"
              />
            </div>
            <button
              onClick={fetchData}
              disabled={loading}
              className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg cursor-pointer border-none transition-all disabled:opacity-50"
              style={{ background: 'rgba(79,195,247,0.1)', color: '#4fc3f7', border: '1px solid rgba(79,195,247,0.2)' }}
            >
              <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
              Làm mới
            </button>
          </div>

          {/* Table */}
          <div
            className="rounded-2xl overflow-hidden"
            style={{ border: '1px solid rgba(79,195,247,0.1)' }}
          >
            {/* Header */}
            <div
              className="grid text-xs text-slate-500 font-semibold uppercase px-4 py-3"
              style={{
                gridTemplateColumns: COLS.map(c => `${c.width}px`).join(' ') + ' 1fr',
                background: 'rgba(9,20,32,0.9)',
                borderBottom: '1px solid rgba(79,195,247,0.1)',
              }}
            >
              {COLS.map(col => (
                <button
                  key={col.key}
                  onClick={() => col.key !== 'exchange' && handleSort(col.key)}
                  className="flex items-center gap-1 cursor-pointer border-none bg-transparent text-slate-500 hover:text-slate-300 text-xs font-semibold uppercase transition-colors text-left p-0"
                  style={{ justifyContent: col.key === 'ticker' ? 'flex-start' : 'flex-end' }}
                >
                  {col.key !== 'ticker' && <SortIcon field={col.key} sortKey={sortKey} sortAsc={sortAsc} />}
                  {col.label}
                  {col.key === 'ticker' && <SortIcon field={col.key} sortKey={sortKey} sortAsc={sortAsc} />}
                </button>
              ))}
              <div className="text-right">Phân tích</div>
            </div>

            {/* Rows */}
            {loading ? (
              <div className="flex items-center justify-center py-16 text-slate-500 text-sm">
                <RefreshCw size={16} className="animate-spin mr-2" />
                Đang tải...
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-16 text-slate-500 text-sm">
                Không có kết quả phù hợp với bộ lọc
              </div>
            ) : (
              <div>
                {filtered.map((row, i) => {
                  const isUp = row.change_pct > 0;
                  const isDown = row.change_pct < 0;
                  const changeColor = isUp ? '#4ade80' : isDown ? '#f87171' : '#f59e0b';

                  return (
                    <div
                      key={row.ticker}
                      className="grid items-center px-4 py-3 cursor-pointer transition-all"
                      style={{
                        gridTemplateColumns: COLS.map(c => `${c.width}px`).join(' ') + ' 1fr',
                        background: i % 2 === 0 ? 'rgba(13,27,42,0.4)' : 'rgba(9,20,32,0.2)',
                        borderBottom: i < filtered.length - 1 ? '1px solid rgba(79,195,247,0.04)' : 'none',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(79,195,247,0.05)'}
                      onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? 'rgba(13,27,42,0.4)' : 'rgba(9,20,32,0.2)'}
                    >
                      {/* Ticker */}
                      <span className="text-sm font-bold text-slate-100">{row.ticker}</span>

                      {/* Giá */}
                      <span className="text-sm font-num text-right font-semibold" style={{ color: changeColor }}>
                        {row.close ? (row.close / 1000).toFixed(1) : '–'}
                      </span>

                      {/* % thay đổi */}
                      <div className="flex justify-end">
                        <span
                          className="text-xs font-bold font-num px-1.5 py-0.5 rounded-full"
                          style={{ color: changeColor, background: `${changeColor}15` }}
                        >
                          {isUp ? '▲' : isDown ? '▼' : '='} {Math.abs(row.change_pct ?? 0).toFixed(2)}%
                        </span>
                      </div>

                      {/* Volume */}
                      <span className="text-xs text-slate-400 font-num text-right">{fmtVol(row.volume)}</span>

                      {/* P/E */}
                      <span className="text-xs text-slate-300 font-num text-right">
                        {row.pe != null ? row.pe.toFixed(1) : '–'}
                      </span>

                      {/* P/B */}
                      <span className="text-xs text-slate-300 font-num text-right">
                        {row.pb != null ? row.pb.toFixed(1) : '–'}
                      </span>

                      {/* ROE */}
                      <span
                        className="text-xs font-num text-right font-semibold"
                        style={{ color: (row.roe || 0) >= 20 ? '#4ade80' : (row.roe || 0) >= 15 ? '#facc15' : '#94a3b8' }}
                      >
                        {row.roe != null ? row.roe.toFixed(1) : '–'}%
                      </span>

                      {/* Sàn */}
                      <span
                        className="text-xs font-semibold text-center"
                        style={{ color: '#4fc3f7' }}
                      >
                        {row.exchange || '–'}
                      </span>

                      {/* Phân tích */}
                      <div className="flex justify-end">
                        <button
                          onClick={() => navigate(`/analyze?ticker=${row.ticker}&exchange=${row.exchange || 'HOSE'}&autorun=1`)}
                          className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg cursor-pointer border-none transition-all"
                          style={{ background: 'rgba(79,195,247,0.1)', color: '#4fc3f7', border: '1px solid rgba(79,195,247,0.2)' }}
                        >
                          <Zap size={11} />
                          AI
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <p className="text-xs text-slate-600 text-center">
            📊 Dữ liệu định kỳ từ VNStock • Nhấn cột tiêu đề để sắp xếp
          </p>
        </div>
      </div>
    </div>
  );
}
