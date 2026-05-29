// ===== TRANG QUẢN LÝ CẢNH BÁO GIÁ =====

import { useState, useEffect, useCallback, useRef } from 'react';
import { Bell, Trash2, Plus, AlertCircle, CheckCircle, Clock, BellOff, RotateCcw, X, Users } from 'lucide-react';
import Header from '../components/Layout/Header';
import { Button, EmptyState } from '../components/UI';
import { stockApi } from '../services/stockApi';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

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
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(239,68,68,0.15)' }}
            >
              <Trash2 size={15} style={{ color: '#ef4444' }} />
            </div>
            <span className="text-sm font-semibold text-slate-200">Xác nhận xóa</span>
          </div>
          <button
            onClick={onCancel}
            className="p-1 rounded-lg cursor-pointer border-none bg-transparent text-slate-500 hover:text-slate-300 transition-all"
          >
            <X size={14} />
          </button>
        </div>

        <div
          className="p-3 rounded-xl text-xs space-y-1"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <p className="text-slate-400">Bạn sắp xóa cảnh báo:</p>
          <p className="text-slate-200 font-bold text-sm">{alert.ticker}</p>
          <p className="text-slate-400">{getConditionName(alert.condition)} — {getTargetDisplay(alert)}</p>
        </div>

        <p className="text-xs text-slate-500 leading-relaxed">
          Hành động này <span className="text-red-400 font-semibold">không thể hoàn tác</span>. Cảnh báo sẽ bị xóa vĩnh viễn khỏi hệ thống.
        </p>

        <div className="flex gap-2 pt-1">
          <button
            onClick={onCancel}
            className="flex-1 py-2 text-xs font-medium rounded-xl cursor-pointer border-none transition-all"
            style={{ background: 'rgba(255,255,255,0.05)', color: '#94a3b8' }}
          >
            Hủy bỏ
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2 text-xs font-semibold rounded-xl cursor-pointer border-none transition-all"
            style={{ background: 'linear-gradient(135deg, #7f1d1d, #ef4444)', color: '#fff' }}
          >
            Xóa cảnh báo
          </button>
        </div>
      </div>
    </div>
  );
};

