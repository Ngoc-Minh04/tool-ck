// ===== TRANG PHÂN TÍCH CỔ PHIẾU =====

import { useState, useCallback, useEffect } from 'react';
import { AlertCircle, Settings, GitCompare } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import TickerForm from '../components/Analysis/TickerForm';
import ResultCard from '../components/Analysis/ResultCard';
import FundamentalsTab from '../components/Analysis/FundamentalsTab';
import CandlestickChart from '../components/Chart/CandlestickChart';
import VolumeChart from '../components/Chart/VolumeChart';
import IndicatorPanel from '../components/Chart/IndicatorPanel';
import QuarterlyChart from '../components/Chart/QuarterlyChart';
import { Tabs, SkeletonCard, Button } from '../components/UI';
import Header from '../components/Layout/Header';
import useClaude from '../hooks/useClaude';
import useStockData from '../hooks/useStockData';
import useAppStore from '../store/appStore';
import WatchlistButton from '../components/Analysis/WatchlistButton';
import useWatchlist from '../store/watchlistStore';
import toast from 'react-hot-toast';
import { STOCK_ANALYST_SYSTEM_PROMPT, buildAnalysisPrompt } from '../constants/prompts';
import { stockApi } from '../services/stockApi';

const CHART_PERIODS = [
  { value: '1M', label: '1T' },
  { value: '3M', label: '3T' },
  { value: '6M', label: '6T' },
  { value: '1Y', label: '1N' },
];

const CHART_TABS = [
  { value: 'candle', label: '🕯️ Nến' },
  { value: 'indicators', label: '📊 Chỉ báo' },
  { value: 'quarterly', label: '📋 Tài chính' },
];

const INFO_TABS = [
  { value: 'result', label: '🤖 Kết quả AI' },
  { value: 'fundamentals', label: '📐 Cơ bản' },
];

