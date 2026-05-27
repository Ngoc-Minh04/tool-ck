// ===== TRANG PHÂN TÍCH CỔ PHIẾU =====

import { useState, useCallback, useEffect } from 'react';
import { AlertCircle, Settings, GitCompare } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip 
} from 'recharts';
import TickerForm from '../components/Analysis/TickerForm';
import ResultCard from '../components/Analysis/ResultCard';
import FundamentalsTab from '../components/Analysis/FundamentalsTab';
import CandlestickChart from '../components/Chart/CandlestickChart';
import VolumeChart from '../components/Chart/VolumeChart';
import IndicatorPanel from '../components/Chart/IndicatorPanel';
import QuarterlyChart from '../components/Chart/QuarterlyChart';
import VolumeProfile from '../components/Chart/VolumeProfile';
import { Tabs, SkeletonCard, Button } from '../components/UI';
import Header from '../components/Layout/Header';
import useClaude from '../hooks/useClaude';
import useStockData from '../hooks/useStockData';
import useAppStore from '../store/appStore';
import WatchlistButton from '../components/Analysis/WatchlistButton';
import useWatchlist from '../store/watchlistStore';
import toast from 'react-hot-toast';
import { 
  STOCK_ANALYST_SYSTEM_PROMPT, 
  buildAnalysisPrompt,
  STOCK_SENTIMENT_SYSTEM_PROMPT,
  buildSentimentPrompt
} from '../constants/prompts';
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
  { value: 'sentiment', label: '📰 Tâm lý Tin tức' },
  { value: 'prediction', label: '🔮 Dự báo AI' },
  { value: 'backtest', label: '🧪 Thử nghiệm AI' },
];

