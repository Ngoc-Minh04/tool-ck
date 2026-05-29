// ===== TRANG QUẢN LÝ CẢNH BÁO GIÁ & KHỐI LƯỢNG (UX/UI OPTIMIZED) =====

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  Bell, Trash2, Plus, AlertCircle, CheckCircle, Clock, BellOff, RotateCcw,
  X, Users, Search, Filter, ChevronUp, ChevronDown, ChevronsUpDown,
  Edit3, Send, Zap, TrendingUp, TrendingDown, Trash, ShieldAlert,
  Flame, Check, ArrowRight
} from 'lucide-react';
import Header from '../components/Layout/Header';
import { Button, EmptyState } from '../components/UI';
import { stockApi } from '../services/stockApi';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

// ===== POPULAR TICKERS FOR QUICK SELECTION =====
const POPULAR_TICKERS = ['FPT', 'HPG', 'SSI', 'VND', 'MBB', 'TCB', 'VIC', 'VNM'];

// ===== WEB PUSH NOTIFICATION HOOK =====
const usePushNotification = () => {
  const [permission, setPermission] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'unsupported'
  );

  const requestPermission = async () => {
    if (typeof Notification === 'undefined') {
      toast.error('Trình duyệt không hỗ trợ thông báo!');
      return false;
    }
    const result = await Notification.requestPermission();
    setPermission(result);
    if (result === 'granted') {
      toast.success('Đã bật thông báo trình duyệt!');
      new Notification('⚡ VN Stock AI', {
        body: 'Cảnh báo giá đã được bật thành công!',
        icon: '/favicon.ico',
        tag: 'test'
      });
    } else {
      toast.error('Bạn đã tắt quyền thông báo. Hãy bật lại trong cài đặt trình duyệt.');
    }
    return result === 'granted';
  };

  const sendNotification = useCallback((title, body, tag = '') => {
    if (permission !== 'granted') return;
    try {
      new Notification(title, {
        body,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag,
        requireInteraction: false,
        silent: false,
      });
    } catch (e) {
      console.warn('Push notification failed:', e);
    }
  }, [permission]);

  return { permission, requestPermission, sendNotification };
};

// ===== HELPER FUNCTIONS =====
function getConditionName(cond) {
  switch (cond) {
    case 'above': return '📈 Vượt trên';
    case 'below': return '📉 Giảm dưới';
    case 'volume_above': return '📊 KL vượt trên';
    case 'pct_change_above': return '⚡ Tăng phiên';
    case 'pct_change_below': return '⚡ Giảm phiên';
    case 'pct_change_abs': return '⚡ Biến động';
    case 'rsi_above': return '📊 RSI vượt trên';
    case 'rsi_below': return '📊 RSI giảm dưới';
    case 'price_above_ma20': return '🧬 Cắt lên MA20';
    case 'price_below_ma20': return '🧬 Cắt xuống MA20';
    case 'price_above_ma50': return '🧬 Cắt lên MA50';
    case 'price_below_ma50': return '🧬 Cắt xuống MA50';
    case 'price_above_ma200': return '🧬 Cắt lên MA200';
    case 'price_below_ma200': return '🧬 Cắt xuống MA200';
    case 'macd_cross_up': return '📊 MACD cắt lên Signal';
    case 'macd_cross_down': return '📊 MACD cắt xuống Signal';
    default: return cond;
  }
}

function getConditionBadgeStyle(cond) {
  if (cond === 'above' || cond.includes('above') || cond.includes('up')) {
    return { bg: 'rgba(74,222,128,0.1)', text: '#4ade80', border: 'rgba(74,222,128,0.2)' };
  }
  if (cond === 'below' || cond.includes('below') || cond.includes('down')) {
    return { bg: 'rgba(248,113,113,0.1)', text: '#f87171', border: 'rgba(248,113,113,0.2)' };
  }
  return { bg: 'rgba(79,195,247,0.1)', text: '#4fc3f7', border: 'rgba(79,195,247,0.2)' };
}

function getTargetDisplay(al) {
  if (al.condition.includes('ma') || al.condition.startsWith('macd_')) return '—';
  if (al.condition.startsWith('pct_change_')) return `+${al.price}%`;
  if (al.condition.startsWith('rsi_')) return `${al.price} (RSI)`;
  if (al.condition === 'volume_above') return `${al.price.toLocaleString('vi-VN')} CP`;
  return `${al.price.toLocaleString('vi-VN')} đ`;
}

// Format Real-time preview helper
function formatPreview(value, condition) {
  if (!value || isNaN(value) || parseFloat(value) <= 0) return '';
  const num = parseFloat(value);
  if (condition.includes('ma') || condition.startsWith('macd_')) return '—';
  if (condition.startsWith('pct_change_')) return `Biến động: +${num}%`;
  if (condition.startsWith('rsi_')) return `Chỉ số RSI: ${num}`;
  if (condition === 'volume_above') return `Khối lượng: ${num.toLocaleString('vi-VN')} Cổ phiếu`;
  return `Giá mục tiêu: ${num.toLocaleString('vi-VN')} đ`;
}

// Tính toán % tiến độ đến điều kiện kích hoạt
function calcProgress(alert, currentPrice) {
  if (!currentPrice || currentPrice <= 0) return null;
  const target = alert.price;

  if (alert.condition === 'above') {
    const startPrice = target * 0.8;
    const progress = Math.min(100, Math.max(0, ((currentPrice - startPrice) / (target - startPrice)) * 100));
    const diff = ((currentPrice - target) / target * 100).toFixed(2);
    return { progress, label: diff >= 0 ? `+${diff}%` : `${diff}%`, color: diff >= 0 ? '#4ade80' : '#4fc3f7', isTriggered: currentPrice >= target };
  }

  if (alert.condition === 'below') {
    const startPrice = target * 1.2;
    const progress = Math.min(100, Math.max(0, ((startPrice - currentPrice) / (startPrice - target)) * 100));
    const diff = ((currentPrice - target) / target * 100).toFixed(2);
    return { progress, label: diff >= 0 ? `+${diff}%` : `${diff}%`, color: diff <= 0 ? '#4ade80' : '#f97316', isTriggered: currentPrice <= target };
  }

  return null;
}