// So sánh đường giá nhiều mã (normalize về 100 để so tỷ lệ %)
const CompareChart = ({ datasets }) => {
  const activeDatasets = datasets.filter(d => d.data && d.data.length > 0 && d.ticker);
  if (activeDatasets.length === 0) return null;

  // Tính toán mảng chuẩn hóa
  const normalizedSets = activeDatasets.map(ds => {
    const ref = ds.data[0].close || 1;
    return {
      ticker: ds.ticker,
      color: ds.color,
      data: ds.data.map(d => ({ ...d, close: (d.close / ref) * 100 })),
    };
  });

  // Tìm min, max chung
  const allVals = normalizedSets.flatMap(ns => ns.data.map(d => d.close));
  const minV = Math.min(...allVals, 100); // Đảm bảo mốc 100% nằm trong tầm hiển thị
  const maxV = Math.max(...allVals, 100);
  const range = maxV - minV || 1;

  const w = 720, h = 220, padL = 45, padB = 25, padT = 15;
  const chartW = w - padL - 15;
  const chartH = h - padB - padT;

  const toPath = (data) => {
    const step = chartW / Math.max(data.length - 1, 1);
    return data.map((d, i) => {
      const x = padL + i * step;
      const y = padT + chartH - ((d.close - minV) / range) * chartH;
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
  };

  return (
    <div className="space-y-3">
      {/* Legends */}
      <div className="flex flex-wrap items-center gap-3 text-xs">
        {normalizedSets.map(ns => {
          const lastVal = ns.data[ns.data.length - 1]?.close || 100;
          const pct = lastVal - 100;
          return (
            <span key={ns.ticker} className="flex items-center gap-1.5 bg-slate-800/40 dark:bg-slate-900/60 px-2.5 py-1 rounded-lg border border-slate-700/50">
              <span className="w-2.5 h-2.5 rounded-full inline-block animate-pulse-cyan" style={{ backgroundColor: ns.color }} />
              <b className="text-slate-200 dark:text-slate-100 font-semibold">{ns.ticker}</b>
              <span style={{ color: pct >= 0 ? '#4ade80' : '#f87171' }} className="font-mono">
                {pct >= 0 ? '+' : ''}{pct.toFixed(1)}%
              </span>
            </span>
          );
        })}
        <span className="text-slate-500 text-[10px] ml-auto">· So với điểm khởi đầu (100%)</span>
      </div>

      {/* SVG Chart */}
      <div className="overflow-x-auto select-none rounded-xl border border-slate-800/40 bg-slate-950/20 p-2">
        <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="xMidYMid meet" className="overflow-visible">
          {/* Lưới ngang */}
          {[0, 0.25, 0.5, 0.75, 1].map(pct => {
            const y = padT + chartH - pct * chartH;
            const val = minV + pct * range;
            return (
              <g key={pct}>
                <line x1={padL} y1={y} x2={w - 10} y2={y} stroke="rgba(79,195,247,0.05)" strokeWidth="1" strokeDasharray="3,3" />
                <text x={padL - 8} y={y + 3} fill="currentColor" className="text-[9px] text-slate-500 font-mono text-right" textAnchor="end">
                  {val.toFixed(0)}%
                </text>
              </g>
            );
          })}

          {/* baseline 100% */}
          {minV <= 100 && maxV >= 100 && (
            <line
              x1={padL} y1={padT + chartH - ((100 - minV) / range) * chartH}
              x2={w - 10} y2={padT + chartH - ((100 - minV) / range) * chartH}
              stroke="rgba(255,255,255,0.12)" strokeWidth="1" strokeDasharray="4,4"
            />
          )}

          {/* Vẽ các đường giá */}
          {normalizedSets.map(ns => (
            <path key={ns.ticker} d={toPath(ns.data)} fill="none" stroke={ns.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-all duration-300" />
          ))}
        </svg>
      </div>
    </div>
  );
};

// Bảng so sánh trực diện các chỉ số cơ bản của 4 mã
const CompareTable = ({ stocks }) => {
  const activeStocks = stocks.filter(s => s.info && s.ticker);
  if (activeStocks.length === 0) return null;

  const rows = [
    { label: 'Tên công ty', key: 'company_name', format: v => v || 'N/A' },
    { label: 'Ngành', key: 'industry', format: v => v || 'N/A' },
    { 
      label: 'Giá hiện tại', 
      key: 'currentPrice', 
      format: (v, item) => {
        if (!v) return 'N/A';
        const change = (item?.change || 0) * 100;
        return (
          <div className="font-mono">
            <span className="font-bold">{v.toLocaleString()} đ</span>
            <span className={`ml-1.5 text-[11px] font-semibold ${change >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              ({change >= 0 ? '+' : ''}{change.toFixed(2)}%)
            </span>
          </div>
        );
      } 
    },
    { 
      label: 'Vốn hóa (Tỷ VNĐ)', 
      key: 'marketCap', 
      subKey: 'fundamentals',
      format: v => v ? (v / 1e9).toLocaleString(undefined, { maximumFractionDigits: 1 }) : 'N/A' 
    },
    { 
      label: 'P/E', 
      key: 'pe', 
      subKey: 'fundamentals',
      format: v => v ? v.toFixed(2) : 'N/A' 
    },
    { 
      label: 'P/B', 
      key: 'pb', 
      subKey: 'fundamentals',
      format: v => v ? v.toFixed(2) : 'N/A' 
    },
    { 
      label: 'ROE (%)', 
      key: 'roe', 
      subKey: 'fundamentals',
      format: v => v ? `${(v * 100).toFixed(1)}%` : 'N/A' 
    },
    { 
      label: 'ROA (%)', 
      key: 'roa', 
      subKey: 'fundamentals',
      format: v => v ? `${(v * 100).toFixed(1)}%` : 'N/A' 
    },
    { 
      label: 'EPS (đ)', 
      key: 'eps', 
      subKey: 'fundamentals',
      format: v => v ? Math.round(v).toLocaleString() : 'N/A' 
    },
    { 
      label: 'Khối ngoại mua ròng', 
      key: 'foreignNet', 
      format: v => {
        if (!v) return '0';
        const val = v / 1e9; // Đổi ra tỷ đồng
        return (
          <span className={`font-mono font-semibold ${val >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {val >= 0 ? '+' : ''}{val.toFixed(2)} Tỷ
          </span>
        );
      } 
    },
  ];

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-800/40 bg-slate-900/10 dark:bg-slate-950/20">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-slate-800/60 bg-slate-800/20 dark:bg-slate-900/40">
            <th className="p-3 text-xs font-semibold text-slate-400 w-1/4">Chỉ số</th>
            {activeStocks.map(s => (
              <th key={s.ticker} className="p-3 text-xs font-bold text-slate-200" style={{ borderLeft: '1px solid rgba(255,255,255,0.04)' }}>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: s.color }} />
                  <span>{s.ticker}</span>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/30 text-xs">
          {rows.map(row => (
            <tr key={row.label} className="hover:bg-slate-800/10 dark:hover:bg-slate-900/20 transition-all">
              <td className="p-3 font-semibold text-slate-400">{row.label}</td>
              {activeStocks.map(s => {
                const val = row.subKey ? s.info?.[row.subKey]?.[row.key] : s.info?.[row.key];
                return (
                  <td key={s.ticker} className="p-3 text-slate-300" style={{ borderLeft: '1px solid rgba(255,255,255,0.04)' }}>
                    {row.format(val, s.info)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const AnalyzePage = () => {
  const [result, setResult] = useState(null);
  const [currentParams, setCurrentParams] = useState(null);
  const [chartPeriod, setChartPeriod] = useState('3M');
  const [chartTab, setChartTab] = useState('candle');
  const [infoTab, setInfoTab] = useState('result');
  const [showBB, setShowBB] = useState(false);
  const [compareMode, setCompareMode] = useState(false);
  const [compareTickers, setCompareTickers] = useState([]);
  const [compareInput, setCompareInput] = useState('');
  const [quarterlyData, setQuarterlyData] = useState(null);

  const [searchParams] = useSearchParams();

  const { loading: aiLoading, analyze } = useClaude();
  const stock1 = useStockData(); // Mã chính
  const stock2 = useStockData(); // Mã phụ 1
  const stock3 = useStockData(); // Mã phụ 2
  const stock4 = useStockData(); // Mã phụ 3

  const addToHistory = useAppStore((s) => s.addToHistory);
  const updateSignal = useWatchlist((s) => s.updateSignal);
  const settings = useAppStore((s) => s.settings);
  const navigate = useNavigate();

  // Autorun khi điến từ Watchlist/Screener với ?autorun=1
  useEffect(() => {
    const ticker   = searchParams.get('ticker');
    const exchange = searchParams.get('exchange') || 'HOSE';
    const autorun  = searchParams.get('autorun');
    if (ticker && autorun === '1') {
      handleAnalyze({ ticker, exchange, timeframe: 'T3', sources: settings.sources });
    }
  }, []); // chỉ chạy 1 lần khi mount

  // Fetch chart data khi thay đổi period
  useEffect(() => {
    if (!currentParams) return;
    stock1.fetchAll(currentParams.ticker, chartPeriod);
  }, [chartPeriod, currentParams]);

  useEffect(() => {
    if (!compareMode || !currentParams) return;
    if (compareTickers[0]) stock2.fetchAll(compareTickers[0], chartPeriod);
    if (compareTickers[1]) stock3.fetchAll(compareTickers[1], chartPeriod);
    if (compareTickers[2]) stock4.fetchAll(compareTickers[2], chartPeriod);
  }, [chartPeriod, compareMode, compareTickers, currentParams]);

  const handleAddCompare = useCallback(() => {
    const t = compareInput.trim().toUpperCase();
    if (!t) return;
    if (!currentParams) {
      toast.error('Vui lòng phân tích mã chính trước!');
      return;
    }
    if (t === currentParams.ticker) {
      toast.error('Không thể so sánh trùng với mã chính!');
      return;
    }
    if (compareTickers.includes(t)) {
      toast.error('Mã này đã có trong danh sách so sánh!');
      return;
    }
    if (compareTickers.length >= 3) {
      toast.error('Tối đa so sánh 4 mã (1 chính + 3 phụ)!');
      return;
    }

    setCompareTickers(prev => [...prev, t]);
    setCompareInput('');
    toast.success(`Đang tải dữ liệu so sánh cho ${t}...`);
  }, [compareInput, compareTickers, currentParams]);

  const handleRemoveCompare = useCallback((t) => {
    setCompareTickers(prev => prev.filter(item => item !== t));
    toast.success(`Đã xóa ${t}`);
  }, []);

  const handleAnalyze = useCallback(async ({ ticker, exchange, timeframe, sources }) => {
    setCurrentParams({ ticker, exchange, timeframe });
    setResult(null);
    setCompareTickers([]); // Reset so sánh khi đổi mã chính
    setQuarterlyData(null);

    const [liveData] = await Promise.all([
      stock1.fetchAll(ticker, chartPeriod),
    ]);

    // Fetch quarterly tài chính song song (không block AI)
    stockApi.getQuarterly(ticker)
      .then(res => setQuarterlyData(res?.data || null))
      .catch(() => setQuarterlyData(null));

    const prompt = buildAnalysisPrompt({
      ticker,
      exchange,
      timeframe,
      sources,
      info: liveData?.info,
      technicals: liveData?.technicals
    });
    const aiResult = await analyze({
      systemPrompt: STOCK_ANALYST_SYSTEM_PROMPT,
      userPrompt: prompt,
    });

    if (aiResult) {
      setResult(aiResult);
    }
  }, [analyze, stock1.fetchAll, chartPeriod]);

  const handleReanalyze = useCallback(() => {
    if (!currentParams) return;
    handleAnalyze({
      ticker: currentParams.ticker,
      exchange: currentParams.exchange,
      timeframe: currentParams.timeframe,
      sources: settings.sources,
    });
  }, [currentParams, settings.sources, handleAnalyze]);

  const handleSaveToHistory = useCallback(() => {
    if (!result || !currentParams) return;

    let signal = 'HOLD';
    const textUpper = result.toUpperCase();
    if (textUpper.includes('MUA') || textUpper.includes('BUY') || textUpper.includes('KHUYẾN NGHỊ MUA')) {
      signal = 'BUY';
    } else if (textUpper.includes('BÁN') || textUpper.includes('SELL') || textUpper.includes('KHUYẾN NGHỊ BÁN')) {
      signal = 'SELL';
    }

    addToHistory({
      ticker: currentParams.ticker,
      exchange: currentParams.exchange,
      timeframe: currentParams.timeframe,
      result,
      stockInfo: stock1.info,
      signal,
    });
    updateSignal(currentParams.ticker, signal);
    toast.success('Đã lưu phân tích và cập nhật tín hiệu Watchlist!');
  }, [result, currentParams, stock1.info, addToHistory, updateSignal]);

  const hasKey = (settings.apiKey && !settings.apiKey.includes('DÁN_KEY_CỦA_BẠN_VÀO_ĐÂY') && settings.apiKey.trim() !== '' && settings.apiKey !== 'sk-ant-api03-' && settings.apiKey !== 'your_key_here') ||
    (import.meta.env.VITE_ANTHROPIC_API_KEY && !import.meta.env.VITE_ANTHROPIC_API_KEY.includes('DÁN_KEY_CỦA_BẠN_VÀO_ĐÂY') && import.meta.env.VITE_ANTHROPIC_API_KEY.trim() !== '' && import.meta.env.VITE_ANTHROPIC_API_KEY !== 'sk-ant-api03-' && import.meta.env.VITE_ANTHROPIC_API_KEY !== 'your_key_here');

  const isLoading = aiLoading || stock1.loading;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title="Phân tích cổ phiếu" />

      <div className="flex-1 overflow-y-auto p-6">
        {/* API Key Warning */}
        {!hasKey && (
          <div
            className="flex items-center gap-3 p-4 rounded-xl mb-6 animate-fade-in-up"
            style={{ background: 'rgba(255,179,0,0.08)', border: '1px solid rgba(255,179,0,0.25)' }}
          >
            <AlertCircle size={18} color="#ffb300" />
            <div className="flex-1 text-sm text-yellow-300">
              Chưa cấu hình API Key. Bạn cần nhập Anthropic API Key (hoặc Gemini/OpenAI Key) để sử dụng tính năng phân tích AI.
            </div>
            <Button variant="outline" size="sm" onClick={() => navigate('/settings')} icon={Settings}>
              Cài đặt
            </Button>
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Left Column: Form */}
          <div className="xl:col-span-1 space-y-4">
            <TickerForm onAnalyze={handleAnalyze} loading={isLoading} />

            {/* Compare Mode Toggle */}
            <div
              className="glass-card p-4 space-y-3"
            >
              <button
                onClick={() => setCompareMode(p => !p)}
                className="flex items-center gap-2 w-full text-left cursor-pointer"
              >
                <GitCompare size={14} className={compareMode ? 'text-cyan-400' : 'text-slate-500'} />
                <span className={`text-xs font-semibold ${compareMode ? 'text-cyan-400' : 'text-slate-400'}`}>
                  So sánh nhiều mã (tối đa 4 mã)
                </span>
                <span className={`ml-auto text-xs px-2 py-0.5 rounded-full ${compareMode ? 'bg-cyan-500/20 text-cyan-400' : 'bg-slate-700 text-slate-500'}`}>
                  {compareMode ? 'Bật' : 'Tắt'}
                </span>
              </button>

              {compareMode && (
                <div className="space-y-3 animate-fade-in-up">
                  {/* Ô nhập thêm mã */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={compareInput}
                      onChange={e => setCompareInput(e.target.value.toUpperCase())}
                      placeholder="Mã so sánh (VD: TCB)"
                      className="input-dark flex-1 text-sm"
                      maxLength={10}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          handleAddCompare();
                        }
                      }}
                    />
                    <button
                      onClick={handleAddCompare}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer"
                      style={{
                        background: 'rgba(79,195,247,0.15)',
                        color: '#4fc3f7',
                        border: '1px solid rgba(79,195,247,0.3)',
                      }}
                    >
                      Thêm
                    </button>
                  </div>

                  {/* Danh sách các mã so sánh phụ */}
                  {compareTickers.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {compareTickers.map((t, idx) => {
                        const colors = ['#fb923c', '#a855f7', '#22c55e'];
                        return (
                          <span
                            key={t}
                            className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border font-semibold animate-fade-in-up"
                            style={{
                              borderColor: `${colors[idx]}40`,
                              background: `${colors[idx]}10`,
                              color: colors[idx],
                            }}
                          >
                            <span>{t}</span>
                            <button
                              onClick={() => handleRemoveCompare(t)}
                              className="hover:text-red-400 ml-1 border-none bg-transparent cursor-pointer text-xs font-bold font-mono"
                            >
                              ×
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Charts + Results */}
          <div className="xl:col-span-2 space-y-4">
            {/* Chart Area */}
            {(stock1.ohlcv.length > 0 || isLoading) && (
              <div className="glass-card p-4">
                {/* Chart Controls */}
                <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                  <div className="flex items-center gap-3">
                    {currentParams && (
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-slate-200">
                          {currentParams.ticker}
                          {compareMode && compareTickers.length > 0 && ` vs ${compareTickers.join(', ')}`}
                          · {currentParams.exchange}
                        </span>
                        <WatchlistButton ticker={currentParams.ticker} exchange={currentParams.exchange} />
                      </div>
                    )}
                    <div className="flex gap-1">
                      {['MA20', 'MA50', 'MA200'].map((ma) => (
                        <span key={ma} className="text-xs px-1.5 py-0.5 rounded" style={{
                          background: ma === 'MA20' ? 'rgba(79,195,247,0.15)' : ma === 'MA50' ? 'rgba(255,179,0,0.15)' : 'rgba(255,82,82,0.15)',
                          color: ma === 'MA20' ? '#4fc3f7' : ma === 'MA50' ? '#ffb300' : '#ff5252',
                          fontSize: 10,
                        }}>{ma}</span>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {chartTab === 'candle' && (
                      <button
                        onClick={() => setShowBB(!showBB)}
                        className="text-xs px-2 py-1 rounded cursor-pointer border-none transition-all"
                        style={{
                          background: showBB ? 'rgba(79,195,247,0.15)' : 'rgba(26,47,69,0.6)',
                          color: showBB ? '#4fc3f7' : '#4a6b8a',
                          border: `1px solid ${showBB ? 'rgba(79,195,247,0.3)' : 'transparent'}`,
                        }}
                      >
                        BB
                      </button>
                    )}
                    <Tabs tabs={CHART_PERIODS} activeTab={chartPeriod} onChange={setChartPeriod} />
                  </div>
                </div>

                {/* Chart Tabs */}
                <div className="mb-3">
                  <Tabs tabs={CHART_TABS} activeTab={chartTab} onChange={setChartTab} />
                </div>

                {stock1.loading ? (
                  <div className="space-y-2">
                    <div className="skeleton h-48 w-full rounded" />
                    <div className="skeleton h-16 w-full rounded" />
                  </div>
                ) : (
                  <>
                    {chartTab === 'candle' && (
                      <>
                        {compareMode && compareTickers.length > 0 ? (
                          <div className="space-y-6">
                            <CompareChart
                              datasets={[
                                { data: stock1.ohlcv, ticker: currentParams?.ticker, color: '#4fc3f7' },
                                { data: compareTickers[0] ? stock2.ohlcv : [], ticker: compareTickers[0], color: '#fb923c' },
                                { data: compareTickers[1] ? stock3.ohlcv : [], ticker: compareTickers[1], color: '#a855f7' },
                                { data: compareTickers[2] ? stock4.ohlcv : [], ticker: compareTickers[2], color: '#22c55e' },
                              ]}
                            />
                            <div className="pt-2">
                              <h3 className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2">
                                <GitCompare size={14} className="text-cyan-400 animate-pulse-cyan" />
                                So sánh chỉ số tài chính cùng ngành
                              </h3>
                              <CompareTable
                                stocks={[
                                  { info: stock1.info, ticker: currentParams?.ticker, color: '#4fc3f7' },
                                  { info: compareTickers[0] ? stock2.info : null, ticker: compareTickers[0], color: '#fb923c' },
                                  { info: compareTickers[1] ? stock3.info : null, ticker: compareTickers[1], color: '#a855f7' },
                                  { info: compareTickers[2] ? stock4.info : null, ticker: compareTickers[2], color: '#22c55e' },
                                ]}
                              />
                            </div>
                          </div>
                        ) : (
                          <>
                            <CandlestickChart data={stock1.ohlcv} showMA={true} showBB={showBB} sr={stock1.sr} height={300} />
                            <div style={{ borderTop: '1px solid rgba(79,195,247,0.08)', marginTop: 4 }}>
                              <VolumeChart data={stock1.ohlcv} height={80} />
                            </div>
                          </>
                        )}
                      </>
                    )}
                    {chartTab === 'indicators' && <IndicatorPanel data={stock1.ohlcv} />}
                    {chartTab === 'quarterly' && (
                      <QuarterlyChart ticker={currentParams?.ticker} quarterlyData={quarterlyData} />
                    )}
                  </>
                )}
              </div>
            )}

            {/* AI Result + Fundamentals Tabs */}
            {aiLoading && !result && (
              <div className="space-y-3">
                <SkeletonCard />
                <SkeletonCard />
              </div>
            )}

            {result && (
              <div className="space-y-3">
                <Tabs tabs={INFO_TABS} activeTab={infoTab} onChange={setInfoTab} />
                {infoTab === 'result' ? (
                  <ResultCard
                    result={result}
                    ticker={currentParams?.ticker}
                    exchange={currentParams?.exchange}
                    timeframe={currentParams?.timeframe}
                    stockInfo={stock1.info}
                    onSave={handleSaveToHistory}
                    onReanalyze={handleReanalyze}
                  />
                ) : (
                  <div className="glass-card p-5">
                    <FundamentalsTab info={stock1.info} ticker={currentParams?.ticker} />
                  </div>
                )}
              </div>
            )}

            {/* Welcome State */}
            {!result && !isLoading && stock1.ohlcv.length === 0 && (
              <div className="glass-card p-10 text-center animate-fade-in-up">
                <div className="text-6xl mb-4">📊</div>
                <h2 className="text-xl font-bold text-slate-200 mb-2">Bắt đầu phân tích</h2>
                <p className="text-sm text-slate-500 max-w-md mx-auto">
                  Nhập mã cổ phiếu ở bên trái, chọn sàn và khung thời gian, sau đó nhấn phân tích để nhận khuyến nghị AI chuyên sâu.
                </p>
                <div className="flex justify-center gap-3 mt-6 text-xs text-slate-600">
                  <span>🎯 Tín hiệu BUY/HOLD/SELL</span>
                  <span>·</span>
                  <span>📈 Biểu đồ kỹ thuật</span>
                  <span>·</span>
                  <span>💡 RSI, MACD, MA</span>
                  <span>·</span>
                  <span>📐 Cơ bản doanh nghiệp</span>
                  <span>·</span>
                  <span>⚖️ So sánh 2 mã</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyzePage;
