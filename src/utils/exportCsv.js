import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

/**
 * Xuất lịch sử phân tích ra file CSV có hỗ trợ font Tiếng Việt cho Excel
 * @param {Array} history - Danh sách lịch sử phân tích
 */
export function exportHistoryCSV(history) {
  if (!history || !history.length) return;

  const headers = ['Mã CK', 'Sàn', 'Khung thời gian', 'Thời gian phân tích', 'Kết quả phân tích'];
  const rows = history.map((item) => {
    const formattedTime = format(new Date(item.timestamp), 'dd/MM/yyyy HH:mm', { locale: vi });
    // Dọn dẹp nội dung tóm tắt để tránh làm vỡ định dạng CSV
    const cleanedResult = (item.result || '')
      .replace(/"/g, '""')
      .replace(/\n/g, ' ');

    return [
      item.ticker,
      item.exchange,
      item.timeframe,
      formattedTime,
      `"${cleanedResult}"`,
    ];
  });

  const csvContent = [headers, ...rows].map((r) => r.join(',')).join('\n');
  
  // Sử dụng ký tự BOM (\ufeff) để Excel nhận dạng đúng bảng mã UTF-8 tiếng Việt
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `vnstock_ai_history_${format(new Date(), 'yyyyMMdd_HHmmss')}.csv`;
  document.body.appendChild(a);
  a.click();
  
  // Dọn dẹp DOM
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default exportHistoryCSV;
