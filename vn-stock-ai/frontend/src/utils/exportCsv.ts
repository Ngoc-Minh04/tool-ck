/**
 * Export lịch sử phân tích ra file CSV với BOM (UTF-8) để Excel mở đúng tiếng Việt
 */
export function exportHistoryCSV(history: any[]) {
  const headers = ['Thời gian', 'Mã CK', 'Sàn', 'Khung', 'Tín hiệu', 'Tóm tắt']
  const rows = history.map(h => [
    h.timestamp || '',
    h.ticker || '',
    h.exchange || '',
    h.timeframe || '',
    h.signal || '',
    `"${(h.content || h.summary || '').replace(/"/g, "'").replace(/\n/g, ' ')}"`,
  ])
  const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
  // \uFEFF = UTF-8 BOM để Excel nhận đúng tiếng Việt
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `vn-stock-history-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
