// ===== TICKER FORM =====
// Form nhập thông tin để phân tích cổ phiếu

import { useState, useEffect, useCallback } from 'react';
import { Search, Zap, RefreshCw } from 'lucide-react';
import { Button, Select, Tabs } from '../UI';
import useAppStore from '../../store/appStore';
import { EXCHANGES, TIMEFRAMES, POPULAR_TICKERS } from '../../constants/sources';

const TickerForm = ({ onAnalyze, loading }) => {
  const settings = useAppStore((s) => s.settings);
  const toggleSource = useAppStore((s) => s.toggleSource);

  const [ticker, setTicker] = useState('');
  const [exchange, setExchange] = useState(settings.defaultExchange);
  const [timeframe, setTimeframe] = useState(settings.defaultTimeframe);
  const [debouncedTicker, setDebouncedTicker] = useState('');

  // Debounce 300ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedTicker(ticker.toUpperCase().trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [ticker]);

  const handleSubmit = useCallback((e) => {
    e?.preventDefault();
    const t = debouncedTicker || ticker.toUpperCase().trim();
    if (!t) return;
    onAnalyze({ ticker: t, exchange, timeframe, sources: settings.sources });
  }, [debouncedTicker, ticker, exchange, timeframe, settings.sources, onAnalyze]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSubmit();
  };

  return (
    <div className="glass-card p-5 space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <Zap size={16} className="text-cyan-400" />
        <h2 className="text-sm font-semibold text-slate-200">Phân tích cổ phiếu</h2>
      </div>

      {/* Mã CK + Sàn */}
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={ticker}
            onChange={(e) => setTicker(e.target.value.toUpperCase())}
            onKeyDown={handleKeyDown}
            placeholder="Nhập mã CK (VD: ACB, VNM...)"
            className="input-dark pl-9"
            maxLength={10}
            autoFocus
          />
        </div>
        <select
          value={exchange}
          onChange={(e) => setExchange(e.target.value)}
          className="select-dark"
          style={{ width: 110 }}
        >
          {EXCHANGES.map((ex) => (
            <option key={ex.value} value={ex.value}>{ex.label} - {ex.description}</option>
          ))}
        </select>
      </div>

      {/* Khung thời gian */}
      <div>
        <div className="text-xs text-slate-500 mb-2">Khung thời gian</div>
        <Tabs
          tabs={TIMEFRAMES.map((t) => ({ value: t.value, label: t.label }))}
          activeTab={timeframe}
          onChange={setTimeframe}
        />
      </div>

      {/* Nguồn dữ liệu */}
      <div>
        <div className="text-xs text-slate-500 mb-2">Nguồn tham chiếu</div>
        <div className="flex flex-wrap gap-2">
          {settings.sources.map((source) => (
            <button
              key={source.id}
              onClick={() => toggleSource(source.id)}
              className="text-xs px-3 py-1 rounded-full cursor-pointer transition-all duration-200 border-none"
              style={{
                background: source.enabled ? `${source.color}20` : 'rgba(26,47,69,0.8)',
                color: source.enabled ? source.color : '#4a6b8a',
                border: `1px solid ${source.enabled ? source.color + '50' : 'rgba(79,195,247,0.1)'}`,
                fontWeight: source.enabled ? 600 : 400,
              }}
              title={source.description}
            >
              {source.shortName}
            </button>
          ))}
        </div>
      </div>

      {/* Popular tickers */}
      <div>
        <div className="text-xs text-slate-500 mb-2">Mã phổ biến</div>
        <div className="flex flex-wrap gap-1.5">
          {POPULAR_TICKERS.slice(0, 12).map((t) => (
            <button
              key={t}
              onClick={() => {
                setTicker(t);
                setDebouncedTicker(t);
              }}
              className="text-xs px-2 py-0.5 rounded cursor-pointer transition-all border-none hover:text-cyan-400"
              style={{
                background: ticker === t ? 'rgba(79,195,247,0.15)' : 'rgba(26,47,69,0.6)',
                color: ticker === t ? '#4fc3f7' : '#64748b',
                border: `1px solid ${ticker === t ? 'rgba(79,195,247,0.3)' : 'transparent'}`,
              }}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Submit */}
      <Button
        onClick={handleSubmit}
        loading={loading}
        disabled={!ticker.trim()}
        size="lg"
        className="w-full justify-center"
        style={{ width: '100%' }}
      >
        {loading ? 'Đang phân tích...' : `🔍 Phân tích ${debouncedTicker || ticker || 'mã CK'}`}
      </Button>
    </div>
  );
};

export default TickerForm;
