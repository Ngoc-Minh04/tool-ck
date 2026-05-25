// ===== TRANG PHÂN TÍCH CỔ PHIẾU =====

import { useState, useCallback, useEffect } from 'react';
import { AlertCircle, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import TickerForm from '../components/Analysis/TickerForm';
import ResultCard from '../components/Analysis/ResultCard';
import CandlestickChart from '../components/Chart/CandlestickChart';
import VolumeChart from '../components/Chart/VolumeChart';
import IndicatorPanel from '../components/Chart/IndicatorPanel';
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
  { value: '1M', label: '1 Tháng' },
  { value: '3M', label: '3 Tháng' },
  { value: '6M', label: '6 Tháng' },
  { value: '1Y', label: '1 Năm' },
];

const CHART_TABS = [
  { value: 'candle', label: '🕯️ Nến' },
  { value: 'indicators', label: '📊 Chỉ báo' },
];

const AnalyzePage = () => {
  const [result, setResult] = useState(null);
  const [currentParams, setCurrentParams] = useState(null);
  const [chartPeriod, setChartPeriod] = useState('3M');
  const [chartTab, setChartTab] = useState('candle');
  const [showBB, setShowBB] = useState(false);

  const { loading: aiLoading, analyze } = useClaude();
  const { loading: stockLoading, ohlcv: ohlcvData, info: stockInfo, sr, fetchAll } = useStockData();
  const addToHistory = useAppStore((s) => s.addToHistory);
  const updateSignal = useWatchlist((s) => s.updateSignal);
  const settings = useAppStore((s) => s.settings);
  const navigate = useNavigate();

  // Fetch chart data khi thay đổi period
  useEffect(() => {
    if (!currentParams) return;
    fetchAll(currentParams.ticker, chartPeriod);
  }, [chartPeriod, currentParams, fetchAll]);

  const handleAnalyze = useCallback(async ({ ticker, exchange, timeframe, sources }) => {
    setCurrentParams({ ticker, exchange, timeframe });
    setResult(null);

    // Fetch song song từ API backend hoặc mock offline
    await fetchAll(ticker, chartPeriod);

    // Gọi Claude AI
    const prompt = buildAnalysisPrompt({ ticker, exchange, timeframe, sources });
    const aiResult = await analyze({
      systemPrompt: STOCK_ANALYST_SYSTEM_PROMPT,
      userPrompt: prompt,
    });

    if (aiResult) {
      setResult(aiResult);
    }
  }, [analyze, fetchAll, chartPeriod]);

  const handleSaveToHistory = useCallback(() => {
    if (!result || !currentParams) return;

    // Trích xuất tín hiệu BUY/HOLD/SELL từ nội dung phân tích
    let signal = 'HOLD';
    const textUpper = result.toUpperCase();
    if (
      textUpper.includes('MUA') || 
      textUpper.includes('BUY') || 
      textUpper.includes('TÍNH HIỆU: BUY') ||
      textUpper.includes('KHUYẾN NGHỊ: BUY') ||
      textUpper.includes('KHUYẾN NGHỊ MUA')
    ) {
      signal = 'BUY';
    } else if (
      textUpper.includes('BÁN') || 
      textUpper.includes('SELL') || 
      textUpper.includes('TÍN HIỆU: SELL') ||
      textUpper.includes('KHUYẾN NGHỊ: SELL') ||
      textUpper.includes('KHUYẾN NGHỊ BÁN')
    ) {
      signal = 'SELL';
    }

    addToHistory({
      ticker: currentParams.ticker,
      exchange: currentParams.exchange,
      timeframe: currentParams.timeframe,
      result,
      stockInfo,
      signal, // Lưu tín hiệu để dùng cho phần History và Watchlist
    });

    // Cập nhật tín hiệu mới cho Watchlist
    updateSignal(currentParams.ticker, signal);
    toast.success('Đã lưu phân tích và cập nhật tín hiệu Watchlist!');
  }, [result, currentParams, stockInfo, addToHistory, updateSignal]);

  const hasKey = (settings.apiKey && !settings.apiKey.includes('DÁN_KEY_CỦA_BẠN_VÀO_ĐÂY') && settings.apiKey.trim() !== '' && settings.apiKey !== 'sk-ant-api03-' && settings.apiKey !== 'your_key_here') || 
                 (import.meta.env.VITE_ANTHROPIC_API_KEY && !import.meta.env.VITE_ANTHROPIC_API_KEY.includes('DÁN_KEY_CỦA_BẠN_VÀO_ĐÂY') && import.meta.env.VITE_ANTHROPIC_API_KEY.trim() !== '' && import.meta.env.VITE_ANTHROPIC_API_KEY !== 'sk-ant-api03-' && import.meta.env.VITE_ANTHROPIC_API_KEY !== 'your_key_here');

  const isLoading = aiLoading || stockLoading;

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
          </div>

          {/* Right Column: Charts + Results */}
          <div className="xl:col-span-2 space-y-4">
            {/* Chart Area */}
            {(ohlcvData.length > 0 || isLoading) && (
              <div className="glass-card p-4">
                {/* Chart Controls */}
                <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                  <div className="flex items-center gap-3">
                    {currentParams && (
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-slate-200">
                          {currentParams.ticker} · {currentParams.exchange}
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
                    {/* BB Toggle */}
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

                    {/* Period Tabs */}
                    <Tabs tabs={CHART_PERIODS} activeTab={chartPeriod} onChange={setChartPeriod} />
                  </div>
                </div>

                {/* Chart Tabs */}
                <div className="mb-3">
                  <Tabs tabs={CHART_TABS} activeTab={chartTab} onChange={setChartTab} />
                </div>

                {stockLoading ? (
                  <div className="space-y-2">
                    <div className="skeleton h-48 w-full rounded" />
                    <div className="skeleton h-16 w-full rounded" />
                  </div>
                ) : (
                  <>
                    {chartTab === 'candle' ? (
                      <>
                        <CandlestickChart data={ohlcvData} showMA={true} showBB={showBB} sr={sr} height={300} />
                        <div style={{ borderTop: '1px solid rgba(79,195,247,0.08)', marginTop: 4 }}>
                          <VolumeChart data={ohlcvData} height={80} />
                        </div>
                      </>
                    ) : (
                      <IndicatorPanel data={ohlcvData} />
                    )}
                  </>
                )}
              </div>
            )}

            {/* AI Result */}
            {aiLoading && !result && (
              <div className="space-y-3">
                <SkeletonCard />
                <SkeletonCard />
              </div>
            )}

            {result && (
              <ResultCard
                result={result}
                ticker={currentParams?.ticker}
                exchange={currentParams?.exchange}
                timeframe={currentParams?.timeframe}
                stockInfo={stockInfo}
                onSave={handleSaveToHistory}
              />
            )}

            {/* Welcome State */}
            {!result && !isLoading && ohlcvData.length === 0 && (
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