// ===== CUSTOM TOOLTIP CHO BIỂU ĐỒ DỰ BÁO =====
const CustomForecastTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const isUp = data.change_pct_from_now >= 0;
    return (
      <div className="p-3 bg-slate-950/90 backdrop-blur-md border border-slate-800 rounded-xl shadow-xl">
        <p className="text-[11px] font-bold text-slate-400 mb-1.5 font-num">
          {data.date.split('-').reverse().join('/')}
        </p>
        <div className="space-y-1 text-xs">
          <div className="flex justify-between items-center gap-6">
            <span className="text-slate-500">Giá dự báo:</span>
            <span className="font-extrabold text-slate-200 font-num">{(data.predicted).toLocaleString()} ₫</span>
          </div>
          <div className="flex justify-between items-center gap-6">
            <span className="text-slate-500">Khoảng dao động:</span>
            <span className="font-medium text-slate-400 font-num">
              {(data.lower).toLocaleString()} - {(data.upper).toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between items-center gap-6 pt-1 border-t border-slate-800/40">
            <span className="text-slate-500">Thay đổi dự tính:</span>
            <span className={`font-extrabold font-num ${isUp ? 'text-green-400' : 'text-red-400'}`}>
              {isUp ? '+' : ''}{data.change_pct_from_now}%
            </span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

// ===== TAB DỰ BÁO GIÁ (PROPHET) =====
const PredictionTab = ({ ticker, ohlcvData, sentimentData }) => {
  const [predData, setPredData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!ticker) return;
    setLoading(true);
    setError(null);
    const score = sentimentData?.score;
    stockApi.getPredict(ticker, 10, score)
      .then(res => { setPredData(res); })
      .catch(e => setError('Không thể tải dự báo. Thử lại sau.'))
      .finally(() => setLoading(false));
  }, [ticker, sentimentData?.score]);

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-16">
      <div className="animate-spin rounded-full h-10 w-10 border-2 border-cyan-400 border-t-transparent mb-3" />
      <p className="text-sm text-slate-400">Prophet đang tính toán dự báo...</p>
      <p className="text-xs text-slate-600 mt-1">Lần đầu có thể mất 15-30 giây</p>
    </div>
  );

  if (error || !predData) return (
    <div className="glass-card p-8 text-center">
      <div className="text-4xl mb-3">🔮</div>
      <p className="text-sm text-slate-400 mb-2">{error || 'Chưa có dữ liệu dự báo'}</p>
      <p className="text-xs text-slate-500">Cần phân tích mã cổ phiếu trước</p>
    </div>
  );

  if (!predData.success) return (
    <div className="glass-card p-6 text-center">
      <div className="text-3xl mb-2">⚠️</div>
      <p className="text-sm text-slate-400">{predData.error}</p>
    </div>
  );

  const { forecast, trend_label, trend_color, change_pct_10_sessions, accuracy_pct, last_price } = predData;

  const allPrices = forecast.flatMap(f => [f.lower, f.predicted, f.upper]);
  const minP = Math.min(...allPrices) * 0.995;
  const maxP = Math.max(...allPrices) * 1.005;

  let sentimentBadge = null;
  if (sentimentData && sentimentData.score !== undefined && sentimentData.score !== null) {
    const score = sentimentData.score;
    if (score >= 10) {
      sentimentBadge = (
        <div className="text-xs px-3 py-1.5 rounded-xl bg-green-500/10 border border-green-500/30 text-green-400 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span>Tâm lý Tích cực (+{score}): Đã tối ưu hóa xu hướng tăng</span>
        </div>
      );
    } else if (score <= -10) {
      sentimentBadge = (
        <div className="text-xs px-3 py-1.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
          <span>Tâm lý Tiêu cực ({score}): Đã tối ưu hóa xu hướng giảm</span>
        </div>
      );
    } else {
      sentimentBadge = (
        <div className="text-xs px-3 py-1.5 rounded-xl bg-slate-500/10 border border-slate-500/30 text-slate-400 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-slate-400" />
          <span>Tâm lý Trung tính ({score}): Giữ nguyên xu hướng gốc</span>
        </div>
      );
    }
  } else {
    sentimentBadge = (
      <div className="text-xs px-3 py-1.5 rounded-xl bg-amber-500/5 border border-amber-500/20 text-amber-500/80 flex items-center gap-1">
        <span>💡 Phân tích Tâm lý Tin tức để tối ưu hóa dự báo</span>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in-up">
      {/* Header Card */}
      <div
        className="p-4 rounded-2xl flex items-center justify-between gap-4 flex-wrap"
        style={{
          background: 'linear-gradient(135deg, rgba(13,27,42,0.9), rgba(6,40,60,0.7))',
          border: `1px solid ${trend_color}30`,
        }}
      >
        <div>
          <div className="text-[11px] text-slate-500 uppercase font-bold tracking-wider mb-1">Dự báo Prophet AI · 10 phiên tới</div>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-black" style={{ color: trend_color }}>{trend_label}</span>
            <span
              className="text-sm font-bold px-2 py-0.5 rounded-full"
              style={{ color: trend_color, background: trend_color + '15' }}
            >
              {change_pct_10_sessions >= 0 ? '+' : ''}{change_pct_10_sessions}%
            </span>
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Giá hiện tại: <span className="text-slate-300 font-semibold font-num">{(last_price).toLocaleString()} ₫</span>
            {accuracy_pct && <span className="ml-3">• Độ chính xác lịch sử: <span className="text-cyan-400 font-bold">{accuracy_pct}%</span></span>}
          </div>
        </div>
        <div className="flex flex-col sm:items-end gap-2">
          {sentimentBadge}
          <div
            className="text-[10px] px-2.5 py-1 rounded-lg text-slate-500 bg-slate-900/40 border border-slate-800 w-fit"
          >
            ⚠️ Chỉ mang tính tham khảo
          </div>
        </div>
      </div>

      {/* Forecast Chart */}
      <div className="glass-card p-4">
        <div className="text-xs font-semibold text-slate-400 mb-2 flex items-center justify-between">
          <span>📈 Biểu đồ vùng dự báo tương tác (80% confidence interval)</span>
          <span className="text-[10px] text-slate-500">Rê chuột vào biểu đồ để xem chi tiết</span>
        </div>
        <div className="w-full h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={forecast}
              margin={{ top: 15, right: 10, left: -10, bottom: 5 }}
            >
              <defs>
                <linearGradient id="forecastBand" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={trend_color} stopOpacity={0.25}/>
                  <stop offset="95%" stopColor={trend_color} stopOpacity={0.05}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.05)" vertical={false} />
              <XAxis
                dataKey="date"
                tickFormatter={(str) => {
                  if (!str) return '';
                  const parts = str.split('-');
                  return parts.length >= 3 ? `${parts[2]}/${parts[1]}` : str;
                }}
                stroke="#475569"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                dy={8}
              />
              <YAxis
                domain={[minP, maxP]}
                tickFormatter={(val) => `${(val / 1000).toFixed(1)}k`}
                stroke="#475569"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                dx={-2}
              />
              <Tooltip content={<CustomForecastTooltip />} />
              <Area
                name="Vùng dao động"
                type="monotone"
                dataKey={['lower', 'upper']}
                stroke="none"
                fill="url(#forecastBand)"
              />
              <Line
                name="Giá dự báo"
                type="monotone"
                dataKey="predicted"
                stroke={trend_color}
                strokeWidth={2.5}
                dot={{ r: 3, stroke: "#0f172a", strokeWidth: 1.5, fill: trend_color }}
                activeDot={{ r: 5, stroke: "#0f172a", strokeWidth: 2, fill: trend_color }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Forecast Table */}
      <div className="glass-card overflow-hidden">
        <div className="px-4 py-3 text-xs font-bold text-slate-300 border-b border-slate-800/50">Chi tiết dự báo từng phiên</div>
        <div className="divide-y divide-slate-800/30">
          {forecast.map((f, i) => {
            const range = maxP - minP || 1;
            return (
              <div key={f.date} className="grid px-4 py-2.5 text-xs animate-fade-in" style={{ gridTemplateColumns: '100px 1fr 100px 100px 100px', alignItems: 'center' }}>
                <span className="text-slate-500 font-num">{f.date.split('-').reverse().join('/')}</span>
                <div className="flex items-center">
                  <div className="flex-1 h-1.5 rounded-full bg-slate-800 overflow-hidden max-w-[120px]">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.min(100, Math.max(0, ((f.predicted - minP) / range) * 100))}%`,
                        background: trend_color,
                      }}
                    />
                  </div>
                </div>
                <span className="font-extrabold font-num text-right" style={{ color: f.change_pct_from_now >= 0 ? '#4ade80' : '#f87171' }}>
                  {(f.predicted).toLocaleString()} ₫
                </span>
                <span className="text-slate-500 font-num text-right">{(f.lower).toLocaleString()} ₫</span>
                <span className="text-slate-500 font-num text-right">{(f.upper).toLocaleString()} ₫</span>
              </div>
            );
          })}
        </div>
        <div className="px-4 py-2.5 text-[10px] text-slate-500 flex justify-between bg-slate-900/10">
          <span>Giá dự báo (₫)</span>
          <span>Vùng dao động 80% CI (Thấp — Cao)</span>
        </div>
      </div>

      <p className="text-[10px] text-slate-600 text-center">
        🤖 Model: Prophet (Meta) · Tích hợp chỉ báo tâm lý tin tức từ CafeF · Không phải khuyến nghị đầu tư
      </p>
    </div>
  );
};

// ===== CUSTOM TOOLTIP CHO BIỂU ĐỒ BACKTEST =====
const CustomBacktestTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="p-3 bg-slate-950/90 backdrop-blur-md border border-slate-800 rounded-xl shadow-xl font-num">
        <p className="text-[11px] font-bold text-slate-400 mb-1.5">
          {data.date.split('-').reverse().join('/')}
        </p>
        <div className="space-y-1 text-xs">
          <div className="flex justify-between items-center gap-6">
            <span className="text-slate-500">Tài sản (Equity):</span>
            <span className="font-extrabold text-cyan-400">{(data.equity).toLocaleString('vi-VN')} ₫</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

// ===== TAB THỬ NGHIỆM CHIẾN THUẬT (BACKTEST) =====
const BacktestTab = ({ ticker }) => {
  const [strategy, setStrategy] = useState('ma_cross');
  const [period, setPeriod] = useState('1y');
  const [initialCapital, setInitialCapital] = useState(100000000);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const formatCapital = (val) => {
    if (!val && val !== 0) return '';
    return val.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  const parseCapital = (str) => {
    const clean = str.replace(/\D/g, '');
    return clean ? parseInt(clean, 10) : 0;
  };

  const handleRunBacktest = () => {
    if (!ticker) return;
    setLoading(true);
    setError(null);
    setResult(null);

    stockApi.runBacktest({
      ticker,
      strategy,
      period,
      initial_capital: parseFloat(initialCapital)
    })
      .then(res => {
        if (res.total_trades !== undefined) {
          setResult(res);
        } else {
          setError('Không có kết quả kiểm thử nào được trả về.');
        }
      })
      .catch(e => {
        console.error(e);
        setError('Không thể chạy thử nghiệm. Vui lòng thử lại sau.');
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    handleRunBacktest();
  }, [ticker]);

  return (
    <div className="space-y-4 animate-fade-in-up">
      {/* Configuration Panel */}
      <div className="glass-card p-4 space-y-4 bg-slate-900/20">
        <div className="text-xs font-bold text-slate-300 uppercase tracking-wider">🧪 Cấu hình Mô phỏng</div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Strategy Select */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] text-slate-500 font-semibold">Chiến thuật giao dịch</label>
            <select
              value={strategy}
              onChange={(e) => setStrategy(e.target.value)}
              className="px-3 py-2 text-xs rounded-xl bg-slate-950/60 border border-slate-800 text-slate-300 focus:border-cyan-500/50 focus:outline-none"
            >
              <option value="ma_cross">Đường trung bình chéo (MA20/50)</option>
              <option value="rsi">Sức mạnh tương đối (RSI Bounce)</option>
              <option value="macd">Hội tụ phân kỳ (MACD Hist)</option>
            </select>
          </div>

          {/* Period Select */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] text-slate-500 font-semibold">Khung thời gian dữ liệu</label>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="px-3 py-2 text-xs rounded-xl bg-slate-950/60 border border-slate-800 text-slate-300 focus:border-cyan-500/50 focus:outline-none"
            >
              <option value="3mo">3 Tháng</option>
              <option value="6mo">6 Tháng</option>
              <option value="1y">1 Năm</option>
              <option value="2y">2 Năm</option>
            </select>
          </div>

          {/* Initial Capital */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] text-slate-500 font-semibold">Vốn ban đầu (VND)</label>
            <input
              type="text"
              value={formatCapital(initialCapital)}
              onChange={(e) => {
                const parsed = parseCapital(e.target.value);
                setInitialCapital(parsed);
              }}
              placeholder="Vốn ban đầu (VND)"
              className="px-3 py-2 text-xs rounded-xl bg-slate-950/60 border border-slate-800 text-slate-300 focus:border-cyan-500/50 focus:outline-none font-num"
            />
          </div>
        </div>

        <button
          onClick={handleRunBacktest}
          disabled={loading}
          className="w-full py-2.5 rounded-xl text-xs font-bold text-slate-950 bg-cyan-400 hover:bg-cyan-300 disabled:bg-slate-800 disabled:text-slate-500 cursor-pointer transition-all flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-slate-950 border-t-transparent" />
              Đang tính toán lịch sử lệnh...
            </>
          ) : (
            <>🧪 Chạy Thử nghiệm Chiến thuật</>
          )}
        </button>
      </div>

      {/* Main Results Display */}
      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-center text-xs">
          ⚠️ {error}
        </div>
      )}

      {result && (
        <div className="space-y-4">
          {/* Performance KPIs Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {/* ROI */}
            <div className="p-3 rounded-2xl bg-slate-900/40 border border-slate-800/60 flex flex-col justify-between">
              <span className="text-[10px] text-slate-500 font-semibold">Lợi nhuận (ROI)</span>
              <div className="mt-1.5 flex items-baseline gap-1">
                <span className={`text-lg font-extrabold font-num ${result.total_return >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {result.total_return >= 0 ? '+' : ''}{result.total_return}%
                </span>
              </div>
            </div>

            {/* Final Portfolio Value */}
            <div className="p-3 rounded-2xl bg-slate-900/40 border border-slate-800/60 flex flex-col justify-between col-span-2">
              <span className="text-[10px] text-slate-500 font-semibold">Tài sản cuối cùng</span>
              <div className="mt-1.5">
                <span className="text-base font-extrabold font-num text-slate-200">
                  {Math.round(initialCapital * (1 + result.total_return / 100)).toLocaleString('vi-VN')} ₫
                </span>
                <span className="text-[9px] text-slate-500 block">Vốn ban đầu: {initialCapital.toLocaleString('vi-VN')} ₫</span>
              </div>
            </div>

            {/* Win Rate */}
            <div className="p-3 rounded-2xl bg-slate-900/40 border border-slate-800/60 flex flex-col justify-between">
              <span className="text-[10px] text-slate-500 font-semibold">Tỷ lệ thắng</span>
              <div className="mt-1.5 flex items-baseline gap-1">
                <span className="text-lg font-extrabold font-num text-cyan-400">{result.win_rate}%</span>
              </div>
            </div>

            {/* Max Drawdown */}
            <div className="p-3 rounded-2xl bg-slate-900/40 border border-slate-800/60 flex flex-col justify-between">
              <span className="text-[10px] text-slate-500 font-semibold">Sụt giảm lớn nhất</span>
              <div className="mt-1.5 flex items-baseline gap-1">
                <span className="text-lg font-extrabold font-num text-amber-500">{result.max_drawdown}%</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {/* Sharpe Ratio */}
            <div className="p-3 rounded-2xl bg-slate-900/40 border border-slate-800/60 flex flex-col justify-between">
              <span className="text-[10px] text-slate-500 font-semibold">Chỉ số Sharpe</span>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-lg font-extrabold font-num text-purple-400">{result.sharpe_ratio}</span>
              </div>
            </div>

            {/* Total Trades */}
            <div className="p-3 rounded-2xl bg-slate-900/40 border border-slate-800/60 flex flex-col justify-between">
              <span className="text-[10px] text-slate-500 font-semibold">Tổng số giao dịch</span>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-lg font-extrabold font-num text-slate-200">{result.total_trades}</span>
                <span className="text-[10px] text-slate-500 font-semibold">lệnh đóng</span>
              </div>
            </div>

            {/* Note status */}
            <div className="p-3 rounded-2xl bg-slate-900/20 border border-slate-800/40 flex items-center col-span-3 text-[10px] text-slate-500 italic">
              💡 Chỉ số Sharpe &gt; 1.0 biểu thị chiến thuật có tỷ suất sinh lời tốt trên mỗi đơn vị biến động rủi ro. Sụt giảm lớn nhất (Max Drawdown) thể hiện rủi ro lớn nhất tài khoản từng gánh chịu.
            </div>
          </div>

          {/* Equity Curve Chart */}
          {result.equity_curve && result.equity_curve.length > 0 && (
            <div className="glass-card p-4">
              <div className="text-xs font-semibold text-slate-400 mb-3 flex items-center justify-between">
                <span>📈 Biểu đồ biến động tài sản (Equity Curve)</span>
                <span className="text-[10px] text-slate-500">Mô phỏng vốn qua các chu kỳ giao dịch</span>
              </div>
              <div className="w-full h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={result.equity_curve}
                    margin={{ top: 15, right: 10, left: 10, bottom: 5 }}
                  >
                    <defs>
                      <linearGradient id="equityBand" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={result.total_return >= 0 ? "#10b981" : "#ef4444"} stopOpacity={0.25}/>
                        <stop offset="95%" stopColor={result.total_return >= 0 ? "#10b981" : "#ef4444"} stopOpacity={0.02}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.05)" vertical={false} />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(str) => {
                        if (!str) return '';
                        const parts = str.split('-');
                        return parts.length >= 3 ? `${parts[2]}/${parts[1]}` : str;
                      }}
                      stroke="#475569"
                      fontSize={9}
                      tickLine={false}
                      axisLine={false}
                      dy={8}
                    />
                    <YAxis
                      domain={['auto', 'auto']}
                      tickFormatter={(val) => `${(val / 1000000).toFixed(0)}Tr`}
                      stroke="#475569"
                      fontSize={9}
                      tickLine={false}
                      axisLine={false}
                      dx={-2}
                      orientation="right"
                    />
                    <Tooltip content={<CustomBacktestTooltip />} />
                    <Area
                      name="Tổng tài sản"
                      type="monotone"
                      dataKey="equity"
                      stroke={result.total_return >= 0 ? "#10b981" : "#ef4444"}
                      strokeWidth={2}
                      fill="url(#equityBand)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Trades list */}
          {result.trades && result.trades.length > 0 && (
            <div className="glass-card overflow-hidden">
              <div className="px-4 py-3 text-xs font-bold text-slate-300 border-b border-slate-800/50">Lịch sử giao dịch mô phỏng (gần nhất)</div>
              <div className="divide-y divide-slate-800/30 overflow-x-auto">
                <table className="w-full text-xs text-left text-slate-400">
                  <thead className="bg-slate-900/40 text-slate-500 uppercase text-[9px] tracking-wider">
                    <tr>
                      <th className="px-4 py-2">Ngày</th>
                      <th className="px-4 py-2">Hành động</th>
                      <th className="px-4 py-2 text-right">Giá</th>
                      <th className="px-4 py-2 text-right">Số lượng</th>
                      <th className="px-4 py-2 text-right">Lãi/Lỗ (PnL)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/20">
                    {result.trades.slice(-5).reverse().map((t, idx) => (
                      <tr key={idx} className="hover:bg-slate-900/10">
                        <td className="px-4 py-2.5 font-num">{t.date.split('-').reverse().join('/')}</td>
                        <td className="px-4 py-2.5">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${t.type === 'buy' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                            {t.type === 'buy' ? 'MUA' : 'BÁN'}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right font-num text-slate-300">{(t.price).toLocaleString()} ₫</td>
                        <td className="px-4 py-2.5 text-right font-num">{t.shares.toLocaleString()}</td>
                        <td className="px-4 py-2.5 text-right font-num font-bold">
                          {t.type === 'sell' ? (
                            <span className={t.pnl >= 0 ? 'text-green-400' : 'text-red-400'}>
                              {t.pnl >= 0 ? '+' : ''}{(t.pnl).toLocaleString()} ₫
                            </span>
                          ) : (
                            <span className="text-slate-600">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};


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

// ===== BỘ GIẢI MÃ TÂM LÝ TIN TỨC =====
const parseSentimentJson = (text) => {
  if (!text) return null;
  try {
    let cleaned = text.trim();
    if (cleaned.includes('```')) {
      const matches = cleaned.match(/```(?:json)?([\s\S]*?)```/);
      if (matches && matches[1]) {
        cleaned = matches[1].trim();
      }
    }
    const startIdx = cleaned.indexOf('{');
    const endIdx = cleaned.lastIndexOf('}');
    if (startIdx !== -1 && endIdx !== -1) {
      cleaned = cleaned.substring(startIdx, endIdx + 1);
    }
    return JSON.parse(cleaned);
  } catch (err) {
    console.error("Failed to parse sentiment JSON:", err, text);
    try {
      const scoreMatch = text.match(/"score"\s*:\s*(-?\d+)/);
      const labelMatch = text.match(/"label"\s*:\s*"([^"]+)"/);
      const summaryMatch = text.match(/"summary"\s*:\s*"([^"]+)"/);
      
      const score = scoreMatch ? parseInt(scoreMatch[1], 10) : 0;
      const label = labelMatch ? labelMatch[1] : 'NEUTRAL';
      const summary = summaryMatch ? summaryMatch[1] : 'Đã có lỗi phân tích tóm tắt tin tức.';
      
      const bullets = [];
      const bulletRegex = /"bullets"\s*:\s*\[([\s\S]*?)\]/;
      const bulletBlock = text.match(bulletRegex);
      if (bulletBlock) {
        const items = bulletBlock[1].split(',');
        for (let item of items) {
          item = item.trim().replace(/^"|"$/g, '').trim();
          if (item) bullets.push(item);
        }
      }
      return {
        score,
        label,
        bullets: bullets.length ? bullets : ['Không thể phân tích các luận điểm chi tiết.'],
        summary
      };
    } catch (fallbackErr) {
      console.error("Fallback sentiment parser failed:", fallbackErr);
    }
    return null;
  }
};

// ===== DỮ LIỆU TÂM LÝ TIN TỨC MOCK (CHẾ ĐỘ DEMO) =====
const getMockSentiment = (ticker) => {
  const t = ticker.toUpperCase();
  if (t === 'FPT') {
    return {
      score: 75,
      label: 'BULLISH',
      bullets: [
        'Doanh thu dịch vụ CNTT nước ngoài tăng trưởng mạnh mẽ trên 25%.',
        'Hợp tác chiến lược toàn cầu về chip bán dẫn mở ra triển vọng mới.',
        'Mảng giáo dục và viễn thông duy trì dòng tiền ổn định.',
        'Khối ngoại liên tục giải ngân ròng củng cố đà tăng giá.'
      ],
      summary: 'Tâm lý tin tức về FPT cực kỳ tích cực. Các thông tin xoay quanh xuất khẩu phần mềm, hợp tác bán dẫn và kết quả kinh doanh tăng trưởng hai chữ số được truyền thông đăng tải liên tục.'
    };
  } else if (t === 'VCB') {
    return {
      score: 20,
      label: 'NEUTRAL',
      bullets: [
        'Lợi nhuận quý 1 duy thái quán quân nhưng tăng trưởng chậm lại.',
        'Nợ xấu được kiểm soát chặt chẽ dưới mức 1%.',
        'Thông tin chia cổ tức bằng cổ phiếu hỗ trợ tâm lý ngắn hạn.',
        'Áp lực giảm lãi suất cho vay khiến biên lợi nhuận NIM đi ngang.'
      ],
      summary: 'Tin tức về VCB mang sắc thái trung tính đến tích cực nhẹ. Thị trường đánh giá cao sự an toàn của ngân hàng nhưng kỳ vọng bứt phá lợi nhuận không quá cao trong bối cảnh vĩ mô hiện tại.'
    };
  } else if (t === 'VND' || t === 'SSI') {
    return {
      score: -35,
      label: 'BEARISH',
      bullets: [
        'Áp lực chốt lời nhóm chứng khoán gia tăng khi thanh khoản thị trường chung sụt giảm.',
        'Cạnh tranh thị phần môi giới ngày càng khốc liệt với chính sách zero-fee.',
        'Biến động tự doanh chịu tác động tiêu cực từ danh mục cổ phiếu đi ngang.',
        'Tin đồn bất lợi về room tín dụng ảnh hưởng tâm lý nhà đầu tư ngắn hạn.'
      ],
      summary: 'Tâm lý tin tức phản ánh sự thận trọng rõ rệt. Truyền thông tập trung vào việc suy giảm thanh khoản thị trường và áp lực cạnh tranh phí giao dịch, đè nặng lên kỳ vọng tăng trưởng ngắn hạn.'
    };
  } else {
    // Default mock (e.g. HPG)
    return {
      score: 45,
      label: 'BULLISH',
      bullets: [
        'Sản lượng bán hàng thép xây dựng phục hồi tích cực trong tháng qua.',
        'Giá nguyên liệu đầu vào giảm nhẹ giúp cải thiện biên lợi nhuận gộp.',
        'Dự án Dung Quất 2 tiến triển đúng tiến độ kỳ vọng.',
        'Khối ngoại dừng bán ròng và bắt đầu mua gom tích lũy.'
      ],
      summary: `Tâm lý tin tức của mã ${t} chuyển biến tích cực nhờ sự phục hồi của hoạt động cốt lõi và tiến độ các dự án trọng điểm được báo chí đưa tin rộng rãi.`
    };
  }
};

// ===== GAUGE ĐO TÂM LÝ TIN TỨC =====
const SentimentGauge = ({ score, label }) => {
  const percentage = ((score + 100) / 200) * 100;

  let colorClass = 'text-amber-400';
  let bgGradient = 'from-amber-500/20 to-amber-500/5';
  let borderClass = 'border-amber-500/30';
  let labelText = 'TRUNG LẬP';

  if (label === 'BULLISH' || score >= 30) {
    colorClass = 'text-emerald-400';
    bgGradient = 'from-emerald-500/20 to-emerald-500/5';
    borderClass = 'border-emerald-500/30';
    labelText = 'TÍCH CỰC (BULLISH)';
  } else if (label === 'BEARISH' || score <= -30) {
    colorClass = 'text-rose-400';
    bgGradient = 'from-rose-500/20 to-rose-500/5';
    borderClass = 'border-rose-500/30';
    labelText = 'TIÊU CỰC (BEARISH)';
  } else {
    labelText = 'TRUNG LẬP (NEUTRAL)';
  }

  return (
    <div className={`p-6 rounded-2xl border ${borderClass} bg-gradient-to-br ${bgGradient} backdrop-blur-md relative overflow-hidden transition-all duration-300`}>
      <div className="flex justify-between items-center mb-6">
        <div>
          <span className="text-[11px] font-bold text-slate-500 tracking-wider uppercase">Tâm lý Tin tức AI</span>
          <h4 className={`text-lg font-black tracking-wide ${colorClass} mt-0.5`}>{labelText}</h4>
        </div>
        <div className="text-right">
          <span className="text-[10px] text-slate-500 font-mono block">Chỉ số tâm lý</span>
          <span className={`text-4xl font-black font-mono leading-none ${colorClass}`}>
            {score > 0 ? `+${score}` : score}
          </span>
        </div>
      </div>

      <div className="relative pt-4 pb-2 overflow-visible">
        {/* Track with gradient */}
        <div className="h-2 w-full rounded-full bg-gradient-to-r from-rose-500 via-amber-400 to-emerald-500 relative" />

        {/* Labels below slider */}
        <div className="flex justify-between text-[10px] text-slate-500 font-semibold mt-2.5 px-1 font-mono">
          <span>Bearish (-100)</span>
          <span>Trung lập (0)</span>
          <span>Bullish (+100)</span>
        </div>

        {/* Pin indicating value */}
        <div
          className="absolute top-2 -ml-2.5 flex flex-col items-center transition-all duration-500 ease-out"
          style={{ left: `${percentage}%` }}
        >
          {/* Pulsing glow circle indicator */}
          <div className="relative flex h-5 w-5 items-center justify-center">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-40"></span>
            <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-white border-2 border-slate-900 shadow-[0_0_10px_rgba(255,255,255,0.8)]"></span>
          </div>
          {/* Small line pointer */}
          <div className="w-0.5 h-2 bg-white/80 -mt-0.5 shadow-md" />
        </div>
      </div>
    </div>
  );
};

// ===== TAB PHÂN TÍCH TÂM LÝ TIN TỨC =====
const SentimentAnalysisTab = ({ data, news, loading, onAnalyze, ticker }) => {
  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-36 bg-slate-800/40 rounded-2xl border border-slate-700/30" />
        <div className="p-5 bg-slate-900/10 rounded-2xl border border-slate-800/40 space-y-3">
          <div className="h-4 bg-slate-800/60 rounded w-1/4 mb-4" />
          <div className="h-3 bg-slate-800/40 rounded w-full animate-pulse" />
          <div className="h-3 bg-slate-800/40 rounded w-11/12 animate-pulse" />
          <div className="h-3 bg-slate-800/40 rounded w-4/5 animate-pulse" />
          <div className="h-3 bg-slate-800/40 rounded w-3/4 animate-pulse" />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="glass-card p-8 text-center">
        <div className="text-5xl mb-3">📰</div>
        <h3 className="text-sm font-bold text-slate-300 mb-2">Chưa phân tích tâm lý tin tức</h3>
        <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
          Tự động hoặc nhấn nút bên dưới để phân tích tâm lý của 10 tin tức CafeF mới nhất về {ticker}.
        </p>
        <button
          onClick={onAnalyze}
          className="px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all border border-cyan-500/30 bg-cyan-500/15 text-cyan-400 hover:bg-cyan-500/25"
        >
          Phân tích ngay bằng AI
        </button>
      </div>
    );
  }

  const { score, label, bullets, summary } = data;

  return (
    <div className="space-y-5 animate-fade-in-up">
      {/* Gauge Slider */}
      <SentimentGauge score={score} label={label} />

      {/* AI Summary and Bullet points */}
      <div className="glass-card p-5 space-y-4">
        <div>
          <h4 className="text-sm font-bold text-slate-200 mb-2 flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-cyan-400 inline-block" />
            Đánh giá & Luận điểm của AI
          </h4>
          <p className="text-xs text-slate-400 leading-relaxed italic bg-slate-950/20 p-3 rounded-lg border border-slate-800/40">
            "{summary}"
          </p>
        </div>

        {bullets && bullets.length > 0 && (
          <div className="space-y-2">
            <h5 className="text-xs font-semibold text-slate-400">Các yếu tố ảnh hưởng chính:</h5>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {bullets.map((bullet, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-900/40 border border-slate-800/30 text-xs text-slate-300 animate-fade-in-up"
                >
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-cyan-500/10 text-cyan-400 text-[10px] font-bold font-mono mt-0.5">
                    {idx + 1}
                  </span>
                  <span className="flex-1 leading-normal font-medium">{bullet}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Real CafeF news feed list */}
      <div className="glass-card p-5 space-y-3">
        <h4 className="text-sm font-bold text-slate-200 flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded bg-slate-500 inline-block" />
          Tin tức CafeF thực tế ({news.length})
        </h4>

        {news.length === 0 ? (
          <p className="text-xs text-slate-500 italic">Không có tin tức nào gần đây của mã này trên CafeF.</p>
        ) : (
          <div className="divide-y divide-slate-800/40 max-h-72 overflow-y-auto pr-1 space-y-1.5">
            {news.map((item, index) => {
              const fullUrl = item.url.startsWith('http')
                ? item.url
                : `https://cafef.vn${item.url.startsWith('/') ? '' : '/'}${item.url}`;
              return (
                <div key={index} className="pt-2 pb-2.5 hover:bg-slate-900/10 transition-all rounded px-2 group">
                  <a
                    href={fullUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-semibold text-slate-300 hover:text-cyan-400 leading-snug transition-colors block cursor-pointer"
                  >
                    {item.title}
                  </a>
                  <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-500 font-medium">
                    <span>CafeF</span>
                    <span>•</span>
                    <span className="font-mono">{item.time}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
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
  const [compareTickers, setCompareTickers] = useState([]);
  const [compareInput, setCompareInput] = useState('');
  const [quarterlyData, setQuarterlyData] = useState(null);
  const [sentimentData, setSentimentData] = useState(null);
  const [sentimentLoading, setSentimentLoading] = useState(false);

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
    setSentimentData(null); // Reset dữ liệu tâm lý khi đổi mã phân tích chính

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

  const hasKey = (settings.apiKey && !settings.apiKey.includes('DÁN_KEY_CỦA_BẠN_VÀO_ĐÂY') && settings.apiKey.trim() !== '' && settings.apiKey !== 'sk-ant-api03-' && settings.apiKey !== 'your_key_here') ||
    (import.meta.env.VITE_ANTHROPIC_API_KEY && !import.meta.env.VITE_ANTHROPIC_API_KEY.includes('DÁN_KEY_CỦA_BẠN_VÀO_ĐÂY') && import.meta.env.VITE_ANTHROPIC_API_KEY.trim() !== '' && import.meta.env.VITE_ANTHROPIC_API_KEY !== 'sk-ant-api03-' && import.meta.env.VITE_ANTHROPIC_API_KEY !== 'your_key_here');

  const handleAnalyzeSentiment = useCallback(async () => {
    if (!currentParams?.ticker) return;
    if (sentimentLoading) return;
    
    setSentimentLoading(true);
    
    if (!hasKey) {
      // Chế độ mô phỏng khi chưa nhập API key
      setTimeout(() => {
        setSentimentData(getMockSentiment(currentParams.ticker));
        setSentimentLoading(false);
        toast.success("Đã hoàn thành mô phỏng phân tích tâm lý tin tức!");
      }, 800);
      return;
    }
    
    try {
      const newsList = stock1.news || [];
      const prompt = buildSentimentPrompt(currentParams.ticker, newsList);
      
      const aiResult = await analyze({
        systemPrompt: STOCK_SENTIMENT_SYSTEM_PROMPT,
        userPrompt: prompt,
      });
      
      if (aiResult) {
        const parsed = parseSentimentJson(aiResult);
        if (parsed) {
          setSentimentData(parsed);
        } else {
          setSentimentData({
            score: 0,
            label: 'NEUTRAL',
            bullets: ['Không thể phân tích dữ liệu tin tức thành định dạng chuẩn.'],
            summary: 'Đã xảy ra lỗi khi chuyển đổi kết quả phân tích AI thành cấu trúc dữ liệu.'
          });
        }
      }
    } catch (err) {
      console.error("Error analyzing news sentiment:", err);
      toast.error("Lỗi phân tích tâm lý tin tức!");
    } finally {
      setSentimentLoading(false);
    }
  }, [currentParams?.ticker, stock1.news, analyze, sentimentLoading, hasKey]);

  // Tự động trigger phân tích tâm lý khi chuyển sang tab 'sentiment'
  useEffect(() => {
    if (infoTab === 'sentiment' && currentParams?.ticker && !sentimentData && !sentimentLoading) {
      if (!hasKey) {
        setSentimentLoading(true);
        const timer = setTimeout(() => {
          setSentimentData(getMockSentiment(currentParams.ticker));
          setSentimentLoading(false);
        }, 600);
        return () => clearTimeout(timer);
      } else {
        handleAnalyzeSentiment();
      }
    }
  }, [infoTab, currentParams?.ticker, sentimentData, sentimentLoading, hasKey, handleAnalyzeSentiment]);

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
                            <div className="flex gap-1" style={{ height: 300 }}>
                              <div className="flex-1 min-w-0">
                                <CandlestickChart data={stock1.ohlcv} showMA={true} showBB={showBB} sr={stock1.sr} height={300} />
                              </div>
                              <VolumeProfile
                                data={stock1.ohlcv}
                                height={300}
                                currentPrice={stock1.info?.currentPrice || null}
                              />
                            </div>
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
                {infoTab === 'result' && (
                  <ResultCard
                    result={result}
                    ticker={currentParams?.ticker}
                    exchange={currentParams?.exchange}
                    timeframe={currentParams?.timeframe}
                    stockInfo={stock1.info}
                    onSave={handleSaveToHistory}
                    onReanalyze={handleReanalyze}
                  />
                )}
                {infoTab === 'fundamentals' && (
                  <div className="glass-card p-5">
                    <FundamentalsTab info={stock1.info} ticker={currentParams?.ticker} />
                  </div>
                )}
                {infoTab === 'sentiment' && (
                  <SentimentAnalysisTab
                    data={sentimentData}
                    news={stock1.news}
                    loading={sentimentLoading}
                    onAnalyze={handleAnalyzeSentiment}
                    ticker={currentParams?.ticker}
                  />
                )}
                {infoTab === 'prediction' && (
                  <PredictionTab
                    ticker={currentParams?.ticker}
                    ohlcvData={stock1.ohlcv}
                    sentimentData={sentimentData}
                  />
                )}
                {infoTab === 'backtest' && (
                  <BacktestTab
                    ticker={currentParams?.ticker}
                  />
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
