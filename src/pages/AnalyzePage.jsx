// ===== TRANG PHÂN TÍCH CỔ PHIẾU =====

import { useState, useCallback, useEffect } from 'react';
import { AlertCircle, Settings, GitCompare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
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

// So sánh đường giá 2 mã (normalize về 100 để so tỷ lệ %)
const CompareChart = ({ data1, data2, ticker1, ticker2 }) => {
  if (!data1?.length || !data2?.length) return null;
  const ref1 = data1[0].close;
  const ref2 = data2[0].close;
  const norm1 = data1.map(d => ({ ...d, close: (d.close / ref1) * 100 }));
  const norm2 = data2.map(d => ({ ...d, close: (d.close / ref2) * 100 }));

  const allVals = [...norm1, ...norm2].map(d => d.close);
  const minV = Math.min(...allVals);
  const maxV = Math.max(...allVals);
  const range = maxV - minV || 1;
  const w = 560, h = 160, padL = 30, padB = 20, padT = 10;
  const chartW = w - padL - 10;
  const chartH = h - padB - padT;

  const toPath = (data) => {
    const step = chartW / Math.max(data.length - 1, 1);
    return data.map((d, i) => {
      const x = padL + i * step;
      const y = padT + chartH - ((d.close - minV) / range) * chartH;
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
  };

  const last1 = norm1[norm1.length - 1]?.close;
  const last2 = norm2[norm2.length - 1]?.close;

  return (
    <div>
      <div className="flex items-center gap-4 mb-2 text-xs">
        <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 inline-block rounded" style={{ background: '#4fc3f7' }} /><b className="text-slate-200">{ticker1}</b> <span style={{ color: last1 >= 100 ? '#4ade80' : '#f87171' }}>{(last1 - 100).toFixed(1)}%</span></span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 inline-block rounded" style={{ background: '#fb923c' }} /><b className="text-slate-200">{ticker2}</b> <span style={{ color: last2 >= 100 ? '#4ade80' : '#f87171' }}>{(last2 - 100).toFixed(1)}%</span></span>
        <span className="text-slate-600">· So với điểm khởi đầu (100%)</span>
      </div>
      <div className="overflow-x-auto">
        <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: 'block' }}>
          <line x1={padL} y1={padT} x2={padL} y2={padT + chartH} stroke="rgba(79,195,247,0.1)" strokeWidth="1" />
          {[0, 0.5, 1].map(pct => {
            const y = padT + chartH - pct * chartH;
            return <line key={pct} x1={padL} y1={y} x2={w - 10} y2={y} stroke="rgba(79,195,247,0.06)" strokeWidth="1" strokeDasharray="3,3" />;
          })}
          {/* baseline 100% */}
          <line
            x1={padL} y1={padT + chartH - ((100 - minV) / range) * chartH}
            x2={w - 10} y2={padT + chartH - ((100 - minV) / range) * chartH}
            stroke="rgba(255,255,255,0.08)" strokeWidth="1" strokeDasharray="4,4"
          />
          <path d={toPath(norm1)} fill="none" stroke="#4fc3f7" strokeWidth="1.5" />
          <path d={toPath(norm2)} fill="none" stroke="#fb923c" strokeWidth="1.5" />
        </svg>
      </div>
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
  const [compareTicker, setCompareTicker] = useState('');
  const [compareAnalyzed, setCompareAnalyzed] = useState(false);

  const { loading: aiLoading, analyze } = useClaude();
  const stock1 = useStockData();
  const stock2 = useStockData(); // cho so sánh

  const addToHistory = useAppStore((s) => s.addToHistory);
  const updateSignal = useWatchlist((s) => s.updateSignal);
  const settings = useAppStore((s) => s.settings);
  const navigate = useNavigate();

  // Fetch chart data khi thay đổi period
  useEffect(() => {
    if (!currentParams) return;
    stock1.fetchAll(currentParams.ticker, chartPeriod);
    if (compareMode && compareAnalyzed && compareTicker.trim()) {
      stock2.fetchAll(compareTicker.trim().toUpperCase(), chartPeriod);
    }
  }, [chartPeriod, currentParams, compareMode, compareAnalyzed]);

  const handleAnalyze = useCallback(async ({ ticker, exchange, timeframe, sources }) => {
    setCurrentParams({ ticker, exchange, timeframe });
    setResult(null);
    setCompareAnalyzed(false);

    await stock1.fetchAll(ticker, chartPeriod);

    const prompt = buildAnalysisPrompt({ ticker, exchange, timeframe, sources });
    const aiResult = await analyze({
      systemPrompt: STOCK_ANALYST_SYSTEM_PROMPT,
      userPrompt: prompt,
    });

    if (aiResult) {
      setResult(aiResult);
      // Nếu đang ở compare mode, fetch mã thứ 2 song song
      if (compareMode && compareTicker.trim()) {
        stock2.fetchAll(compareTicker.trim().toUpperCase(), chartPeriod);
        setCompareAnalyzed(true);
      }
    }
  }, [analyze, stock1.fetchAll, stock2.fetchAll, chartPeriod, compareMode, compareTicker]);

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
                className="flex items-center gap-2 w-full text-left"
              >
                <GitCompare size={14} className={compareMode ? 'text-cyan-400' : 'text-slate-500'} />
                <span className={`text-xs font-semibold ${compareMode ? 'text-cyan-400' : 'text-slate-400'}`}>
                  So sánh 2 mã cổ phiếu
                </span>
                <span className={`ml-auto text-xs px-2 py-0.5 rounded-full ${compareMode ? 'bg-cyan-500/20 text-cyan-400' : 'bg-slate-700 text-slate-500'}`}>
                  {compareMode ? 'Bật' : 'Tắt'}
                </span>
              </button>

              {compareMode && (
                <div className="flex gap-2 animate-fade-in-up">
                  <input
                    type="text"
                    value={compareTicker}
                    onChange={e => setCompareTicker(e.target.value.toUpperCase())}
                    placeholder="Mã so sánh (VD: VCB)"
                    className="input-dark flex-1 text-sm"
                    maxLength={10}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && compareTicker.trim() && currentParams) {
                        stock2.fetchAll(compareTicker.trim(), chartPeriod);
                        setCompareAnalyzed(true);
                        toast.success(`Đã tải dữ liệu ${compareTicker}`);
                      }
                    }}
                  />
                  <button
                    onClick={() => {
                      if (!compareTicker.trim() || !currentParams) return;
                      stock2.fetchAll(compareTicker.trim(), chartPeriod);
                      setCompareAnalyzed(true);
                      toast.success(`Đang tải dữ liệu ${compareTicker}...`);
                    }}
                    disabled={!compareTicker.trim() || !currentParams}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                    style={{
                      background: 'rgba(79,195,247,0.15)',
                      color: '#4fc3f7',
                      border: '1px solid rgba(79,195,247,0.3)',
                    }}
                  >
                    Tải
                  </button>
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
                          {compareAnalyzed && compareTicker && ` vs ${compareTicker}`}
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
                        {compareMode && compareAnalyzed && stock2.ohlcv.length > 0 ? (
                          <CompareChart
                            data1={stock1.ohlcv}
                            data2={stock2.ohlcv}
                            ticker1={currentParams?.ticker}
                            ticker2={compareTicker}
                          />
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
                      <QuarterlyChart ticker={currentParams?.ticker} quarterlyData={null} />
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