// ===== BIỂU ĐỒ MINI SPARKLINE DẠNG AREA CHART CÓ GRADIENT & HIỆU ỨNG VẼ =====
const Sparkline = ({ quote }) => {
  if (!quote || quote.high === undefined || quote.low === undefined || quote.open === undefined || quote.price === undefined) {
    return <div className="w-[45px] h-[15px]" />;
  }
  const { open, low, high, price } = quote;
  if (high === low) {
    return (
      <svg className="w-[45px] h-[15px]" style={{ overflow: 'visible' }}>
        <line x1="0" y1="7.5" x2="45" y2="7.5" stroke="#475569" strokeWidth="1.5" strokeDasharray="2,2" />
      </svg>
    );
  }
  
  const mapY = (val) => {
    // Chiều cao 15px. Map giá trị sao cho High nằm trên (Y=1) và Low nằm dưới (Y=14)
    return 14 - ((val - low) / (high - low)) * 12;
  };

  const p0 = { x: 2, y: mapY(open) };
  const p1 = { x: 15, y: mapY(low) };
  const p2 = { x: 28, y: mapY(high) };
  const p3 = { x: 43, y: mapY(price) };

  const isGreen = price >= open;
  const color = isGreen ? '#4ade80' : '#f87171';
  const gradientId = `spark-grad-${quote.ticker}`;

  return (
    <div className="flex items-center hover:scale-110 transition-transform duration-200 cursor-help" title={`Mở: ${open.toLocaleString()} | Thấp: ${low.toLocaleString()} | Cao: ${high.toLocaleString()} | Đóng: ${price.toLocaleString()}`}>
      <svg className="w-[45px] h-[15px] overflow-visible">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.4" />
            <stop offset="100%" stopColor={color} stopOpacity="0.0" />
          </linearGradient>
        </defs>
        {/* Gradient Fill under path */}
        <path
          d={`M ${p0.x} ${p0.y} L ${p1.x} ${p1.y} L ${p2.x} ${p2.y} L ${p3.x} ${p3.y} L ${p3.x} 15 L ${p0.x} 15 Z`}
          fill={`url(#${gradientId})`}
        />
        {/* Stroke Line */}
        <path
          d={`M ${p0.x} ${p0.y} L ${p1.x} ${p1.y} L ${p2.x} ${p2.y} L ${p3.x} ${p3.y}`}
          fill="none"
          stroke={color}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            strokeDasharray: 80,
            strokeDashoffset: 0,
            animation: 'sparkDraw 1.2s ease-out forwards'
          }}
        />
        <circle cx={p3.x} cy={p3.y} r="2" fill={color} />
      </svg>
      {/* Inline styles for line drawing animation */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes sparkDraw {
          from { stroke-dashoffset: 80; }
          to { stroke-dashoffset: 0; }
        }
      `}} />
    </div>
  );
};

// ===== MODAL XÁC NHẬN XÓA =====
const DeleteConfirmModal = ({ alert, onConfirm, onCancel }) => {
  if (!alert) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm rounded-2xl p-6 space-y-4 transition-all scale-100 duration-200"
        style={{
          background: 'linear-gradient(135deg, #0d1b2a 0%, #1a2a3a 100%)',
          border: '1px solid rgba(239,68,68,0.25)',
          boxShadow: '0 25px 50px rgba(0,0,0,0.6)'
        }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full flex items-center justify-center animate-pulse" style={{ background: 'rgba(239,68,68,0.15)' }}>
              <Trash2 size={15} style={{ color: '#ef4444' }} />
            </div>
            <span className="text-sm font-semibold text-slate-200">Xác nhận xóa</span>
          </div>
          <button onClick={onCancel} className="p-1 rounded-lg cursor-pointer border-none bg-transparent text-slate-500 hover:text-slate-300 transition-all">
            <X size={14} />
          </button>
        </div>

        <div className="p-3 rounded-xl text-xs space-y-1" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <p className="text-slate-400">Bạn sắp xóa cảnh báo:</p>
          <p className="text-slate-200 font-bold text-sm">{alert.ticker}</p>
          <p className="text-slate-400">{getConditionName(alert.condition)} — {getTargetDisplay(alert)}</p>
        </div>

        <p className="text-xs text-slate-500 leading-relaxed">
          Hành động này <span className="text-red-400 font-semibold">không thể hoàn tác</span>. Cảnh báo sẽ bị xóa vĩnh viễn.
        </p>

        <div className="flex gap-2 pt-1">
          <button onClick={onCancel} className="flex-1 py-2 text-xs font-medium rounded-xl cursor-pointer border-none transition-all hover:bg-slate-800" style={{ background: 'rgba(255,255,255,0.05)', color: '#94a3b8' }}>
            Hủy bỏ
          </button>
          <button onClick={onConfirm} className="flex-1 py-2 text-xs font-semibold rounded-xl cursor-pointer border-none transition-all hover:brightness-110" style={{ background: 'linear-gradient(135deg, #7f1d1d, #ef4444)', color: '#fff' }}>
            Xóa cảnh báo
          </button>
        </div>
      </div>
    </div>
  );
};

// ===== MODAL XÁC NHẬN XÓA HÀNG LOẠT =====
const BulkDeleteConfirmModal = ({ isOpen, count, onConfirm, onCancel }) => {
  if (!isOpen) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm rounded-2xl p-6 space-y-4"
        style={{
          background: 'linear-gradient(135deg, #0d1b2a 0%, #1a2a3a 100%)',
          border: '1px solid rgba(239,68,68,0.25)',
          boxShadow: '0 25px 50px rgba(0,0,0,0.6)'
        }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full flex items-center justify-center animate-bounce" style={{ background: 'rgba(239,68,68,0.15)' }}>
              <ShieldAlert size={15} style={{ color: '#ef4444' }} />
            </div>
            <span className="text-sm font-semibold text-slate-200">Xóa hàng loạt</span>
          </div>
          <button onClick={onCancel} className="p-1 rounded-lg cursor-pointer border-none bg-transparent text-slate-500 hover:text-slate-300 transition-all">
            <X size={14} />
          </button>
        </div>

        <div className="p-3 rounded-xl text-xs space-y-1" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <p className="text-slate-400">Bạn sắp xóa đồng thời:</p>
          <p className="text-red-400 font-bold text-sm">{count} cảnh báo đã chọn</p>
        </div>

        <p className="text-xs text-slate-500 leading-relaxed">
          Hành động này <span className="text-red-400 font-semibold">không thể hoàn tác</span>. Toàn bộ cảnh báo đã chọn sẽ bị xóa vĩnh viễn khỏi hệ thống.
        </p>

        <div className="flex gap-2 pt-1">
          <button onClick={onCancel} className="flex-1 py-2 text-xs font-medium rounded-xl cursor-pointer border-none transition-all hover:bg-slate-800" style={{ background: 'rgba(255,255,255,0.05)', color: '#94a3b8' }}>
            Hủy bỏ
          </button>
          <button onClick={onConfirm} className="flex-1 py-2 text-xs font-semibold rounded-xl cursor-pointer border-none transition-all hover:brightness-110" style={{ background: 'linear-gradient(135deg, #7f1d1d, #ef4444)', color: '#fff' }}>
            Xóa {count} mục
          </button>
        </div>
      </div>
    </div>
  );
};

// ===== MODAL CHỈNH SỬA CẢNH BÁO =====
const EditAlertModal = ({ alert, onSave, onCancel }) => {
  const [condition, setCondition] = useState(alert?.condition || 'above');
  const [price, setPrice] = useState(String(alert?.price ?? ''));
  const [telegramId, setTelegramId] = useState(alert?.telegram_chat_id || '');
  const [note, setNote] = useState(alert?.note || '');
  const [mode, setMode] = useState(alert?.mode || 'once');
  const [cooldown, setCooldown] = useState(alert?.cooldown || 15);
  const [saving, setSaving] = useState(false);

  const isNoPriceCondition = condition.includes('ma') || condition.startsWith('macd_');
  const isPercentageCondition = condition.startsWith('pct_change_');
  const isRsiCondition = condition.startsWith('rsi_');
  const isVolumeCondition = condition === 'volume_above';

  const livePreview = useMemo(() => formatPreview(price, condition), [price, condition]);

  if (!alert) return null;

  const handleSave = async () => {
    if (!isNoPriceCondition && (!price || isNaN(price) || parseFloat(price) <= 0)) {
      toast.error('Vui lòng nhập giá trị hợp lệ');
      return;
    }
    setSaving(true);
    try {
      const updates = {
        condition,
        price: isNoPriceCondition ? 0.0 : parseFloat(price),
        telegram_chat_id: telegramId.trim() || null,
        note: note.trim() || null,
        mode,
        cooldown: parseInt(cooldown, 10)
      };
      await onSave(alert.id, updates);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
      onClick={onCancel}
    >
      <div
        className="w-full max-w-md rounded-2xl p-6 space-y-4"
        style={{
          background: 'linear-gradient(135deg, #0d1b2a 0%, #0f2236 100%)',
          border: '1px solid rgba(79,195,247,0.2)',
          boxShadow: '0 30px 60px rgba(0,0,0,0.6), 0 0 60px rgba(79,195,247,0.05)'
        }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'rgba(79,195,247,0.15)' }}>
              <Edit3 size={14} style={{ color: '#4fc3f7' }} />
            </div>
            <div>
              <span className="text-sm font-semibold text-slate-200">Chỉnh sửa cảnh báo</span>
              <span className="text-xs text-cyan-400 font-bold ml-2">{alert.ticker}</span>
            </div>
          </div>
          <button onClick={onCancel} className="p-1 rounded-lg cursor-pointer border-none bg-transparent text-slate-500 hover:text-slate-300 transition-all">
            <X size={14} />
          </button>
        </div>

        <div className="space-y-3">
          {/* Điều kiện */}
          <div>
            <label className="text-xs text-slate-500 block mb-1.5 font-medium">Điều kiện kích hoạt</label>
            <select value={condition} onChange={e => setCondition(e.target.value)} className="select-dark w-full text-sm">
              <optgroup label="Cảnh báo giá & Khối lượng">
                <option value="above">Giá vượt lên trên (&gt;=)</option>
                <option value="below">Giá giảm xuống dưới (&lt;=)</option>
                <option value="volume_above">Khối lượng vượt trên (&gt;=)</option>
              </optgroup>
              <optgroup label="Biến động trong ngày">
                <option value="pct_change_above">Tăng quá (+ %)</option>
                <option value="pct_change_below">Giảm quá (- %)</option>
                <option value="pct_change_abs">Biến động quá (+/- %)</option>
              </optgroup>
              <optgroup label="Chỉ báo RSI">
                <option value="rsi_above">RSI vượt trên</option>
                <option value="rsi_below">RSI giảm dưới</option>
              </optgroup>
              <optgroup label="Đường trung bình (MA)">
                <option value="price_above_ma20">Giá cắt lên MA20</option>
                <option value="price_below_ma20">Giá cắt xuống MA20</option>
                <option value="price_above_ma50">Giá cắt lên MA50</option>
                <option value="price_below_ma50">Giá cắt xuống MA50</option>
                <option value="price_above_ma200">Giá cắt lên MA200</option>
                <option value="price_below_ma200">Giá cắt xuống MA200</option>
              </optgroup>
              <optgroup label="Xu hướng MACD">
                <option value="macd_cross_up">MACD cắt lên Signal</option>
                <option value="macd_cross_down">MACD cắt xuống Signal</option>
              </optgroup>
            </select>
          </div>

          {/* Giá trị mục tiêu */}
          {!isNoPriceCondition && (
            <div>
              <label className="text-xs text-slate-500 block mb-1.5 font-medium">
                {isPercentageCondition ? 'Tỷ lệ biến động (%)' : isRsiCondition ? 'Chỉ số RSI (0–100)' : isVolumeCondition ? 'Khối lượng mục tiêu (CP)' : 'Giá mục tiêu (VNĐ)'}
              </label>
              <input
                type="number"
                value={price}
                onChange={e => setPrice(e.target.value)}
                className="input-dark w-full text-sm font-num focus:border-cyan-400"
                min="0"
                step="any"
              />
              {livePreview && (
                <span className="text-[10px] text-cyan-400 block mt-1.5 font-medium animate-fadeIn">
                  {livePreview}
                </span>
              )}
            </div>
          )}

          {/* Chế độ */}
          <div>
            <label className="text-xs text-slate-500 block mb-1.5 font-medium">Chế độ kích hoạt</label>
            <select value={mode} onChange={e => setMode(e.target.value)} className="select-dark w-full text-sm">
              <option value="once">Báo 1 lần duy nhất</option>
              <option value="daily">Báo 1 lần mỗi ngày</option>
              <option value="continuous">Báo liên tục</option>
            </select>
          </div>

          {mode === 'continuous' && (
            <div>
              <label className="text-xs text-slate-500 block mb-1.5 font-medium">Giãn cách</label>
              <select value={cooldown} onChange={e => setCooldown(e.target.value)} className="select-dark w-full text-sm">
                <option value={5}>5 phút</option>
                <option value={10}>10 phút</option>
                <option value={15}>15 phút</option>
                <option value={30}>30 phút</option>
              </select>
            </div>
          )}

          {/* Telegram */}
          <div>
            <label className="text-xs text-slate-500 block mb-1.5 font-medium">Telegram Chat ID</label>
            <input
              type="text"
              value={telegramId}
              onChange={e => setTelegramId(e.target.value)}
              placeholder="VD: 123456, -10098765"
              className="input-dark w-full text-sm"
            />
          </div>

          {/* Ghi chú */}
          <div>
            <label className="text-xs text-slate-500 block mb-1.5 font-medium">Ghi chú</label>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              className="input-dark w-full text-sm resize-none"
              rows={2}
              placeholder="Ghi chú cá nhân..."
            />
          </div>
        </div>

        <div className="flex gap-2 pt-1">
          <button onClick={onCancel} className="flex-1 py-2 text-xs font-medium rounded-xl cursor-pointer border-none transition-all" style={{ background: 'rgba(255,255,255,0.05)', color: '#94a3b8' }}>
            Hủy
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-2 text-xs font-semibold rounded-xl cursor-pointer border-none transition-all flex items-center justify-center gap-1.5"
            style={{ background: 'linear-gradient(135deg, #1a3a5c, #4fc3f7)', color: '#0d1b2a', opacity: saving ? 0.7 : 1 }}
          >
            {saving ? '...' : <><CheckCircle size={12} /> Lưu thay đổi</>}
          </button>
        </div>
      </div>
    </div>
  );
};

// ===== THANH TIẾN TRÌNH =====
const ProgressBar = ({ progress, color, label }) => {
  if (progress === null || progress === undefined) return null;
  return (
    <div className="flex items-center gap-1.5 w-full min-w-[80px]">
      <div
        className="flex-1 rounded-full overflow-hidden"
        style={{ height: '4px', background: 'rgba(255,255,255,0.06)' }}
      >
        <div
          style={{
            height: '100%',
            width: `${Math.min(100, progress)}%`,
            background: `linear-gradient(90deg, ${color}88, ${color})`,
            borderRadius: '9999px',
            transition: 'width 0.6s ease',
          }}
        />
      </div>
      <span className="text-[10px] font-num font-medium whitespace-nowrap" style={{ color, minWidth: '36px', textAlign: 'right' }}>
        {label}
      </span>
    </div>
  );
};

// ===== SORT ICON =====
const SortIcon = ({ field, sortField, sortDir }) => {
  if (sortField !== field) return <ChevronsUpDown size={10} className="text-slate-700" />;
  return sortDir === 'asc' ? <ChevronUp size={10} className="text-cyan-400" /> : <ChevronDown size={10} className="text-cyan-400" />;
};

// ===== MAIN COMPONENT =====
const AlertsPage = () => {
  const [activeTab, setActiveTab] = useState('alerts'); // alerts | logs
  const [alerts, setAlerts] = useState([]);
  const [alertLogs, setAlertLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [logsLoading, setLogsLoading] = useState(false);
  const [currentPrices, setCurrentPrices] = useState({}); // { ticker: { price, pct, open, low, high } }
  const [pricesLoading, setPricesLoading] = useState(false);

  // Checkbox Selection for Bulk Actions
  const [selectedIds, setSelectedIds] = useState([]);

  // Modal state
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [editTarget, setEditTarget] = useState(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  // Filter & Search state
  const [searchTicker, setSearchTicker] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all | waiting | triggered

  // Sort state
  const [sortField, setSortField] = useState('created_at');
  const [sortDir, setSortDir] = useState('desc');

  // Test Telegram
  const [testingTelegram, setTestingTelegram] = useState(false);
  const [testStatus, setTestStatus] = useState(null); // null | 'success' | 'error'

  const { permission, requestPermission, sendNotification } = usePushNotification();
  const triggeredAlertsRef = useRef(new Set());

  // Form state
  const [ticker, setTicker] = useState('');
  const [condition, setCondition] = useState('above');
  const [price, setPrice] = useState('');
  const [telegramId, setTelegramId] = useState(() => {
    return localStorage.getItem('vn_stock_default_telegram_id') || '';
  });
  const [note, setNote] = useState('');
  const [mode, setMode] = useState('once');
  const [cooldown, setCooldown] = useState(15);

  const isNoPriceCondition = condition.includes('ma') || condition.startsWith('macd_');
  const isPercentageCondition = condition.startsWith('pct_change_');
  const isRsiCondition = condition.startsWith('rsi_');
  const isVolumeCondition = condition === 'volume_above';

  // Live formatting preview inside Form
  const formValuePreview = useMemo(() => formatPreview(price, condition), [price, condition]);

  // Stats
  const totalAlerts = alerts.length;
  const waitingAlerts = alerts.filter(a => !a.triggered).length;
  const triggeredAlerts = alerts.filter(a => a.triggered).length;

  // Fetch alerts
  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    try {
      const data = await stockApi.getAlerts();
      setAlerts(data || []);
      
      // Clean up selected IDs that no longer exist
      setSelectedIds(prev => prev.filter(id => (data || []).some(a => a.id === id)));

      (data || []).forEach(alert => {
        if (alert.triggered && !triggeredAlertsRef.current.has(alert.id)) {
          triggeredAlertsRef.current.add(alert.id);
          let condText = `đã chạm điều kiện`;
          if (alert.condition === 'above') condText = `vượt lên mức ${alert.price.toLocaleString('vi-VN')}đ`;
          else if (alert.condition === 'below') condText = `giảm xuống mức ${alert.price.toLocaleString('vi-VN')}đ`;
          else if (alert.condition === 'volume_above') condText = `có khối lượng vượt ${alert.price.toLocaleString('vi-VN')} CP`;
          sendNotification(`⚡ Cảnh báo khớp! ${alert.ticker}`, `Cổ phiếu ${alert.ticker} ${condText}`, `alert-${alert.id}`);
        }
      });
    } catch (err) {
      console.error('Failed to fetch alerts:', err);
      toast.error('Không thể tải danh sách cảnh báo');
    } finally {
      setLoading(false);
    }
  }, [sendNotification]);

  // Fetch alert logs
  const fetchAlertLogs = useCallback(async () => {
    setLogsLoading(true);
    try {
      const data = await stockApi.getAlertLogs();
      setAlertLogs(data || []);
    } catch (err) {
      console.error('Failed to fetch logs:', err);
      toast.error('Không thể tải lịch sử cảnh báo');
    } finally {
      setLogsLoading(false);
    }
  }, []);

  // Fetch current prices for alert tickers
  const fetchCurrentPrices = useCallback(async (alertList) => {
    const listToQuery = alertList || alerts;
    const tickers = [...new Set(listToQuery.map(a => a.ticker))];
    if (!tickers.length) return;
    setPricesLoading(true);
    try {
      const quotes = await stockApi.getQuickQuotes(tickers.join(','));
      const map = {};
      (quotes || []).forEach(q => { map[q.ticker] = q; });
      setCurrentPrices(map);
    } catch (err) {
      console.warn('Failed to fetch current prices:', err);
    } finally {
      setPricesLoading(false);
    }
  }, [alerts]);

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 60000);
    return () => clearInterval(interval);
  }, [fetchAlerts]);

  // Fetch prices when alerts change
  useEffect(() => {
    if (alerts.length > 0) {
      fetchCurrentPrices(alerts);
    }
  }, [alerts]);

  // Fetch logs automatically if Tab Log is opened
  useEffect(() => {
    if (activeTab === 'logs') {
      fetchAlertLogs();
    }
  }, [activeTab, fetchAlertLogs]);

  // Sort handler
  const handleSort = (field) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  // Checkbox multi selection helpers
  const toggleSelect = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    const displayedIds = displayedAlerts.map(a => a.id);
    const allSelected = displayedIds.length > 0 && displayedIds.every(id => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds(prev => prev.filter(id => !displayedIds.includes(id)));
    } else {
      setSelectedIds(prev => [...new Set([...prev, ...displayedIds])]);
    }
  };

  // Filtered & Sorted alerts
  const displayedAlerts = useMemo(() => {
    let result = [...alerts];

    // Filter by search
    if (searchTicker.trim()) {
      result = result.filter(a => a.ticker.includes(searchTicker.trim().toUpperCase()));
    }

    // Filter by status
    if (statusFilter === 'waiting') result = result.filter(a => !a.triggered);
    else if (statusFilter === 'triggered') result = result.filter(a => a.triggered);

    // Sort
    result.sort((a, b) => {
      let va, vb;
      if (sortField === 'created_at') { va = a.created_at || ''; vb = b.created_at || ''; }
      else if (sortField === 'ticker') { va = a.ticker || ''; vb = b.ticker || ''; }
      else if (sortField === 'price') { va = a.price || 0; vb = b.price || 0; }
      else if (sortField === 'triggered') { va = a.triggered ? 1 : 0; vb = b.triggered ? 1 : 0; }
      else { va = a[sortField] || ''; vb = b[sortField] || ''; }

      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [alerts, searchTicker, statusFilter, sortField, sortDir]);

  // Create alert
  const handleCreateAlert = async (e) => {
    e.preventDefault();
    if (!ticker.trim()) { toast.error('Vui lòng nhập mã cổ phiếu'); return; }
    const noPrice = condition.includes('ma') || condition.startsWith('macd_');
    if (!noPrice && (!price || isNaN(price) || parseFloat(price) <= 0)) {
      toast.error('Vui lòng nhập giá trị hợp lệ'); return;
    }
    try {
      const body = {
        ticker: ticker.trim().toUpperCase(),
        condition,
        price: noPrice ? 0.0 : parseFloat(price),
        telegram_chat_id: telegramId.trim() || null,
        note: note.trim() || null,
        mode,
        cooldown: parseInt(cooldown, 10)
      };
      await stockApi.createAlert(body);
      if (telegramId.trim()) {
        localStorage.setItem('vn_stock_default_telegram_id', telegramId.trim());
      }
      toast.success(`Đã tạo cảnh báo cho mã ${body.ticker}!`);
      setTicker(''); setPrice(''); setNote(''); setMode('once'); setCooldown(15);
      fetchAlerts();
    } catch (err) {
      console.error('Failed to create alert:', err);
      toast.error('Không thể tạo cảnh báo');
    }
  };

  // Delete handlers
  const handleAskDelete = (alert) => setDeleteTarget(alert);
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await stockApi.deleteAlert(deleteTarget.id);
      toast.success('Đã xóa cảnh báo');
      fetchAlerts();
    } catch (err) {
      toast.error('Không thể xóa cảnh báo');
    } finally {
      setDeleteTarget(null);
    }
  };

  // Reactivate
  const handleReactivateAlert = async (id) => {
    try {
      await stockApi.reactivateAlert(id);
      toast.success('Đã kích hoạt lại cảnh báo!');
      fetchAlerts();
    } catch (err) {
      toast.error('Không thể kích hoạt lại cảnh báo');
    }
  };

  // Edit handler
  const handleSaveEdit = async (id, updates) => {
    try {
      await stockApi.updateAlert(id, updates);
      toast.success('Đã cập nhật cảnh báo!');
      setEditTarget(null);
      fetchAlerts();
    } catch (err) {
      toast.error('Không thể cập nhật cảnh báo');
    }
  };

  // Test Telegram
  const handleTestTelegram = async () => {
    if (!telegramId.trim()) {
      toast.error('Vui lòng nhập Telegram Chat ID trước');
      return;
    }
    setTestingTelegram(true);
    setTestStatus(null);
    try {
      await stockApi.testTelegram(telegramId.trim());
      toast.success('Đã gửi tin nhắn thử nghiệm! Kiểm tra Telegram của bạn.');
      setTestStatus('success');
    } catch (err) {
      const msg = err?.response?.data?.detail || 'Gửi thất bại. Kiểm tra Bot Token và Chat ID.';
      toast.error(msg);
      setTestStatus('error');
    } finally {
      setTestingTelegram(false);
    }
  };

  // Clear Alert Logs
  const handleClearAllLogs = async () => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa toàn bộ lịch sử cảnh báo?')) return;
    try {
      await stockApi.clearAlertLogs();
      toast.success('Đã xóa toàn bộ lịch sử gửi thành công!');
      fetchAlertLogs();
    } catch (err) {
      toast.error('Lỗi khi xóa lịch sử');
    }
  };

  // Bulk Actions
  const handleBulkStatus = async (triggered) => {
    if (selectedIds.length === 0) return;
    const actionLabel = triggered ? 'Tạm dừng' : 'Kích hoạt';
    try {
      await stockApi.bulkUpdateAlertsStatus(selectedIds, triggered);
      toast.success(`Đã ${actionLabel.toLowerCase()} ${selectedIds.length} cảnh báo!`);
      setSelectedIds([]);
      fetchAlerts();
    } catch (err) {
      toast.error(`Không thể ${actionLabel.toLowerCase()} các cảnh báo đã chọn`);
    }
  };

  const handleBulkDeleteConfirm = () => {
    if (selectedIds.length === 0) return;
    setBulkDeleteOpen(true);
  };

  const handleExecuteBulkDelete = async () => {
    try {
      await stockApi.bulkDeleteAlerts(selectedIds);
      toast.success(`Đã xóa thành công ${selectedIds.length} cảnh báo!`);
      setSelectedIds([]);
      fetchAlerts();
    } catch (err) {
      toast.error('Lỗi khi xóa các cảnh báo đã chọn');
    } finally {
      setBulkDeleteOpen(false);
    }
  };

  // Quick select ticker helper
  const handleQuickSelectTicker = (tk) => {
    setTicker(tk);
  };

  return (
    <>
      {/* Modals */}
      <DeleteConfirmModal alert={deleteTarget} onConfirm={handleConfirmDelete} onCancel={() => setDeleteTarget(null)} />
      <EditAlertModal alert={editTarget} onSave={handleSaveEdit} onCancel={() => setEditTarget(null)} />
      <BulkDeleteConfirmModal isOpen={bulkDeleteOpen} count={selectedIds.length} onConfirm={handleExecuteBulkDelete} onCancel={() => setBulkDeleteOpen(false)} />

      <div className="flex flex-col h-full overflow-hidden">
        <Header title="Cảnh báo thông minh" />

        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">

            {/* === CỘT TRÁI: FORM TẠO CẢNH BÁO === */}
            <div className="xl:col-span-1 glass-card p-5 space-y-4">
              <div className="flex items-center gap-2 pb-3" style={{ borderBottom: '1px solid rgba(79,195,247,0.08)' }}>
                <Bell size={16} className="text-cyan-400 animate-pulse" />
                <h3 className="text-sm font-semibold text-slate-200">Tạo cảnh báo mới</h3>
              </div>

              <form onSubmit={handleCreateAlert} className="space-y-4">
                {/* Ticker */}
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-xs text-slate-500 font-medium">Mã cổ phiếu</label>
                    <span className="text-[10px] text-slate-600">Viết hoa tự động</span>
                  </div>
                  <input
                    type="text"
                    value={ticker}
                    onChange={e => setTicker(e.target.value.toUpperCase())}
                    placeholder="Ví dụ: FPT"
                    className="input-dark w-full text-sm focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/20"
                    maxLength={10}
                    required
                  />
                  {/* Badges Chọn nhanh */}
                  <div className="flex flex-wrap gap-1 mt-2">
                    {POPULAR_TICKERS.map(tk => (
                      <button
                        key={tk}
                        type="button"
                        onClick={() => handleQuickSelectTicker(tk)}
                        className="px-2 py-0.5 rounded text-[10px] bg-slate-900 text-slate-400 border border-slate-800 hover:border-cyan-400/40 hover:text-cyan-400 transition-all cursor-pointer"
                        style={{
                          background: ticker === tk ? 'rgba(79,195,247,0.1)' : '',
                          borderColor: ticker === tk ? '#4fc3f7' : ''
                        }}
                      >
                        {tk}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Condition */}
                <div>
                  <label className="text-xs text-slate-500 block mb-1.5 font-medium">Điều kiện kích hoạt</label>
                  <select value={condition} onChange={e => setCondition(e.target.value)} className="select-dark w-full text-sm">
                    <optgroup label="Cảnh báo giá & Khối lượng">
                      <option value="above">Giá vượt lên trên (&gt;=)</option>
                      <option value="below">Giá giảm xuống dưới (&lt;=)</option>
                      <option value="volume_above">Khối lượng vượt trên (&gt;=)</option>
                    </optgroup>
                    <optgroup label="Biến động trong ngày">
                      <option value="pct_change_above">Tăng quá (+ %)</option>
                      <option value="pct_change_below">Giảm quá (- %)</option>
                      <option value="pct_change_abs">Biến động quá (+/- %)</option>
                    </optgroup>
                    <optgroup label="Chỉ báo RSI">
                      <option value="rsi_above">RSI vượt trên</option>
                      <option value="rsi_below">RSI giảm dưới</option>
                    </optgroup>
                    <optgroup label="Đường trung bình (MA)">
                      <option value="price_above_ma20">Giá cắt lên MA20</option>
                      <option value="price_below_ma20">Giá cắt xuống MA20</option>
                      <option value="price_above_ma50">Giá cắt lên MA50</option>
                      <option value="price_below_ma50">Giá cắt xuống MA50</option>
                      <option value="price_above_ma200">Giá cắt lên MA200</option>
                      <option value="price_below_ma200">Giá cắt xuống MA200</option>
                    </optgroup>
                    <optgroup label="Xu hướng MACD">
                      <option value="macd_cross_up">MACD cắt lên Signal</option>
                      <option value="macd_cross_down">MACD cắt xuống Signal</option>
                    </optgroup>
                  </select>
                </div>

                {/* Trigger Mode */}
                <div>
                  <label className="text-xs text-slate-500 block mb-1.5 font-medium">Chế độ kích hoạt</label>
                  <select value={mode} onChange={e => setMode(e.target.value)} className="select-dark w-full text-sm">
                    <option value="once">Báo 1 lần duy nhất</option>
                    <option value="daily">Báo 1 lần mỗi ngày</option>
                    <option value="continuous">Báo liên tục</option>
                  </select>
                </div>

                {/* Cooldown */}
                {mode === 'continuous' && (
                  <div>
                    <label className="text-xs text-slate-500 block mb-1.5 font-medium">Thời gian giãn cách</label>
                    <select value={cooldown} onChange={e => setCooldown(e.target.value)} className="select-dark w-full text-sm">
                      <option value={5}>5 phút</option>
                      <option value={10}>10 phút</option>
                      <option value={15}>15 phút (mặc định)</option>
                      <option value={30}>30 phút</option>
                    </select>
                  </div>
                )}

                {/* Target Price or Volume */}
                {!isNoPriceCondition && (
                  <div>
                    <label className="text-xs text-slate-500 block mb-1.5 font-medium">
                      {isPercentageCondition && 'Tỷ lệ biến động (%)'}
                      {isRsiCondition && 'Chỉ số RSI (0–100)'}
                      {isVolumeCondition && 'Khối lượng mục tiêu (Cổ phiếu)'}
                      {!isPercentageCondition && !isRsiCondition && !isVolumeCondition && 'Giá mục tiêu (VNĐ)'}
                    </label>
                    <input
                      type="number"
                      value={price}
                      onChange={e => setPrice(e.target.value)}
                      placeholder={isPercentageCondition ? 'Ví dụ: 5' : isRsiCondition ? 'Ví dụ: 30' : isVolumeCondition ? 'Ví dụ: 1000000' : 'Ví dụ: 75000'}
                      className="input-dark w-full text-sm font-num focus:border-cyan-400"
                      required
                      min="0"
                      step="any"
                    />
                    {formValuePreview && (
                      <span className="text-[10px] text-cyan-400 block mt-1.5 font-medium animate-fadeIn">
                        {formValuePreview}
                      </span>
                    )}
                  </div>
                )}

                {/* Telegram ID + Test button */}
                <div>
                  <label className="text-xs text-slate-500 block mb-1.5 font-medium">
                    Telegram Chat ID
                    <span className="ml-1 text-slate-600">(Không bắt buộc)</span>
                  </label>
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      value={telegramId}
                      onChange={e => setTelegramId(e.target.value)}
                      placeholder="VD: 123456, -10098765"
                      className="input-dark flex-1 text-sm font-num focus:border-cyan-400"
                    />
                    <button
                      type="button"
                      onClick={handleTestTelegram}
                      disabled={testingTelegram || !telegramId.trim()}
                      title="Gửi tin nhắn thử để kiểm tra kết nối"
                      className="flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-semibold cursor-pointer border-none transition-all flex-shrink-0"
                      style={{
                        background: testingTelegram 
                          ? 'rgba(79,195,247,0.05)' 
                          : testStatus === 'success' 
                            ? 'rgba(74,222,128,0.1)' 
                            : testStatus === 'error'
                              ? 'rgba(239,68,68,0.1)'
                              : 'rgba(79,195,247,0.12)',
                        color: testStatus === 'success' ? '#4ade80' : testStatus === 'error' ? '#f87171' : '#4fc3f7',
                        border: `1px solid ${
                          testStatus === 'success' 
                            ? 'rgba(74,222,128,0.3)' 
                            : testStatus === 'error'
                              ? 'rgba(239,68,68,0.3)'
                              : 'rgba(79,195,247,0.25)'
                        }`,
                        opacity: (!telegramId.trim() || testingTelegram) ? 0.5 : 1
                      }}
                    >
                      {testingTelegram ? '...' : testStatus === 'success' ? <Check size={11} /> : 'Thử'}
                    </button>
                  </div>
                  <div className="mt-1.5 space-y-0.5">
                    <span className="text-[10px] text-slate-500 block leading-relaxed">
                      Nhiều ID cách nhau bằng <span className="text-cyan-400 font-medium">dấu phẩy</span>. ID nhóm bắt đầu bằng &ldquo;-&rdquo;.
                    </span>
                    <a
                      href="https://t.me/userinfobot"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[10px] text-cyan-400 hover:text-cyan-300 transition-colors mt-0.5"
                    >
                      <Users size={9} />
                      Lấy Chat ID của bạn ngay →
                    </a>
                  </div>
                </div>

                {/* Note */}
                <div>
                  <label className="text-xs text-slate-500 block mb-1.5 font-medium">Ghi chú (Không bắt buộc)</label>
                  <textarea
                    value={note}
                    onChange={e => setNote(e.target.value)}
                    placeholder="Ví dụ: Bán chốt lời khi đạt target"
                    className="input-dark w-full text-sm resize-none"
                    rows={2}
                  />
                </div>

                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 py-2.5 text-xs font-semibold rounded-lg cursor-pointer border-none transition-all mt-2 hover:brightness-115 active:scale-98"
                  style={{ background: 'linear-gradient(135deg, #1a3a5c, #4fc3f7)', color: '#0d1b2a' }}
                >
                  <Plus size={14} />
                  Tạo Cảnh báo
                </button>
              </form>
            </div>

            {/* === CỘT PHẢI: DANH SÁCH & TABS === */}
            <div className="xl:col-span-2 space-y-4">

              {/* STATS PANELS - GRADIENT OPTIMIZED */}
              <div className="grid grid-cols-3 gap-4">
                <div
                  className="rounded-2xl p-4 flex flex-col gap-1.5 border relative overflow-hidden transition-all duration-300 hover:shadow-cyan-500/5 hover:-translate-y-0.5"
                  style={{
                    background: 'linear-gradient(135deg, rgba(79,195,247,0.08) 0%, rgba(79,195,247,0.02) 100%)',
                    borderColor: 'rgba(79,195,247,0.15)',
                  }}
                >
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Tổng cảnh báo</span>
                    <Bell size={13} className="text-cyan-400 opacity-60" />
                  </div>
                  <span className="text-3xl font-black text-slate-200 font-num leading-none">{totalAlerts}</span>
                </div>

                <div
                  className="rounded-2xl p-4 flex flex-col gap-1.5 border relative overflow-hidden transition-all duration-300 hover:shadow-amber-500/5 hover:-translate-y-0.5"
                  style={{
                    background: 'linear-gradient(135deg, rgba(245,158,11,0.08) 0%, rgba(245,158,11,0.02) 100%)',
                    borderColor: 'rgba(245,158,11,0.15)',
                  }}
                >
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Đang chờ</span>
                    <Clock size={13} className="text-amber-400 opacity-60" />
                  </div>
                  <span className="text-3xl font-black font-num leading-none" style={{ color: '#fbbf24' }}>{waitingAlerts}</span>
                </div>

                <div
                  className="rounded-2xl p-4 flex flex-col gap-1.5 border relative overflow-hidden transition-all duration-300 hover:shadow-emerald-500/5 hover:-translate-y-0.5"
                  style={{
                    background: 'linear-gradient(135deg, rgba(16,185,129,0.08) 0%, rgba(16,185,129,0.02) 100%)',
                    borderColor: 'rgba(16,185,129,0.15)',
                  }}
                >
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Đã báo</span>
                    <CheckCircle size={13} className="text-emerald-400 opacity-60" />
                  </div>
                  <span className="text-3xl font-black font-num leading-none" style={{ color: '#34d399' }}>{triggeredAlerts}</span>
                </div>
              </div>

              {/* TAB SELECTOR */}
              <div className="flex gap-1.5 p-1 rounded-xl bg-slate-950/70 border border-slate-900 w-fit">
                <button
                  onClick={() => setActiveTab('alerts')}
                  className="px-4 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer border-none"
                  style={{
                    background: activeTab === 'alerts' ? 'linear-gradient(135deg, #1a3a5c, #4fc3f7)' : 'transparent',
                    color: activeTab === 'alerts' ? '#0d1b2a' : '#94a3b8'
                  }}
                >
                  🔔 Cảnh báo hoạt động
                </button>
                <button
                  onClick={() => setActiveTab('logs')}
                  className="px-4 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer border-none"
                  style={{
                    background: activeTab === 'logs' ? 'linear-gradient(135deg, #1a3a5c, #4fc3f7)' : 'transparent',
                    color: activeTab === 'logs' ? '#0d1b2a' : '#94a3b8'
                  }}
                >
                  📜 Lịch sử thông báo
                </button>
              </div>

              {/* === TAB 1: CẢNH BÁO HOẠT ĐỘNG === */}
              {activeTab === 'alerts' && (
                <div className="space-y-4">
                  {/* TOOLBAR: Tìm kiếm + Lọc + Nút thông báo */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Search */}
                    <div className="relative flex-1 min-w-[140px]">
                      <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                      <input
                        type="text"
                        value={searchTicker}
                        onChange={e => setSearchTicker(e.target.value)}
                        placeholder="Tìm mã CK..."
                        className="input-dark w-full text-xs pl-7 py-1.5"
                      />
                    </div>

                    {/* Status filter */}
                    <div className="relative">
                      <Filter size={10} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                      <select
                        value={statusFilter}
                        onChange={e => setStatusFilter(e.target.value)}
                        className="select-dark text-xs pl-7 pr-2 py-1.5 min-w-[110px]"
                        style={{ paddingRight: '8px' }}
                      >
                        <option value="all">Tất cả</option>
                        <option value="waiting">Đang chờ</option>
                        <option value="triggered">Đã báo</option>
                      </select>
                    </div>

                    {/* Push notification toggle */}
                    <button
                      onClick={requestPermission}
                      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg cursor-pointer border-none transition-all font-medium flex-shrink-0 hover:brightness-110"
                      style={{
                        background: permission === 'granted' ? 'rgba(74,222,128,0.1)' : 'rgba(79,195,247,0.1)',
                        color: permission === 'granted' ? '#4ade80' : '#4fc3f7',
                        border: `1px solid ${permission === 'granted' ? 'rgba(74,222,128,0.3)' : 'rgba(79,195,247,0.2)'}`,
                      }}
                    >
                      {permission === 'granted' ? <Bell size={11} /> : <BellOff size={11} />}
                      {permission === 'granted' ? 'Thông báo bật' : 'Bật thông báo'}
                    </button>
                  </div>

                  {/* BULK ACTIONS TOOLBAR */}
                  {selectedIds.length > 0 && (
                    <div className="flex items-center justify-between p-3 rounded-xl border border-cyan-500/25 bg-[#0d1b2a]/95 backdrop-blur-md transition-all shadow-lg shadow-black/40 animate-slideDown">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={true}
                          onChange={toggleSelectAll}
                          className="w-4 h-4 cursor-pointer accent-cyan-400"
                        />
                        <span className="text-xs text-slate-300">
                          Đã chọn <strong className="text-cyan-400 font-num">{selectedIds.length}</strong> cảnh báo
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleBulkStatus(false)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-bold bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/25 transition-all cursor-pointer"
                        >
                          <RotateCcw size={10} /> Kích hoạt lại
                        </button>
                        <button
                          onClick={() => handleBulkStatus(true)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-bold bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 border border-yellow-500/25 transition-all cursor-pointer"
                        >
                          <Clock size={10} /> Tạm dừng
                        </button>
                        <button
                          onClick={handleBulkDeleteConfirm}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-bold bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/25 transition-all cursor-pointer"
                        >
                          <Trash2 size={10} /> Xóa mục chọn
                        </button>
                      </div>
                    </div>
                  )}

                  {/* BẢNG CẢNH BÁO */}
                  {loading && alerts.length === 0 ? (
                    <div className="glass-card p-6 text-center text-slate-500 text-xs">Đang tải dữ liệu...</div>
                  ) : displayedAlerts.length === 0 && (searchTicker || statusFilter !== 'all') ? (
                    <div className="glass-card p-6 text-center text-slate-500 text-xs">
                      Không tìm thấy cảnh báo phù hợp
                    </div>
                  ) : alerts.length === 0 ? (
                    <EmptyState icon="🔔" title="Chưa có cảnh báo nào" description="Thiết lập các mốc giá quan trọng để nhận thông báo tức thời khi thị trường biến động." />
                  ) : (
                    <div className="glass-card overflow-hidden transition-all duration-300">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="text-slate-500 border-b border-slate-800 bg-slate-900/30">
                              {/* Checkbox Select All */}
                              <th className="py-2.5 px-3 w-8 text-center">
                                <input
                                  type="checkbox"
                                  checked={displayedAlerts.length > 0 && displayedAlerts.every(a => selectedIds.includes(a.id))}
                                  onChange={toggleSelectAll}
                                  className="w-4 h-4 cursor-pointer accent-cyan-400"
                                />
                              </th>
                              {/* Sortable: Mã CK */}
                              <th
                                className="py-2.5 px-3 cursor-pointer select-none hover:text-slate-300 transition-colors"
                                onClick={() => handleSort('ticker')}
                              >
                                <div className="flex items-center gap-1">
                                  Mã CK <SortIcon field="ticker" sortField={sortField} sortDir={sortDir} />
                                </div>
                              </th>
                              <th className="py-2.5 px-3">Điều kiện</th>
                              {/* Sortable: Mục tiêu */}
                              <th
                                className="py-2.5 px-3 text-right cursor-pointer select-none hover:text-slate-300 transition-colors"
                                onClick={() => handleSort('price')}
                              >
                                <div className="flex items-center justify-end gap-1">
                                  Mục tiêu <SortIcon field="price" sortField={sortField} sortDir={sortDir} />
                                </div>
                              </th>
                              <th className="py-2.5 px-3 text-right">Giá HT</th>
                              <th className="py-2.5 px-3">Tiến độ</th>
                              {/* Sortable: Trạng thái */}
                              <th
                                className="py-2.5 px-3 text-center cursor-pointer select-none hover:text-slate-300 transition-colors"
                                onClick={() => handleSort('triggered')}
                              >
                                <div className="flex items-center justify-center gap-1">
                                  Trạng thái <SortIcon field="triggered" sortField={sortField} sortDir={sortDir} />
                                </div>
                              </th>
                              <th className="py-2.5 px-3">Chế độ</th>
                              <th className="py-2.5 px-3">Ghi chú</th>
                              {/* Sortable: Ngày tạo */}
                              <th
                                className="py-2.5 px-3 cursor-pointer select-none hover:text-slate-300 transition-colors"
                                onClick={() => handleSort('created_at')}
                              >
                                <div className="flex items-center gap-1">
                                  Tạo lúc <SortIcon field="created_at" sortField={sortField} sortDir={sortDir} />
                                </div>
                              </th>
                              <th className="py-2.5 px-3">Báo lúc</th>
                              <th className="py-2.5 px-3 text-right">Thao tác</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/40">
                            {displayedAlerts.map(alert => {
                              const dateStr = alert.created_at
                                ? format(new Date(alert.created_at), 'dd/MM HH:mm', { locale: vi })
                                : '—';
                              const triggeredStr = alert.last_triggered_at
                                ? format(new Date(alert.last_triggered_at), 'dd/MM HH:mm', { locale: vi })
                                : '—';

                              const currentQ = currentPrices[alert.ticker];
                              const currentPrice = currentQ?.price;
                              const pct = currentQ?.pct;

                              // Only calculate progress for normal above/below price triggers
                              const progressInfo = (alert.condition === 'above' || alert.condition === 'below')
                                ? calcProgress(alert, currentPrice)
                                : null;

                              return (
                                <tr
                                  key={alert.id}
                                  className="hover:bg-slate-800/30 transition-all duration-150"
                                  style={{ background: alert.triggered ? 'rgba(255,255,255,0.01)' : 'transparent' }}
                                >
                                  {/* Row Checkbox */}
                                  <td className="py-2.5 px-3 text-center">
                                    <input
                                      type="checkbox"
                                      checked={selectedIds.includes(alert.id)}
                                      onChange={() => toggleSelect(alert.id)}
                                      className="w-4 h-4 cursor-pointer accent-cyan-400"
                                    />
                                  </td>
                                  <td className="py-2.5 px-3 font-bold text-slate-200">
                                    <div className="flex items-center gap-2">
                                      <span className="font-num tracking-wide">{alert.ticker}</span>
                                      <Sparkline quote={currentQ} />
                                    </div>
                                  </td>
                                  <td className="py-2.5 px-3 text-slate-300">
                                    <span
                                      className="px-2 py-0.5 rounded text-[10px] font-medium border"
                                      style={{
                                        background: getConditionBadgeStyle(alert.condition).bg,
                                        color: getConditionBadgeStyle(alert.condition).text,
                                        borderColor: getConditionBadgeStyle(alert.condition).border
                                      }}
                                    >
                                      {getConditionName(alert.condition)}
                                    </span>
                                  </td>
                                  <td className="py-2.5 px-3 text-right font-num font-semibold text-slate-300">
                                    {getTargetDisplay(alert)}
                                  </td>

                                  {/* Giá hiện tại */}
                                  <td className="py-2.5 px-3 text-right font-num whitespace-nowrap">
                                    {currentPrice ? (
                                      <div className="flex flex-col items-end">
                                        <span className="font-semibold text-slate-200">
                                          {currentPrice.toLocaleString('vi-VN')}đ
                                        </span>
                                        {pct !== undefined && (
                                          <span
                                            className="text-[10px] font-medium flex items-center gap-0.5"
                                            style={{ color: pct >= 0 ? '#4ade80' : '#f87171' }}
                                          >
                                            {pct >= 0 ? <TrendingUp size={8} /> : <TrendingDown size={8} />}
                                            {pct >= 0 ? '+' : ''}{pct}%
                                          </span>
                                        )}
                                      </div>
                                    ) : (
                                      <span className="text-slate-700 text-[10px]">
                                        {pricesLoading ? '...' : '—'}
                                      </span>
                                    )}
                                  </td>

                                  {/* Thanh tiến trình */}
                                  <td className="py-2.5 px-3" style={{ minWidth: '110px' }}>
                                    {alert.triggered ? (
                                      <span className="text-[10px] text-slate-600 italic">Đã báo</span>
                                    ) : progressInfo ? (
                                      <ProgressBar
                                        progress={progressInfo.progress}
                                        color={progressInfo.color}
                                        label={progressInfo.label}
                                      />
                                    ) : (
                                      <span className="text-[10px] text-slate-700">—</span>
                                    )}
                                  </td>

                                  {/* Trạng thái */}
                                  <td className="py-2.5 px-3 text-center">
                                    {alert.triggered ? (
                                      alert.mode === 'continuous' ? (
                                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] border border-amber-500/20" style={{ background: 'rgba(234,179,8,0.1)', color: '#eab308' }}>
                                          <Clock size={10} /> Đã báo (Liên tục)
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] border border-green-500/20" style={{ background: 'rgba(74,222,128,0.1)', color: '#4ade80' }}>
                                          <CheckCircle size={10} /> Đã báo
                                        </span>
                                      )
                                    ) : (
                                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] border border-cyan-500/20" style={{ background: 'rgba(79,195,247,0.1)', color: '#4fc3f7' }}>
                                        <Clock size={10} /> Chờ
                                      </span>
                                    )}
                                  </td>

                                  <td className="py-2.5 px-3 text-slate-300 whitespace-nowrap">
                                    {alert.mode === 'once' && '1 lần'}
                                    {alert.mode === 'daily' && 'Mỗi ngày'}
                                    {alert.mode === 'continuous' && `Liên tục (${alert.cooldown || 15}p)`}
                                    {!alert.mode && '1 lần'}
                                  </td>
                                  <td className="py-2.5 px-3 text-slate-500 max-w-[100px] truncate" title={alert.note}>
                                    {alert.note || '—'}
                                  </td>
                                  <td className="py-2.5 px-3 text-slate-500 font-num whitespace-nowrap">{dateStr}</td>
                                  <td className="py-2.5 px-3 font-num whitespace-nowrap" style={{ color: alert.last_triggered_at ? '#4ade80' : '#475569' }}>
                                    {triggeredStr}
                                  </td>

                                  {/* Thao tác */}
                                  <td className="py-2.5 px-3 text-right">
                                    <div className="flex items-center justify-end gap-1">
                                      {/* Nút sửa */}
                                      <button
                                        onClick={() => setEditTarget(alert)}
                                        title="Chỉnh sửa cảnh báo"
                                        className="p-1 hover:bg-cyan-500/15 rounded text-slate-500 hover:text-cyan-400 transition-all cursor-pointer border-none bg-transparent"
                                      >
                                        <Edit3 size={12} />
                                      </button>
                                      {/* Nút kích hoạt lại */}
                                      {alert.triggered && (
                                        <button
                                          onClick={() => handleReactivateAlert(alert.id)}
                                          title="Kích hoạt lại cảnh báo"
                                          className="p-1 hover:bg-green-500/15 rounded text-slate-500 hover:text-green-400 transition-all cursor-pointer border-none bg-transparent"
                                        >
                                          <RotateCcw size={12} />
                                        </button>
                                      )}
                                      {/* Nút xóa */}
                                      <button
                                        onClick={() => handleAskDelete(alert)}
                                        className="p-1 hover:bg-red-500/15 rounded text-slate-500 hover:text-red-400 transition-all cursor-pointer border-none bg-transparent"
                                        title="Xóa cảnh báo"
                                      >
                                        <Trash2 size={12} />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {/* Footer table info */}
                      {(searchTicker || statusFilter !== 'all') && (
                        <div className="px-3 py-2 text-[10px] text-slate-600 border-t border-slate-800/40">
                          Hiển thị {displayedAlerts.length} / {totalAlerts} cảnh báo
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* === TAB 2: LỊCH SỬ THÔNG BÁO === */}
              {activeTab === 'logs' && (
                <div className="space-y-4">
                  {/* Logs Header toolbar */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400 font-medium">
                      📜 Nhật ký 100 thông báo gần nhất được gửi từ hệ thống
                    </span>
                    <button
                      onClick={handleClearAllLogs}
                      disabled={alertLogs.length === 0 || logsLoading}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/25 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Trash size={12} />
                      Xóa lịch sử
                    </button>
                  </div>

                  {/* Logs Table */}
                  {logsLoading && alertLogs.length === 0 ? (
                    <div className="glass-card p-6 text-center text-slate-500 text-xs">Đang tải lịch sử...</div>
                  ) : alertLogs.length === 0 ? (
                    <EmptyState icon="📜" title="Lịch sử trống" description="Chưa ghi nhận thông báo nào được gửi đi gần đây." />
                  ) : (
                    <div className="glass-card overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="text-slate-500 border-b border-slate-800 bg-slate-900/30">
                              <th className="py-2.5 px-3">Mã CK</th>
                              <th className="py-2.5 px-3">Điều kiện</th>
                              <th className="py-2.5 px-3 text-right">Mức kích hoạt</th>
                              <th className="py-2.5 px-3 text-right">Giá thực tế lúc báo</th>
                              <th className="py-2.5 px-3">Gửi lúc</th>
                              <th className="py-2.5 px-3">Ghi chú</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/40">
                            {alertLogs.map(log => {
                              const timeStr = log.triggered_at
                                ? format(new Date(log.triggered_at), 'dd/MM/yyyy HH:mm:ss', { locale: vi })
                                : '—';

                              return (
                                <tr key={log.id} className="hover:bg-slate-800/15 transition-all">
                                  <td className="py-2.5 px-3 font-bold text-slate-200">
                                    <div className="flex items-center gap-2">
                                      <span className="font-num tracking-wide">{log.ticker}</span>
                                      <Sparkline quote={currentPrices[log.ticker]} />
                                    </div>
                                  </td>
                                  <td className="py-2.5 px-3 text-slate-300">
                                    <span
                                      className="px-2 py-0.5 rounded text-[10px] font-medium border"
                                      style={{
                                        background: getConditionBadgeStyle(log.condition).bg,
                                        color: getConditionBadgeStyle(log.condition).text,
                                        borderColor: getConditionBadgeStyle(log.condition).border
                                      }}
                                    >
                                      {getConditionName(log.condition)}
                                    </span>
                                  </td>
                                  <td className="py-2.5 px-3 text-right font-num font-semibold text-slate-300">
                                    {getTargetDisplay(log)}
                                  </td>
                                  <td className="py-2.5 px-3 text-right font-num font-semibold text-cyan-400">
                                    {log.trigger_price ? `${log.trigger_price.toLocaleString('vi-VN')} đ` : '—'}
                                  </td>
                                  <td className="py-2.5 px-3 text-slate-500 font-num">{timeStr}</td>
                                  <td className="py-2.5 px-3 text-slate-500 max-w-[140px] truncate" title={log.note}>
                                    {log.note || '—'}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Telegram Info Box */}
              <div
                className="flex items-start gap-3 p-4 rounded-xl text-xs"
                style={{ background: 'rgba(79,195,247,0.03)', border: '1px solid rgba(79,195,247,0.06)' }}
              >
                <AlertCircle size={14} className="text-cyan-400 mt-0.5 flex-shrink-0" />
                <div className="text-slate-400 leading-relaxed space-y-1">
                  <p className="font-semibold text-slate-200">🔔 Nhận thông báo qua Telegram:</p>
                  <p>1. Truy cập <a href="https://t.me/userinfobot" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">t.me/userinfobot</a> để lấy Chat ID cá nhân.</p>
                  <p>2. Để thông báo cho <strong className="text-slate-300">nhóm Telegram</strong>: Thêm Bot vào nhóm → Lấy ID nhóm (bắt đầu bằng &ldquo;-&rdquo;).</p>
                  <p>3. Điền <span className="text-cyan-400 font-medium">nhiều ID cách nhau bằng dấu phẩy</span> — hệ thống gửi cho từng người. Nhấn <strong className="text-slate-300">nút &ldquo;Thử&rdquo;</strong> để test ngay.</p>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>

      {/* Embedded keyframe animation styles for fade and slide */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-2px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out forwards;
        }
        .animate-slideDown {
          animation: slideDown 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}} />
    </>
  );
};

export default AlertsPage;
