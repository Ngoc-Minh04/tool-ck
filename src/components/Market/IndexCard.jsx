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
      className="glass-card-hover p-3 flex items-center justify-between gap-4"
      style={{ borderLeft: `3px solid ${color}` }}
    >
      {/* Left Column: Name & Value & Change */}
      <div className="space-y-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">{name}</span>
          <span
            className="flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded whitespace-nowrap"
            style={{ background: `${color}15`, color }}
          >
            <Icon size={10} className="stroke-[3]" />
            {isUp ? '+' : ''}{pct}%
          </span>
        </div>
        <div className="font-num text-lg font-extrabold tracking-tight leading-none" style={{ color, fontFamily: "'JetBrains Mono', monospace" }}>
          {parseFloat(value).toFixed(2)}
        </div>
      </div>

      {/* Right Column: Advance/Decline bar & Volume */}
      <div className="flex-1 max-w-[130px] space-y-1 text-right">
        <div className="flex rounded-full overflow-hidden h-1 bg-slate-800/80">
          <div style={{ width: `${advancePct}%`, background: '#00e676' }} />
          <div style={{ width: `${100 - advancePct - declinePct}%`, background: '#94a3b8' }} />
          <div style={{ width: `${declinePct}%`, background: '#ff5252' }} />
        </div>
        <div className="flex justify-between text-[10px] font-medium">
          <span className="text-green-400">↑{advance}</span>
          <span className="text-slate-500">={unchanged}</span>
          <span className="text-red-400">↓{decline}</span>
        </div>
        <div className="text-[10px] text-slate-500">
          KL: <span className="font-num text-cyan-400">{(volume / 1e6).toFixed(0)}M</span>
        </div>
      </div>
    </div>
  );
};

export default IndexCard;
