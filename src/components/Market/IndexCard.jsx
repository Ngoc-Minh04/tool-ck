// ===== MARKET: INDEX CARD =====

import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

const IndexCard = ({ index }) => {
  const { name, value, changePct, advance, decline, unchanged, volume } = index;
  const pct = parseFloat(changePct);
  const isUp = pct > 0;
  const isFlat = pct === 0;

  const color = isUp ? '#00e676' : isFlat ? '#94a3b8' : '#ff5252';
  const Icon = isUp ? TrendingUp : isFlat ? Minus : TrendingDown;

  // Tính tỷ lệ cho progress bar
  const total = (advance || 0) + (decline || 0) + (unchanged || 0);
  const advancePct = total ? (advance / total) * 100 : 33;
  const declinePct = total ? (decline / total) * 100 : 33;

  return (
    <div
      className="glass-card-hover p-4 space-y-3"
      style={{ borderLeft: `3px solid ${color}` }}
    >
      {/* Name & Change */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold text-slate-200">{name}</span>
        <span
          className="flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded"
          style={{ background: `${color}15`, color }}
        >
          <Icon size={12} />
          {isUp ? '+' : ''}{pct}%
        </span>
      </div>

      {/* Value */}
      <div className="font-num text-2xl font-bold" style={{ color, fontFamily: "'JetBrains Mono', monospace" }}>
        {parseFloat(value).toFixed(2)}
      </div>

      {/* Advance/Decline bar */}
      <div className="space-y-1">
        <div className="flex rounded-full overflow-hidden h-1.5">
          <div style={{ width: `${advancePct}%`, background: '#00e676' }} />
          <div style={{ width: `${100 - advancePct - declinePct}%`, background: '#94a3b8' }} />
          <div style={{ width: `${declinePct}%`, background: '#ff5252' }} />
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-green-400">↑ {advance}</span>
          <span className="text-slate-500">= {unchanged}</span>
          <span className="text-red-400">↓ {decline}</span>
        </div>
      </div>

      {/* Volume */}
      <div className="text-xs text-slate-500">
        KL: <span className="font-num text-cyan-400">{(volume / 1e6).toFixed(0)}M</span>
      </div>
    </div>
  );
};

export default IndexCard;
