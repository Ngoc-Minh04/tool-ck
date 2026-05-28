// ===== TICKER FORM =====
// Form nhập thông tin để phân tích cổ phiếu

import { useState, useEffect, useCallback, useRef } from 'react';
import { Search, Zap, X } from 'lucide-react';
import { Button, Tabs } from '../UI';
import useAppStore from '../../store/appStore';
import { EXCHANGES, TIMEFRAMES, POPULAR_TICKERS, TICKER_DIRECTORY } from '../../constants/sources';
import { History } from 'lucide-react';

const TickerForm = ({ onAnalyze, onSelectStock, loading }) => {
  const settings = useAppStore((s) => s.settings);
  const toggleSource = useAppStore((s) => s.toggleSource);
  const history = useAppStore((s) => s.history);

  const [ticker, setTicker] = useState('');
  const [exchange, setExchange] = useState(settings.defaultExchange || 'HOSE');
  const [timeframe, setTimeframe] = useState(settings.defaultTimeframe || 'T3');
  const [debouncedTicker, setDebouncedTicker] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);
  const isLight = settings.theme === 'light';

  // Autocomplete suggestions
  const suggestions = ticker.trim().length >= 1
    ? TICKER_DIRECTORY.filter((t) => {
        const q = ticker.toUpperCase().trim();
        return t.ticker.startsWith(q) || t.name.toUpperCase().includes(q);
      }).slice(0, 8)
    : [];

  // Debounce 300ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedTicker(ticker.toUpperCase().trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [ticker]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (!dropdownRef.current?.contains(e.target)) setShowDropdown(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selectSuggestion = useCallback((item) => {
    setTicker(item.ticker);
    setDebouncedTicker(item.ticker);
    setExchange(item.exchange || 'HOSE');
    setShowDropdown(false);
    setActiveIdx(-1);
    setTimeout(() => inputRef.current?.focus(), 0);
  }, []);

  const handleSubmit = useCallback((e) => {
    e?.preventDefault();
    const t = debouncedTicker || ticker.toUpperCase().trim();
    if (!t) return;
    setShowDropdown(false);
    onAnalyze({ ticker: t, exchange, timeframe, sources: settings.sources });
  }, [debouncedTicker, ticker, exchange, timeframe, settings.sources, onAnalyze]);

  const handleKeyDown = (e) => {
    if (showDropdown && suggestions.length > 0) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, suggestions.length - 1)); return; }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, -1)); return; }
      if (e.key === 'Enter' && activeIdx >= 0) { e.preventDefault(); selectSuggestion(suggestions[activeIdx]); return; }
      if (e.key === 'Escape') { setShowDropdown(false); return; }
    }
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
        <div className="flex-1 relative" ref={dropdownRef}>
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" style={{ zIndex: 1 }} />
          <input
            ref={inputRef}
            type="text"
            value={ticker}
            onChange={(e) => {
              setTicker(e.target.value.toUpperCase());
              setShowDropdown(true);
              setActiveIdx(-1);
            }}
            onFocus={() => ticker.trim() && setShowDropdown(true)}
            onKeyDown={handleKeyDown}
            placeholder="Tìm mã CK hoặc tên công ty..."
            className="input-dark pl-9"
            maxLength={10}
            autoFocus
            autoComplete="off"
          />
          {ticker && (
            <button
              onClick={() => { setTicker(''); setDebouncedTicker(''); setShowDropdown(false); inputRef.current?.focus(); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 border-none bg-transparent cursor-pointer"
            >
              <X size={13} />
            </button>
          )}

          {/* Autocomplete Dropdown */}
          {showDropdown && suggestions.length > 0 && (
            <div
              className="absolute left-0 right-0 top-full mt-1 rounded-xl overflow-hidden animate-fade-in-up"
              style={{
                background: isLight ? '#ffffff' : '#0f2236',
                border: isLight ? '1px solid rgba(79,195,247,0.35)' : '1px solid rgba(79,195,247,0.25)',
                boxShadow: isLight ? '0 10px 25px rgba(0,0,0,0.08)' : '0 8px 32px rgba(0,0,0,0.5)',
                zIndex: 100,
              }}
            >
              {suggestions.map((s, idx) => (
                <div
                  key={s.ticker}
                  onMouseDown={() => selectSuggestion(s)}
                  className="flex items-center justify-between px-3 py-2.5 cursor-pointer transition-all"
                  style={{
                    background: idx === activeIdx ? 'rgba(79,195,247,0.12)' : 'transparent',
                    borderBottom: idx < suggestions.length - 1 ? (isLight ? '1px solid rgba(79,195,247,0.12)' : '1px solid rgba(79,195,247,0.06)') : 'none',
                  }}
                  onMouseEnter={() => setActiveIdx(idx)}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-sm font-bold text-cyan-300 w-12">{s.ticker}</span>
                    <span className="text-xs text-slate-400 truncate max-w-[140px]">{s.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className="text-xs px-1.5 py-0.5 rounded"
                      style={{ background: 'rgba(79,195,247,0.08)', color: '#64748b' }}
                    >
                      {s.sector}
                    </span>
                    <span
                      className="text-xs px-1.5 py-0.5 rounded font-semibold"
                      style={{ background: 'rgba(79,195,247,0.1)', color: '#4fc3f7' }}
                    >
                      {s.exchange}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
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
                background: source.enabled ? `${source.color}20` : isLight ? 'rgba(0,0,0,0.03)' : 'rgba(26,47,69,0.8)',
                color: source.enabled ? source.color : isLight ? '#64748b' : '#4a6b8a',
                border: `1px solid ${source.enabled ? source.color + '50' : isLight ? 'rgba(79,195,247,0.2)' : 'rgba(79,195,247,0.1)'}`,
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
                background: ticker === t ? 'rgba(79,195,247,0.15)' : isLight ? 'rgba(0,0,0,0.04)' : 'rgba(26,47,69,0.6)',
                color: ticker === t ? '#4fc3f7' : isLight ? '#475569' : '#64748b',
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

      {/* Quick history */}
      {history.length > 0 && (
        <div>
          <div className="text-xs text-slate-500 mb-2 flex items-center gap-1">
            <History size={11} />
            Phân tích gần đây
          </div>
          <div className="flex flex-col gap-1.5">
            {history.slice(0, 3).map((h) => (
              <button
                key={h.id}
                onClick={() => {
                  if (onSelectStock) {
                    onSelectStock(h);
                  } else {
                    setTicker(h.ticker);
                    setDebouncedTicker(h.ticker);
                    if (h.exchange) setExchange(h.exchange);
                    if (h.timeframe) setTimeframe(h.timeframe);
                  }
                }}
                className="flex items-center justify-between w-full px-3 py-2 rounded-lg text-xs transition-all text-left"
                style={{
                  background: 'rgba(26,47,69,0.7)',
                  border: '1px solid rgba(79,195,247,0.08)',
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(79,195,247,0.25)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(79,195,247,0.08)'}
              >
                <div className="flex items-center gap-2">
                  <span
                    className="font-bold"
                    style={{
                      color: h.signal === 'BUY' ? '#4ade80' : h.signal === 'SELL' ? '#f87171' : '#facc15',
                    }}
                  >
                    {h.ticker}
                  </span>
                  <span className="text-slate-500">{h.exchange}</span>
                  <span className="text-slate-600">·</span>
                  <span className="text-slate-500">{h.timeframe}</span>
                </div>
                <div className="flex items-center gap-2">
                  {h.signal && (
                    <span
                      className="text-xs font-semibold px-1.5 py-0.5 rounded"
                      style={{
                        background: h.signal === 'BUY' ? 'rgba(74,222,128,0.15)' : h.signal === 'SELL' ? 'rgba(248,113,113,0.15)' : 'rgba(250,204,21,0.15)',
                        color: h.signal === 'BUY' ? '#4ade80' : h.signal === 'SELL' ? '#f87171' : '#facc15',
                      }}
                    >
                      {h.signal}
                    </span>
                  )}
                  <span className="text-slate-600">↩</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TickerForm;
