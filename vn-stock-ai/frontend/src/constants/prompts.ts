export const SYSTEM_PROMPT = `Bạn là chuyên gia phân tích chứng khoán Việt Nam hàng đầu với 20 năm kinh nghiệm tại HOSE, HNX và UPCOM. Bạn kết hợp phân tích kỹ thuật, cơ bản và tâm lý thị trường để đưa ra khuyến nghị chính xác.

## Phong cách phân tích:
- Sử dụng tiếng Việt chuyên nghiệp, rõ ràng
- Kết hợp dữ liệu định lượng với nhận định định tính
- Luôn cung cấp mức giá cụ thể (mua/bán/stop loss)
- Đánh giá rủi ro-lợi nhuận rõ ràng
- Phù hợp với quy định thị trường Việt Nam (biên độ ±7% HOSE, ±10% HNX)

## Cấu trúc phân tích:
1. **Tổng quan** - Bức tranh tổng thể về cổ phiếu
2. **Phân tích kỹ thuật** - Trend, hỗ trợ/kháng cự, indicators
3. **Phân tích cơ bản** - PE, ROE, tăng trưởng, ngành
4. **Tâm lý thị trường** - Khối ngoại, thanh khoản, tin tức
5. **Khuyến nghị** - BUY/HOLD/SELL với giá mục tiêu
6. **Quản lý rủi ro** - Stop loss, tỷ trọng, thời điểm

## Định dạng khuyến nghị (bắt buộc):
- 🟢 **KHUYẾN NGHỊ: MUA** hoặc 🔴 **KHUYẾN NGHỊ: BÁN** hoặc 🟡 **KHUYẾN NGHỊ: GIỮ**
- **Giá mua:** xxx,xxx VND
- **Giá mục tiêu:** xxx,xxx VND (+x%)
- **Stop loss:** xxx,xxx VND (-x%)
- **Thời gian nắm giữ:** x tuần/tháng
- **Độ tin cậy:** x/10`

// Alias for compatibility with pages
export const STOCK_ANALYST_SYSTEM_PROMPT = SYSTEM_PROMPT

// 6-argument version for AnalyzePage
export function buildAnalysisPrompt(
  ticker: string,
  exchange: string,
  period: string,
  technicals: Record<string, any>,
  info: Record<string, any>,
  activeSources: string[]
): string {
  const techStr = technicals ? `
### Dữ liệu kỹ thuật:
- Giá hiện tại: ${technicals.close?.toLocaleString('vi-VN') ?? 'N/A'} VND
- MA20: ${technicals.ma20?.toFixed(2) ?? 'N/A'} | MA50: ${technicals.ma50?.toFixed(2) ?? 'N/A'} | MA200: ${technicals.ma200?.toFixed(2) ?? 'N/A'}
- RSI(14): ${technicals.rsi?.toFixed(1) ?? 'N/A'}
- MACD: ${technicals.macd?.toFixed(3) ?? 'N/A'} | Signal: ${technicals.macd_signal?.toFixed(3) ?? 'N/A'} | Hist: ${technicals.macd_hist?.toFixed(3) ?? 'N/A'}
- BB Upper: ${technicals.bb_upper?.toFixed(2) ?? 'N/A'} | Mid: ${technicals.bb_mid?.toFixed(2) ?? 'N/A'} | Lower: ${technicals.bb_lower?.toFixed(2) ?? 'N/A'}
- Xu hướng: ${technicals.trend ?? 'N/A'}
- Hỗ trợ: ${technicals.support?.toFixed(2) ?? 'N/A'} | Kháng cự: ${technicals.resistance?.toFixed(2) ?? 'N/A'}
` : '### Dữ liệu kỹ thuật: Không có'

  const infoStr = info ? `
### Dữ liệu cơ bản:
- Tên: ${info.company_name ?? info.name ?? ticker}
- Ngành: ${info.industry ?? info.sector ?? 'N/A'}
- Vốn hóa: ${info.market_cap ? (info.market_cap / 1e9).toFixed(0) + ' tỷ VND' : 'N/A'}
- P/E: ${info.pe?.toFixed(1) ?? 'N/A'} | P/B: ${info.pb?.toFixed(2) ?? 'N/A'}
- ROE: ${info.roe ? info.roe.toFixed(1) + '%' : 'N/A'} | ROA: ${info.roa ? info.roa.toFixed(1) + '%' : 'N/A'}
- EPS: ${info.eps?.toLocaleString('vi-VN') ?? 'N/A'} VND
` : '### Dữ liệu cơ bản: Không có'

  return `Phân tích cổ phiếu **${ticker}** (${exchange}) - Dữ liệu: ${period}
Nguồn tham chiếu: ${activeSources.join(', ')}

${techStr}
${infoStr}

Hãy đưa ra phân tích toàn diện và khuyến nghị đầu tư cụ thể theo cấu trúc đã định.`
}

export function buildChatPrompt(context?: { ticker?: string; analysis?: string }): string {
  if (!context?.ticker) return SYSTEM_PROMPT
  return `${SYSTEM_PROMPT}

## Context hiện tại:
Đang phân tích: **${context.ticker}**
${context.analysis ? `\nPhân tích gần nhất:\n${context.analysis.slice(0, 500)}...` : ''}

Hãy trả lời các câu hỏi liên quan đến phân tích này hoặc chủ đề chứng khoán Việt Nam.`
}

export const QUICK_PROMPTS: { icon: string; text: string }[] = [
  { icon: '🏦', text: 'ACB có nên mua không?' },
  { icon: '📊', text: 'VNINDEX tuần này đi về đâu?' },
  { icon: '🔥', text: 'Nhóm ngành nào đang mạnh nhất?' },
  { icon: '💰', text: 'Khối ngoại đang mua/bán gì?' },
  { icon: '⚙️', text: 'HPG phân tích kỹ thuật hôm nay?' },
  { icon: '💻', text: 'FPT có tiềm năng dài hạn không?' },
  { icon: '📈', text: 'Lãi suất ảnh hưởng thế nào đến TTCK?' },
  { icon: '📉', text: 'Cách đọc RSI và MACD hiệu quả?' },
]
