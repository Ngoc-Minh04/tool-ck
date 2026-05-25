// ===== HISTORY: HISTORY LIST & ITEM =====

import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import SignalBadge from '../Analysis/SignalBadge';
import { detectSignal } from '../Analysis/SignalBadge';
import { Badge } from '../UI';
import ReactMarkdown from 'react-markdown';

// Item đơn lẻ
export const HistoryItem = ({ item, onDelete }) => {
  const [expanded, setExpanded] = useState(false);
  const signal = detectSignal(item.result);

  return (
    <div className="glass-card-hover overflow-hidden">
      {/* Header Row */}
      <div
        className="flex items-center gap-3 p-4 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-base font-bold text-slate-100">{item.ticker}</span>
            <Badge variant="cyan" size="xs">{item.exchange}</Badge>
            <Badge variant="default" size="xs">{item.timeframe}</Badge>
            {signal && <SignalBadge signal={signal} size="sm" />}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            {format(new Date(item.timestamp), "dd/MM/yyyy 'lúc' HH:mm", { locale: vi })}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(item.id);
            }}
            className="p-1.5 rounded cursor-pointer border-none bg-transparent text-slate-600 hover:text-red-400 transition-colors"
          >
            <Trash2 size={14} />
          </button>
          {expanded ? <ChevronUp size={16} className="text-slate-500" /> : <ChevronDown size={16} className="text-slate-500" />}
        </div>
      </div>

      {/* Expanded Content */}
      {expanded && item.result && (
        <div
          className="px-4 pb-4 markdown-content text-sm text-slate-400"
          style={{ borderTop: '1px solid rgba(79,195,247,0.08)' }}
        >
          <div className="pt-3">
            <ReactMarkdown>{item.result}</ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  );
};

// Danh sách lịch sử
export const HistoryList = ({ items, onDelete, filters }) => {
  const filtered = items.filter((item) => {
    if (filters.ticker && !item.ticker.includes(filters.ticker.toUpperCase())) return false;
    if (filters.exchange && filters.exchange !== 'ALL' && item.exchange !== filters.exchange) return false;
    if (filters.signal) {
      const sig = detectSignal(item.result);
      if (sig !== filters.signal) return false;
    }
    return true;
  });

  if (!filtered.length) return (
    <div className="flex flex-col items-center py-12 text-center text-slate-500">
      <div className="text-4xl mb-3">📭</div>
      <div className="text-sm">Không tìm thấy kết quả nào</div>
    </div>
  );

  return (
    <div className="space-y-3">
      {filtered.map((item) => (
        <HistoryItem key={item.id} item={item} onDelete={onDelete} />
      ))}
    </div>
  );
};
