// ===== RESULT CARD =====
// Hiển thị kết quả phân tích AI

import { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import { Copy, Bookmark, RefreshCw, Target, ShieldAlert } from 'lucide-react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import SignalBadge, { detectSignal } from './SignalBadge';
import { Button, Badge } from '../UI';
import useAppStore from '../../store/appStore';
import toast from 'react-hot-toast';

// Trích xuất giá mục tiêu và stop-loss từ text AI
const extractPrices = (text) => {
  if (!text) return { target: null, stopLoss: null, rr: null };
  const normalize = text.replace(/,/g, '.').replace(/\./g, (m, offset, str) => {
    // Giữ lại dấu chấm là dấu phân cách ngàn VN nếu sau nó là 3 chữ số
    return /\d{3}(?!\d)/.test(str.slice(offset + 1, offset + 4)) ? ',' : '.';
  });

  const patterns = {
    target: [
      /giá mục tiêu[:\s]*([0-9,.]+)/i,
      /target[:\s]*([0-9,.]+)/i,
      /mục tiêu[:\s]*([0-9,.]+)/i,
      /\bTP[:\s]*([0-9,.]+)/i,
    ],
    stopLoss: [
      /stop[-\s]?loss[:\s]*([0-9,.]+)/i,
      /cắt lỗ[:\s]*([0-9,.]+)/i,
      /SL[:\s]*([0-9,.]+)/i,
    ],
    rr: [
      /R:R[:\s]*([0-9.]+)/i,
      /tỷ lệ.*?([0-9]+)[:\s]*1/i,
    ],
  };

  const parsePrice = (match) => {
    if (!match) return null;
    const raw = match[1].replace(/,/g, '');
    const num = parseFloat(raw);
    if (!num || isNaN(num)) return null;
    // Nếu giá nhỏ hơn 1000 có thể là đơn vị nghìn đồng
    return num < 1000 ? num * 1000 : num;
  };

  let target = null, stopLoss = null, rr = null;
  for (const p of patterns.target) {
    const m = text.match(p);
    if (m) { target = parsePrice(m); break; }
  }
  for (const p of patterns.stopLoss) {
    const m = text.match(p);
    if (m) { stopLoss = parsePrice(m); break; }
  }
  for (const p of patterns.rr) {
    const m = text.match(p);
    if (m) { rr = m[1]; break; }
  }
  return { target, stopLoss, rr };
};

const ResultCard = ({ result, ticker, exchange, timeframe, stockInfo, onSave, onReanalyze }) => {
  const settings = useAppStore((s) => s.settings);
  const signal = useMemo(() => detectSignal(result), [result]);
  const { target, stopLoss, rr } = useMemo(() => extractPrices(result), [result]);
  const timestamp = new Date();

  const handleCopy = () => {
    navigator.clipboard.writeText(result);
    toast.success('Đã sao chép phân tích!');
  };

  if (!result) return null;

  const { fundamentals, foreignNet, currentPrice, change, volume } = stockInfo || {};
  const isUp = change >= 0;

  // Tính % upside đến giá mục tiêu
  const upsidePct = target && currentPrice
    ? (((target - currentPrice) / currentPrice) * 100).toFixed(1)
    : null;

  return (
    <div className="glass-card overflow-hidden animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center justify-between p-4" style={{ borderBottom: '1px solid rgba(79,195,247,0.1)' }}>
        <div className="flex items-center gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xl font-bold text-slate-100">{ticker}</span>
              <Badge variant="cyan">{exchange}</Badge>
              <Badge variant="default" size="xs">{timeframe}</Badge>
              {signal && <SignalBadge signal={signal} size="sm" />}
            </div>
            <div className="text-xs text-slate-500 mt-0.5">
              {format(timestamp, 'dd/MM/yyyy HH:mm', { locale: vi })} · {settings.model}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {onReanalyze && (
            <Button variant="ghost" size="sm" onClick={onReanalyze} icon={RefreshCw}>
              Phân tích lại
            </Button>
          )}
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

      <div className="p-4 space-y-4">
        {/* Giá mục tiêu + Stop-loss nổi bật */}
        {(target || stopLoss) && (
          <div className="grid grid-cols-2 gap-3">
            {target && (
              <div
                className="rounded-xl p-3 flex items-center gap-3"
                style={{ background: 'rgba(74,222,128,0.06)', border: '1px solid rgba(74,222,128,0.25)' }}
              >
                <Target size={18} color="#4ade80" className="flex-shrink-0" />
                <div>
                  <div className="text-xs text-green-500/80">🎯 Giá mục tiêu</div>
                  <div className="font-num font-bold text-green-400 text-base">
                    {target.toLocaleString('vi-VN')}
                  </div>
                  {upsidePct && (
                    <div className="text-xs text-green-500/70">
                      {upsidePct > 0 ? '+' : ''}{upsidePct}% upside
                      {rr && ` · R:R ${rr}:1`}
                    </div>
                  )}
                </div>
              </div>
            )}
            {stopLoss && (
              <div
                className="rounded-xl p-3 flex items-center gap-3"
                style={{ background: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.25)' }}
              >
                <ShieldAlert size={18} color="#f87171" className="flex-shrink-0" />
                <div>
                  <div className="text-xs text-red-400/80">🛡️ Stop-loss</div>
                  <div className="font-num font-bold text-red-400 text-base">
                    {stopLoss.toLocaleString('vi-VN')}
                  </div>
                  {currentPrice && (
                    <div className="text-xs text-red-400/70">
                      {(((stopLoss - currentPrice) / currentPrice) * 100).toFixed(1)}% rủi ro
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Stock Info tóm tắt */}
        {stockInfo && (
          <div className="grid grid-cols-2 gap-2">
            <div className="glass-card p-3">
              <div className="text-xs text-slate-500 mb-1">Giá hiện tại</div>
              <div className="font-num text-lg font-bold" style={{ color: isUp ? '#4ade80' : '#f87171' }}>
                {currentPrice?.toLocaleString('vi-VN')}
              </div>
              <div className="text-xs font-num" style={{ color: isUp ? '#4ade80' : '#f87171' }}>
                {isUp ? '+' : ''}{(change * 100).toFixed(2)}%
              </div>
            </div>
            <div className="glass-card p-3">
              <div className="text-xs text-slate-500 mb-1">Khối lượng</div>
              <div className="font-num text-base font-semibold text-cyan-400">
                {(volume / 1e6).toFixed(1)}M
              </div>
              <div className="text-xs text-slate-500">cổ phiếu</div>
            </div>
            <div className="glass-card p-3">
              <div className="text-xs text-slate-500 mb-1">P/E</div>
              <div className="font-num text-base font-semibold text-slate-200">
                {fundamentals?.pe != null ? `${Number(fundamentals.pe).toFixed(2)}x` : 'N/A'}
              </div>
              <div className="text-xs text-slate-500">
                P/B: {fundamentals?.pb != null ? `${Number(fundamentals.pb).toFixed(2)}x` : 'N/A'}
              </div>
            </div>
            <div className="glass-card p-3">
              <div className="text-xs text-slate-500 mb-1">ROE</div>
              <div className="font-num text-base font-semibold text-slate-200">
                {fundamentals?.roe != null ? `${Number(fundamentals.roe).toFixed(2)}%` : 'N/A'}
              </div>
              <div className="text-xs text-slate-500">
                ROA: {fundamentals?.roa != null ? `${Number(fundamentals.roa).toFixed(2)}%` : 'N/A'}
              </div>
            </div>
            {foreignNet !== undefined && (
              <div className="glass-card p-3 col-span-2">
                <div className="text-xs text-slate-500 mb-1">Mua/bán ròng ĐTNN hôm nay</div>
                <div
                  className="font-num text-sm font-bold"
                  style={{ color: foreignNet >= 0 ? '#4ade80' : '#f87171' }}
                >
                  {foreignNet >= 0 ? '+' : ''}{(foreignNet / 1e9).toFixed(1)} tỷ VNĐ
                </div>
              </div>
            )}
          </div>
        )}

        {/* AI Analysis */}
        <div className="rounded-lg p-4" style={{ background: 'rgba(13,27,42,0.5)', border: '1px solid rgba(79,195,247,0.08)' }}>
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
