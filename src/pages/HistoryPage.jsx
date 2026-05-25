// ===== TRANG LỊCH SỬ PHÂN TÍCH =====

import { useState } from 'react';
import { Download, Trash2, Search, Filter } from 'lucide-react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import Header from '../components/Layout/Header';
import { exportHistoryCSV } from '../utils/exportCsv';
import { HistoryList } from '../components/History';
import { Button, EmptyState, Input } from '../components/UI';
import useAppStore from '../store/appStore';
import { EXCHANGES } from '../constants/sources';
import toast from 'react-hot-toast';

const SIGNAL_OPTIONS = [
  { value: '', label: 'Tất cả tín hiệu' },
  { value: 'BUY', label: '📈 BUY' },
  { value: 'HOLD', label: '⏸️ HOLD' },
  { value: 'SELL', label: '📉 SELL' },
];

const HistoryPage = () => {
  const history = useAppStore((s) => s.history);
  const removeFromHistory = useAppStore((s) => s.removeFromHistory);
  const clearHistory = useAppStore((s) => s.clearHistory);

  const [filters, setFilters] = useState({
    ticker: '',
    exchange: 'ALL',
    signal: '',
  });

  // Export CSV
  const handleExportCSV = () => {
    if (!history.length) {
      toast.error('Không có dữ liệu để xuất');
      return;
    }
    exportHistoryCSV(history);
    toast.success('Đã xuất CSV thành công!');
  };

  const handleClearAll = () => {
    if (window.confirm('Bạn có chắc muốn xóa toàn bộ lịch sử phân tích?')) {
      clearHistory();
      toast.success('Đã xóa lịch sử');
    }
  };

  const exchangeOptions = [
    { value: 'ALL', label: 'Tất cả sàn' },
    ...EXCHANGES.map((e) => ({ value: e.value, label: e.label })),
  ];

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title="Lịch sử phân tích" />

      <div className="flex-1 overflow-y-auto p-6">
        {/* Toolbar */}
        <div className="flex items-center gap-3 mb-6 flex-wrap">
          {/* Search */}
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={filters.ticker}
              onChange={(e) => setFilters({ ...filters, ticker: e.target.value.toUpperCase() })}
              placeholder="Tìm mã CK..."
              className="input-dark pl-8"
              style={{ width: 150 }}
            />
          </div>

          {/* Exchange filter */}
          <select
            value={filters.exchange}
            onChange={(e) => setFilters({ ...filters, exchange: e.target.value })}
            className="select-dark"
            style={{ width: 130 }}
          >
            {exchangeOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          {/* Signal filter */}
          <select
            value={filters.signal}
            onChange={(e) => setFilters({ ...filters, signal: e.target.value })}
            className="select-dark"
            style={{ width: 150 }}
          >
            {SIGNAL_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          <div className="flex-1" />

          {/* Stats */}
          <span className="text-xs text-slate-500">
            {history.length} phân tích đã lưu
          </span>

          {/* Actions */}
          <Button variant="secondary" size="sm" onClick={handleExportCSV} icon={Download}>
            Export CSV
          </Button>
          {history.length > 0 && (
            <Button variant="danger" size="sm" onClick={handleClearAll} icon={Trash2}>
              Xóa tất cả
            </Button>
          )}
        </div>

        {/* List */}
        {history.length === 0 ? (
          <EmptyState
            icon="📭"
            title="Chưa có lịch sử"
            description="Thực hiện phân tích cổ phiếu và lưu kết quả để xem lịch sử tại đây."
          />
        ) : (
          <HistoryList
            items={history}
            onDelete={removeFromHistory}
            filters={filters}
          />
        )}
      </div>
    </div>
  );
};

export default HistoryPage;
