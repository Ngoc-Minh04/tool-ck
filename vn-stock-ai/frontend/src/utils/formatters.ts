export function fmtPrice(v: number | null | undefined, currency = true): string {
  if (v == null) return 'N/A'
  const n = Number(v)
  if (isNaN(n)) return 'N/A'
  const s = n.toLocaleString('vi-VN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
  return currency ? s + ' ₫' : s
}

export function fmtPct(v: number | null | undefined, decimals = 2): string {
  if (v == null) return 'N/A'
  const n = Number(v)
  if (isNaN(n)) return 'N/A'
  const sign = n >= 0 ? '+' : ''
  return `${sign}${n.toFixed(decimals)}%`
}

export function fmtVol(v: number | null | undefined): string {
  if (v == null) return 'N/A'
  const n = Number(v)
  if (isNaN(n)) return 'N/A'
  if (n >= 1e9) return (n / 1e9).toFixed(2) + ' tỷ'
  if (n >= 1e6) return (n / 1e6).toFixed(2) + ' tr'
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K'
  return n.toLocaleString('vi-VN')
}

export function fmtCap(v: number | null | undefined): string {
  if (v == null) return 'N/A'
  const n = Number(v)
  if (isNaN(n)) return 'N/A'
  if (n >= 1e12) return (n / 1e12).toFixed(2) + ' nghìn tỷ'
  if (n >= 1e9) return (n / 1e9).toFixed(2) + ' tỷ'
  return n.toLocaleString('vi-VN')
}

export function fmtDate(v: string | Date | null | undefined): string {
  if (!v) return 'N/A'
  try {
    const d = typeof v === 'string' ? new Date(v) : v
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
  } catch { return String(v) }
}

export function fmtDatetime(v: string | Date | null | undefined): string {
  if (!v) return 'N/A'
  try {
    const d = typeof v === 'string' ? new Date(v) : v
    return d.toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
  } catch { return String(v) }
}

export function isMarketOpen(): boolean {
  const now = new Date()
  const vnTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }))
  const day = vnTime.getDay()
  const h = vnTime.getHours()
  const m = vnTime.getMinutes()
  const mins = h * 60 + m
  if (day === 0 || day === 6) return false
  return (mins >= 9 * 60 + 15 && mins < 11 * 60 + 30) || (mins >= 13 * 60 && mins < 14 * 60 + 45)
}

export function extractSignal(text: string): 'BUY' | 'HOLD' | 'SELL' | 'UNKNOWN' {
  if (!text) return 'UNKNOWN'
  const upper = text.toUpperCase()
  const buyPats = ['KHUYẾN NGHỊ: MUA', 'KHUYẾN NGHỊ MUA', 'SIGNAL: BUY', '🟢', 'NÊN MUA', 'TÍCH CỰC MUA']
  const sellPats = ['KHUYẾN NGHỊ: BÁN', 'KHUYẾN NGHỊ BÁN', 'SIGNAL: SELL', '🔴', 'NÊN BÁN', 'CẮT LỖ']
  const holdPats = ['KHUYẾN NGHỊ: GIỮ', 'KHUYẾN NGHỊ GIỮ', 'SIGNAL: HOLD', '🟡', 'THEO DÕI', 'TRUNG LẬP']
  if (buyPats.some(p => upper.includes(p.toUpperCase()))) return 'BUY'
  if (sellPats.some(p => upper.includes(p.toUpperCase()))) return 'SELL'
  if (holdPats.some(p => upper.includes(p.toUpperCase()))) return 'HOLD'
  return 'UNKNOWN'
}

export function priceColor(change: number): string {
  if (change > 0) return 'text-green-400'
  if (change < 0) return 'text-red-400'
  return 'text-slate-400'
}

export function priceArrow(change: number): string {
  if (change > 0) return '▲'
  if (change < 0) return '▼'
  return '—'
}

export function clamp(v: number, min: number, max: number): number {
  return Math.min(Math.max(v, min), max)
}

export function truncate(s: string, n: number): string {
  if (!s) return ''
  return s.length > n ? s.slice(0, n) + '…' : s
}
