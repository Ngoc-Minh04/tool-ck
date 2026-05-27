// ===== TRANG QUẢN LÝ CẢNH BÁO GIÁ =====

import { useState, useEffect, useCallback, useRef } from 'react';
import { Bell, Trash2, Plus, AlertCircle, CheckCircle, Clock, BellOff } from 'lucide-react';
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
      // Test notification
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

  const sendNotification = (title, body, tag = '') => {
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
  };

  return { permission, requestPermission, sendNotification };
};


const AlertsPage = () => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(false);
  const { permission, requestPermission, sendNotification } = usePushNotification();
  const triggeredAlertsRef = useRef(new Set());
  
  // Form state
  const [ticker, setTicker] = useState('');
  const [condition, setCondition] = useState('above');
  const [price, setPrice] = useState('');
  const [telegramId, setTelegramId] = useState('');
  const [note, setNote] = useState('');

  // Fetch alerts list + check for newly triggered
  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    try {
      const data = await stockApi.getAlerts();
      setAlerts(data || []);
      // Push notification cho cảnh báo mới kích hoạt
      (data || []).forEach(alert => {
        if (alert.triggered && !triggeredAlertsRef.current.has(alert.id)) {
          triggeredAlertsRef.current.add(alert.id);
          sendNotification(
            `⚡ Cảnh báo khớp! ${alert.ticker}`,
            `Giá ${alert.ticker} đã ${alert.condition === 'above' ? 'vượt lên' : 'giảm xuống'} mức ${(alert.price).toLocaleString('vi-VN')}đ`,
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
    // Tự động kiểm tra mỗi 60 giây để bắt push notification kịp thời
    const interval = setInterval(fetchAlerts, 60000);
    return () => clearInterval(interval);
  }, [fetchAlerts]);

  // Create alert
  const handleCreateAlert = async (e) => {
    e.preventDefault();
    if (!ticker.trim()) {
      toast.error('Vui lòng nhập mã cổ phiếu');
      return;
    }
    if (!price || isNaN(price) || parseFloat(price) <= 0) {
      toast.error('Vui lòng nhập mức giá hợp lệ');
      return;
    }

    try {
      const body = {
        ticker: ticker.trim().toUpperCase(),
        condition,
        price: parseFloat(price),
        telegram_chat_id: telegramId.trim() || null,
        note: note.trim() || null
      };

      await stockApi.createAlert(body);
      toast.success(`Đã tạo cảnh báo cho mã ${body.ticker}!`);
      
      // Reset form
      setTicker('');
      setPrice('');
      setNote('');
      
      // Refresh list
      fetchAlerts();
    } catch (err) {
      console.error('Failed to create alert:', err);
      toast.error('Không thể tạo cảnh báo');
    }
  };

  // Delete alert
  const handleDeleteAlert = async (id) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa cảnh báo này?')) return;
    try {
      await stockApi.deleteAlert(id);
      toast.success('Đã xóa cảnh báo');
      fetchAlerts();
    } catch (err) {
      console.error('Failed to delete alert:', err);
      toast.error('Không thể xóa cảnh báo');
    }
  };

  return (
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
                  <option value="above">Vượt lên trên (&gt;=)</option>
                  <option value="below">Giảm xuống dưới (&lt;=)</option>
                </select>
              </div>

              {/* Price */}
              <div>
                <label className="text-xs text-slate-500 block mb-1.5 font-medium">Giá mục tiêu (VNĐ)</label>
                <input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="Ví dụ: 75000"
                  className="input-dark w-full text-sm font-num"
                  required
                  min="1"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Nhập giá trị tuyệt đối (Ví dụ: 75000 thay vị 75.0)
                </span>
              </div>

              {/* Telegram ID */}
              <div>
                <label className="text-xs text-slate-500 block mb-1.5 font-medium">Telegram Chat ID (Không bắt buộc)</label>
                <input
                  type="text"
                  value={telegramId}
                  onChange={(e) => setTelegramId(e.target.value)}
                  placeholder="Ví dụ: 12345678"
                  className="input-dark w-full text-sm font-num"
                />
                <span className="text-[10px] text-slate-600 mt-1 block leading-relaxed">
                  Hệ thống sẽ gửi thông báo trực tiếp qua bot Telegram khi giá chạm ngưỡng.
                </span>
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
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Danh sách cảnh báo ({alerts.length})
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
                        <th className="py-2.5 px-3 text-right">Giá mục tiêu</th>
                        <th className="py-2.5 px-3 text-center">Trạng thái</th>
                        <th className="py-2.5 px-3">Ghi chú</th>
                        <th className="py-2.5 px-3">Ngày tạo</th>
                        <th className="py-2.5 px-3 text-right">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/40">
                      {alerts.map((alert) => {
                        const dateStr = alert.created_at
                          ? format(new Date(alert.created_at), 'dd/MM/yyyy HH:mm', { locale: vi })
                          : '—';
                        return (
                          <tr
                            key={alert.id}
                            className="hover:bg-slate-800/20 transition-all"
                            style={{ background: alert.triggered ? 'rgba(255,255,255,0.01)' : 'transparent' }}
                          >
                            <td className="py-2.5 px-3 font-bold text-slate-200">{alert.ticker}</td>
                            <td className="py-2.5 px-3">
                              {alert.condition === 'above' ? (
                                <span className="text-red-400">📈 Vượt trên</span>
                              ) : (
                                <span className="text-green-400">📉 Giảm dưới</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-right font-num font-semibold text-slate-300">
                              {alert.price.toLocaleString('vi-VN')} đ
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              {alert.triggered ? (
                                <span
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px]"
                                  style={{ background: 'rgba(74,222,128,0.1)', color: '#4ade80' }}
                                >
                                  <CheckCircle size={10} /> Đã báo
                                </span>
                              ) : (
                                <span
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px]"
                                  style={{ background: 'rgba(79,195,247,0.1)', color: '#4fc3f7' }}
                                >
                                  <Clock size={10} /> Chờ
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-slate-500 max-w-[150px] truncate" title={alert.note}>
                              {alert.note || '—'}
                            </td>
                            <td className="py-2.5 px-3 text-slate-500 font-num">{dateStr}</td>
                            <td className="py-2.5 px-3 text-right">
                              <button
                                onClick={() => handleDeleteAlert(alert.id)}
                                className="p-1 hover:bg-red-500/10 rounded text-slate-500 hover:text-red-400 transition-all cursor-pointer border-none bg-transparent"
                              >
                                <Trash2 size={13} />
                              </button>
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
                <p>1. Chat với bot của bạn (hoặc bot hệ thống) và gõ lệnh <code className="text-cyan-400">/my_id</code> để lấy Chat ID.</p>
                <p>2. Điền Chat ID đó vào form khi tạo cảnh báo.</p>
                <p>3. Khi giá cổ phiếu thoả mãn điều kiện, hệ thống sẽ gửi tin nhắn trực tiếp đến bạn.</p>
              </div>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
};

export default AlertsPage;
