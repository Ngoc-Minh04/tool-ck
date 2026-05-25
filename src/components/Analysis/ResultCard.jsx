// ===== RESULT CARD =====
// Hiển thị kết quả phân tích AI

import { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import { Copy, Bookmark } from 'lucide-react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import SignalBadge, { detectSignal } from './SignalBadge';
import { Button, Badge } from '../UI';
import useAppStore from '../../store/appStore';
import toast from 'react-hot-toast';

const ResultCard = ({ result, ticker, exchange, timeframe, stockInfo, onSave }) => {
  const settings = useAppStore((s) => s.settings);

  const signal = useMemo(() => detectSignal(result), [result]);
  const timestamp = new Date();

  const handleCopy = () => {
    navigator.clipboard.writeText(result);
    toast.success('Đã sao chép phân tích!');
  };

  if (!result) return null;

  // Tóm tắt chỉ số từ stockInfo
  const renderStockInfo = () => {
    if (!stockInfo) return null;
    const { fundamentals, foreignNet, currentPrice, change, volume } = stockInfo;
    const isUp = change >= 0;

    return (
      <div className="grid grid-cols-2 gap-2 mb-4">
        {/* Giá hiện tại */}
        <div className="glass-card p-3">
          <div className="text-xs text-slate-500 mb-1">Giá hiện tại</div>
          <div className="font-num text-lg font-bold" style={{ color: isUp ? '#00e676' : '#ff5252', fontFamily: "'JetBrains Mono', monospace" }}>
            {currentPrice?.toLocaleString('vi-VN')}
          </div>
          <div className="text-xs font-num" style={{ color: isUp ? '#00e676' : '#ff5252' }}>
            {isUp ? '+' : ''}{(change * 100).toFixed(2)}%
          </div>
        </div>

        {/* Volume */}
        <div className="glass-card p-3">
          <div className="text-xs text-slate-500 mb-1">Khối lượng</div>
          <div className="font-num text-base font-semibold text-cyan-400" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
            {(volume / 1e6).toFixed(1)}M
          </div>
          <div className="text-xs text-slate-500">cổ phiếu</div>
        </div>

        {/* P/E */}
        <div className="glass-card p-3">
          <div className="text-xs text-slate-500 mb-1">P/E</div>
          <div className="font-num text-base font-semibold text-slate-200">{fundamentals?.pe}x</div>
          <div className="text-xs text-slate-500">P/B: {fundamentals?.pb}x</div>
        </div>

        {/* ROE */}
        <div className="glass-card p-3">
          <div className="text-xs text-slate-500 mb-1">ROE</div>
          <div className="font-num text-base font-semibold text-slate-200">{fundamentals?.roe}%</div>
          <div className="text-xs text-slate-500">ROA: {fundamentals?.roa}%</div>
        </div>

        {/* ĐTNN */}
        <div className="glass-card p-3 col-span-2">
          <div className="text-xs text-slate-500 mb-1">Mua/bán ròng ĐTNN hôm nay</div>
          <div
            className="font-num text-sm font-bold"
            style={{ color: foreignNet >= 0 ? '#00e676' : '#ff5252', fontFamily: "'JetBrains Mono', monospace" }}
          >
            {foreignNet >= 0 ? '+' : ''}{(foreignNet / 1e9).toFixed(1)} tỷ VNĐ
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="glass-card overflow-hidden animate-fade-in-up">
      {/* Header */}
      <div
        className="flex items-center justify-between p-4"
        style={{ borderBottom: '1px solid rgba(79,195,247,0.1)' }}
      >
        <div className="flex items-center gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xl font-bold text-slate-100">{ticker}</span>
              <Badge variant="cyan">{exchange}</Badge>
              <Badge variant="default" size="xs">{timeframe}</Badge>
              {signal && <SignalBadge signal={signal} size="sm" />}
            </div>
            <div className="text-xs text-slate-500 mt-0.5">
              {format(timestamp, 'dd/MM/yyyy HH:mm', { locale: vi })} · Model: {settings.model}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onSave && (
            <Button variant="ghost" size="sm" onClick={onSave} icon={Bookmark}>
              Lưu
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={handleCopy} icon={Copy}>
            Copy
          </Button>
        </div>
      </div>

      {/* Stock Info Summary */}
      <div className="p-4">
        {renderStockInfo()}

        {/* AI Analysis */}
        <div
          className="rounded-lg p-4"
          style={{ background: 'rgba(13,27,42,0.5)', border: '1px solid rgba(79,195,247,0.08)' }}
        >
          <div className="text-xs text-cyan-400 font-semibold mb-3 flex items-center gap-2">
            🤖 Phân tích từ Claude AI
          </div>
          <div className="markdown-content text-sm text-slate-300 leading-relaxed">
            <ReactMarkdown>{result}</ReactMarkdown>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResultCard;