// ===== HELPER FUNCTIONS (dùng trong cả modal và table) =====
function getConditionName(cond) {
  switch (cond) {
    case 'above': return '📈 Vượt trên';
    case 'below': return '📉 Giảm dưới';
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

function getTargetDisplay(al) {
  if (al.condition.includes('ma') || al.condition.startsWith('macd_')) return '—';
  if (al.condition.startsWith('pct_change_')) return `+${al.price}%`;
  if (al.condition.startsWith('rsi_')) return `${al.price} (RSI)`;
  return `${al.price.toLocaleString('vi-VN')} đ`;
}


// ===== MAIN COMPONENT =====
const AlertsPage = () => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null); // Alert cần xóa
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

  // Đếm thống kê
  const totalAlerts = alerts.length;
  const waitingAlerts = alerts.filter(a => !a.triggered).length;
  const triggeredAlerts = alerts.filter(a => a.triggered).length;

  // Fetch alerts list + check for newly triggered
  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    try {
      const data = await stockApi.getAlerts();
      setAlerts(data || []);
      (data || []).forEach(alert => {
        if (alert.triggered && !triggeredAlertsRef.current.has(alert.id)) {
          triggeredAlertsRef.current.add(alert.id);

          let condText = `đã chạm điều kiện`;
          if (alert.condition === 'above') condText = `vượt lên mức ${alert.price.toLocaleString('vi-VN')}đ`;
          else if (alert.condition === 'below') condText = `giảm xuống mức ${alert.price.toLocaleString('vi-VN')}đ`;
          else if (alert.condition === 'pct_change_above') condText = `tăng quá +${alert.price}% trong ngày`;
          else if (alert.condition === 'pct_change_below') condText = `giảm quá -${alert.price}% trong ngày`;
          else if (alert.condition === 'pct_change_abs') condText = `biến động quá +/-${alert.price}% trong ngày`;
          else if (alert.condition === 'rsi_above') condText = `có RSI vượt trên ${alert.price}`;
          else if (alert.condition === 'rsi_below') condText = `có RSI giảm dưới ${alert.price}`;
          else if (alert.condition === 'price_above_ma20') condText = `cắt lên đường MA20`;
          else if (alert.condition === 'price_below_ma20') condText = `cắt xuống đường MA20`;
          else if (alert.condition === 'price_above_ma50') condText = `cắt lên đường MA50`;
          else if (alert.condition === 'price_below_ma50') condText = `cắt xuống đường MA50`;
          else if (alert.condition === 'price_above_ma200') condText = `cắt lên đường MA200`;
          else if (alert.condition === 'price_below_ma200') condText = `cắt xuống đường MA200`;
          else if (alert.condition === 'macd_cross_up') condText = `có MACD cắt lên đường Tín hiệu`;
          else if (alert.condition === 'macd_cross_down') condText = `có MACD cắt xuống đường Tín hiệu`;

          sendNotification(
            `⚡ Cảnh báo khớp! ${alert.ticker}`,
            `Cổ phiếu ${alert.ticker} ${condText}`,
            `alert-${alert.id}`
          );
        }
      });
    } catch (err) {
      console.error('Failed to fetch alerts:', err);
      toast.error('Không thể tải danh sách cảnh báo');
    } finally {
      setLoading(false);
    }
  }, [sendNotification]);

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 60000);
    return () => clearInterval(interval);
  }, [fetchAlerts]);

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

  // Mở modal xóa
  const handleAskDelete = (alert) => setDeleteTarget(alert);

  // Xác nhận xóa
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

  // Reactivate alert
  const handleReactivateAlert = async (id) => {
    try {
      await stockApi.reactivateAlert(id);
      toast.success('Đã kích hoạt lại cảnh báo thành công!');
      fetchAlerts();
    } catch (err) {
      toast.error('Không thể kích hoạt lại cảnh báo');
    }
  };

  return (
    <>
      {/* Modal xóa */}
      <DeleteConfirmModal
        alert={deleteTarget}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      <div className="flex flex-col h-full overflow-hidden">
        <Header title="Cảnh báo giá" />

        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">

            {/* Cột trái: Form tạo cảnh báo */}
            <div className="xl:col-span-1 glass-card p-5 space-y-4">
              <div className="flex items-center gap-2 pb-3" style={{ borderBottom: '1px solid rgba(79,195,247,0.08)' }}>
                <Bell size={16} className="text-cyan-400" />
                <h3 className="text-sm font-semibold text-slate-200">Tạo cảnh báo mới</h3>
              </div>

              <form onSubmit={handleCreateAlert} className="space-y-4">
                {/* Ticker */}
                <div>
                  <label className="text-xs text-slate-500 block mb-1.5 font-medium">Mã cổ phiếu</label>
                  <input
                    type="text"
                    value={ticker}
                    onChange={(e) => setTicker(e.target.value.toUpperCase())}
                    placeholder="Ví dụ: FPT"
                    className="input-dark w-full text-sm"
                    maxLength={10}
                    required
                  />
                </div>

                {/* Condition */}
                <div>
                  <label className="text-xs text-slate-500 block mb-1.5 font-medium">Điều kiện kích hoạt</label>
                  <select
                    value={condition}
                    onChange={(e) => setCondition(e.target.value)}
                    className="select-dark w-full text-sm"
                  >
                    <optgroup label="Cảnh báo giá">
                      <option value="above">Vượt lên trên (&gt;=)</option>
                      <option value="below">Giảm xuống dưới (&lt;=)</option>
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
                  <select
                    value={mode}
                    onChange={(e) => setMode(e.target.value)}
                    className="select-dark w-full text-sm"
                  >
                    <option value="once">Báo 1 lần duy nhất</option>
                    <option value="daily">Báo 1 lần mỗi ngày</option>
                    <option value="continuous">Báo liên tục</option>
                  </select>
                </div>

                {/* Cooldown */}
                {mode === 'continuous' && (
                  <div>
                    <label className="text-xs text-slate-500 block mb-1.5 font-medium">Thời gian giãn cách</label>
                    <select
                      value={cooldown}
                      onChange={(e) => setCooldown(e.target.value)}
                      className="select-dark w-full text-sm"
                    >
                      <option value={5}>5 phút (Lướt sóng cực nhanh)</option>
                      <option value={10}>10 phút (Trung bình nhanh)</option>
                      <option value={15}>15 phút (Mặc định tối ưu)</option>
                      <option value={30}>30 phút (Dành cho người bận rộn)</option>
                    </select>
                  </div>
                )}

                {/* Price */}
                {!isNoPriceCondition && (
                  <div>
                    <label className="text-xs text-slate-500 block mb-1.5 font-medium">
                      {isPercentageCondition && 'Tỷ lệ biến động mục tiêu (%)'}
                      {isRsiCondition && 'Chỉ số RSI mục tiêu (0-100)'}
                      {!isPercentageCondition && !isRsiCondition && 'Giá mục tiêu (VNĐ)'}
                    </label>
                    <input
                      type="number"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      placeholder={
                        isPercentageCondition ? 'Ví dụ: 5'
                          : isRsiCondition ? 'Ví dụ: 30'
                          : 'Ví dụ: 75000'
                      }
                      className="input-dark w-full text-sm font-num"
                      required
                      min="0"
                      step="any"
                    />
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      {isPercentageCondition && 'Nhập số phần trăm dương (ví dụ: 5 tương đương 5%)'}
                      {isRsiCondition && 'Nhập mốc RSI (thông thường quá bán < 30, quá mua > 70)'}
                      {!isPercentageCondition && !isRsiCondition && 'Nhập giá trị tuyệt đối (Ví dụ: 75000 thay vì 75.0)'}
                    </span>
                  </div>
                )}

                {/* Telegram ID */}
                <div>
                  <label className="text-xs text-slate-500 block mb-1.5 font-medium">
                    Telegram Chat ID
                    <span className="ml-1 text-slate-600">(Không bắt buộc)</span>
                  </label>
                  <input
                    type="text"
                    value={telegramId}
                    onChange={(e) => setTelegramId(e.target.value)}
                    placeholder="VD: 123456, -10098765 (nhiều ID cách nhau bằng dấu phẩy)"
                    className="input-dark w-full text-sm font-num"
                  />
                  <div className="mt-1.5 space-y-0.5">
                    <span className="text-[10px] text-slate-500 block leading-relaxed">
                      Có thể nhập <span className="text-cyan-400 font-medium">nhiều ID cách nhau bằng dấu phẩy</span> để gửi cho nhiều người cùng lúc.
                    </span>
                    <span className="text-[10px] text-slate-600 block leading-relaxed">
                      ID Nhóm Telegram luôn bắt đầu bằng dấu &ldquo;-&rdquo; (VD: -10012345678).
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
                  <label className="text-xs text-slate-500 block mb-1.5 font-medium">Ghi chú cá nhân (Không bắt buộc)</label>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Ví dụ: Bán chốt lời khi đạt target"
                    className="input-dark w-full text-sm resize-none"
                    rows={2}
                  />
                </div>

                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg cursor-pointer border-none transition-all mt-6"
                  style={{
                    background: 'linear-gradient(135deg, #1a3a5c, #4fc3f7)',
                    color: '#0d1b2a',
                  }}
                >
                  <Plus size={14} />
                  Tạo Cảnh báo
                </button>
              </form>
            </div>

            {/* Cột phải: Danh sách cảnh báo */}
            <div className="xl:col-span-2 space-y-4">

              {/* ===== THỐNG KÊ ĐẦU TRANG ===== */}
              <div className="grid grid-cols-3 gap-3">
                <div
                  className="rounded-xl p-3 flex flex-col gap-1"
                  style={{ background: 'rgba(79,195,247,0.06)', border: '1px solid rgba(79,195,247,0.12)' }}
                >
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider">Tổng cảnh báo</span>
                  <span className="text-2xl font-bold text-slate-200 font-num">{totalAlerts}</span>
                </div>
                <div
                  className="rounded-xl p-3 flex flex-col gap-1"
                  style={{ background: 'rgba(79,195,247,0.06)', border: '1px solid rgba(79,195,247,0.12)' }}
                >
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider">Đang chờ</span>
                  <span className="text-2xl font-bold font-num" style={{ color: '#4fc3f7' }}>{waitingAlerts}</span>
                </div>
                <div
                  className="rounded-xl p-3 flex flex-col gap-1"
                  style={{ background: 'rgba(74,222,128,0.05)', border: '1px solid rgba(74,222,128,0.12)' }}
                >
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider">Đã kích hoạt</span>
                  <span className="text-2xl font-bold font-num" style={{ color: '#4ade80' }}>{triggeredAlerts}</span>
                </div>
              </div>

              {/* Header hàng */}
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Danh sách cảnh báo
                </h3>
                {/* Push Notification Toggle */}
                <button
                  onClick={requestPermission}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg cursor-pointer border-none transition-all font-medium"
                  style={{
                    background: permission === 'granted' ? 'rgba(74,222,128,0.1)' : 'rgba(79,195,247,0.1)',
                    color: permission === 'granted' ? '#4ade80' : '#4fc3f7',
                    border: `1px solid ${permission === 'granted' ? 'rgba(74,222,128,0.3)' : 'rgba(79,195,247,0.2)'}`,
                  }}
                >
                  {permission === 'granted' ? <Bell size={11} /> : <BellOff size={11} />}
                  {permission === 'granted' ? 'Thông báo đã bật' : 'Bật thông báo'}
                </button>
              </div>

              {loading && alerts.length === 0 ? (
                <div className="glass-card p-6 text-center text-slate-500 text-xs">
                  Đang tải dữ liệu...
                </div>
              ) : alerts.length === 0 ? (
                <EmptyState
                  icon="🔔"
                  title="Chưa có cảnh báo nào"
                  description="Thiết lập các mốc giá quan trọng để nhận thông báo tức thời khi thị trường biến động."
                />
              ) : (
                <div className="glass-card overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="text-slate-500 border-b border-slate-800 bg-slate-900/30">
                          <th className="py-2.5 px-3">Mã CK</th>
                          <th className="py-2.5 px-3">Điều kiện</th>
                          <th className="py-2.5 px-3 text-right">Mục tiêu</th>
                          <th className="py-2.5 px-3 text-center">Trạng thái</th>
                          <th className="py-2.5 px-3">Chế độ</th>
                          <th className="py-2.5 px-3">Ghi chú</th>
                          <th className="py-2.5 px-3">Tạo lúc</th>
                          <th className="py-2.5 px-3">Báo lúc</th>
                          <th className="py-2.5 px-3 text-right">Thao tác</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/40">
                        {alerts.map((alert) => {
                          const dateStr = alert.created_at
                            ? format(new Date(alert.created_at), 'dd/MM HH:mm', { locale: vi })
                            : '—';
                          const triggeredStr = alert.last_triggered_at
                            ? format(new Date(alert.last_triggered_at), 'dd/MM HH:mm', { locale: vi })
                            : '—';
                          return (
                            <tr
                              key={alert.id}
                              className="hover:bg-slate-800/20 transition-all"
                              style={{ background: alert.triggered ? 'rgba(255,255,255,0.01)' : 'transparent' }}
                            >
                              <td className="py-2.5 px-3 font-bold text-slate-200">{alert.ticker}</td>
                              <td className="py-2.5 px-3 text-slate-300">
                                {getConditionName(alert.condition)}
                              </td>
                              <td className="py-2.5 px-3 text-right font-num font-semibold text-slate-300">
                                {getTargetDisplay(alert)}
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                {alert.triggered ? (
                                  alert.mode === 'continuous' ? (
                                    <span
                                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px]"
                                      style={{ background: 'rgba(234,179,8,0.1)', color: '#eab308' }}
                                    >
                                      <Clock size={10} /> Đã báo (Liên tục)
                                    </span>
                                  ) : (
                                    <span
                                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px]"
                                      style={{ background: 'rgba(74,222,128,0.1)', color: '#4ade80' }}
                                    >
                                      <CheckCircle size={10} /> Đã báo
                                    </span>
                                  )
                                ) : (
                                  <span
                                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px]"
                                    style={{ background: 'rgba(79,195,247,0.1)', color: '#4fc3f7' }}
                                  >
                                    <Clock size={10} /> Chờ
                                  </span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-slate-300">
                                {alert.mode === 'once' && '1 lần'}
                                {alert.mode === 'daily' && 'Mỗi ngày'}
                                {alert.mode === 'continuous' && `Liên tục (${alert.cooldown || 15}p)`}
                                {!alert.mode && '1 lần'}
                              </td>
                              <td className="py-2.5 px-3 text-slate-500 max-w-[120px] truncate" title={alert.note}>
                                {alert.note || '—'}
                              </td>
                              <td className="py-2.5 px-3 text-slate-500 font-num whitespace-nowrap">{dateStr}</td>
                              <td className="py-2.5 px-3 font-num whitespace-nowrap" style={{ color: alert.last_triggered_at ? '#4ade80' : '#475569' }}>
                                {triggeredStr}
                              </td>
                              <td className="py-2.5 px-3 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  {alert.triggered && (
                                    <button
                                      onClick={() => handleReactivateAlert(alert.id)}
                                      title="Kích hoạt lại cảnh báo"
                                      className="p-1 hover:bg-green-500/10 rounded text-slate-500 hover:text-green-400 transition-all cursor-pointer border-none bg-transparent"
                                    >
                                      <RotateCcw size={13} />
                                    </button>
                                  )}
                                  <button
                                    onClick={() => handleAskDelete(alert)}
                                    className="p-1 hover:bg-red-500/10 rounded text-slate-500 hover:text-red-400 transition-all cursor-pointer border-none bg-transparent"
                                    title="Xóa cảnh báo"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Telegram Info Box */}
              <div
                className="flex items-start gap-3 p-4 rounded-xl text-xs"
                style={{ background: 'rgba(79,195,247,0.04)', border: '1px solid rgba(79,195,247,0.08)' }}
              >
                <AlertCircle size={14} className="text-cyan-400 mt-0.5 flex-shrink-0" />
                <div className="text-slate-400 leading-relaxed space-y-1">
                  <p className="font-semibold text-slate-200">🔔 Nhận thông báo qua Telegram:</p>
                  <p>1. Truy cập <a href="https://t.me/userinfobot" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">t.me/userinfobot</a> để lấy Chat ID cá nhân của bạn.</p>
                  <p>2. Để thông báo cho cả <strong className="text-slate-300">nhóm Telegram</strong>: Thêm Bot vào nhóm → Lấy ID nhóm (bắt đầu bằng &ldquo;-&rdquo;).</p>
                  <p>3. Có thể điền <span className="text-cyan-400 font-medium">nhiều ID cách nhau bằng dấu phẩy</span> — hệ thống sẽ gửi thông báo cho từng người.</p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </>
  );
};

export default AlertsPage;
