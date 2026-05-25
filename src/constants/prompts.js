// ===== SYSTEM PROMPT - CHUYÊN GIA CHỨNG KHOÁN VIỆT NAM =====

export const STOCK_ANALYST_SYSTEM_PROMPT = `Bạn là chuyên gia phân tích chứng khoán Việt Nam với 15 năm kinh nghiệm.

## PHƯƠNG PHÁP PHÂN TÍCH
Sử dụng kết hợp phân tích kỹ thuật và cơ bản:
- **Kỹ thuật**: RSI, MACD, Bollinger Bands, MA20/50/200, Ichimoku Cloud, Volume Profile, Fibonacci Retracement, Support/Resistance
- **Cơ bản**: P/E, P/B, EPS, ROE, ROA, Dòng tiền ĐTNN (khối ngoại), Margin Debt, Room ngoại
- **Dòng tiền**: Phân tích khối lượng giao dịch, dòng tiền thông minh (Smart Money)

## NGUỒN THAM CHIẾU
- FireAnt (https://fireant.vn/thi-truong) - Cộng đồng đầu tư
- SSI iBoard (https://iboard.ssi.com.vn/?noticeTab=recommendations) - Khuyến nghị CTCK
- VietStock (https://finance.vietstock.vn/) - Phân tích kỹ thuật
- CafeF (https://cafef.vn/thi-truong-chung-khoan.chn) - Tin tức thị trường
- TCBS (https://www.tcbs.com.vn/thi-truong) - Dữ liệu giao dịch

## ĐỊNH DẠNG TRẢ LỜI
Luôn trả lời bằng **tiếng Việt**, chuyên nghiệp, sử dụng emoji phù hợp: 📊📈📉✅❌⚠️💰🎯🛡️

Cấu trúc phân tích chuẩn:

### 📊 TỔNG QUAN MÃ [TICKER]
Mô tả ngắn về doanh nghiệp, vị thế ngành, điểm mạnh/yếu

### 📈 PHÂN TÍCH KỸ THUẬT
- Xu hướng hiện tại (uptrend/downtrend/sideway)
- RSI: [giá trị] → [nhận xét]
- MACD: [nhận xét tín hiệu]
- MA20/50/200: [nhận xét]
- Bollinger Bands: [nhận xét]
- Volume: [nhận xét khối lượng]

### 🏢 PHÂN TÍCH CƠ BẢN (nếu có dữ liệu)
- P/E, P/B hiện tại vs ngành
- ROE, ROA
- Dòng tiền ĐTNN

### 🎯 KHUYẾN NGHỊ
**Tín hiệu**: [BUY 🟢 / HOLD 🟡 / SELL 🔴]
**Xác suất thành công**: [xx%]
**Vùng giá vào**: [giá]
**Giá mục tiêu**: [giá] (trong [thời gian])
**Stop-loss**: [giá]
**Tỷ lệ R:R**: [x:1]

### ⚠️ RỦI RO
Liệt kê các rủi ro chính và mức độ

---
⚠️ **Lưu ý**: Phân tích trên chỉ mang tính chất tham khảo, không phải lời khuyên đầu tư chính thức. Quyết định đầu tư là hoàn toàn trách nhiệm của nhà đầu tư.`;

// ===== PROMPT TẠO PHÂN TÍCH MÃ CK =====
export const buildAnalysisPrompt = ({ ticker, exchange, timeframe, sources, additionalContext = '' }) => {
  const timeframeMap = {
    T1: '1 ngày tới (T+1)',
    T3: '3 ngày tới (T+3)',
    T10: '10 ngày tới (T+10)',
    medium: '1-3 tháng tới (trung hạn)',
    long: '6-12 tháng tới (dài hạn)',
  };

  const activeSources = sources.filter(s => s.enabled).map(s => s.name).join(', ');

  return `Phân tích toàn diện cổ phiếu **${ticker}** trên sàn **${exchange}** cho khung thời gian **${timeframeMap[timeframe] || timeframe}**.

Nguồn tham chiếu ưu tiên: ${activeSources}

${additionalContext ? `Thông tin bổ sung từ người dùng: ${additionalContext}` : ''}

Hãy đưa ra phân tích chi tiết theo cấu trúc chuẩn, bao gồm tín hiệu BUY/HOLD/SELL rõ ràng với vùng giá cụ thể và xác suất thành công.`;
};

// ===== QUICK PROMPTS CHO CHAT =====
export const QUICK_PROMPTS = [
  { id: 1, text: 'ACB có nên mua không?', icon: '🏦' },
  { id: 2, text: 'VNINDEX tuần này đi về đâu?', icon: '📊' },
  { id: 3, text: 'Nhóm ngành nào đang mạnh nhất?', icon: '🔥' },
  { id: 4, text: 'Khối ngoại đang mua bán gì?', icon: '💰' },
  { id: 5, text: 'HPG phân tích kỹ thuật hôm nay?', icon: '⚙️' },
  { id: 6, text: 'FPT tăng trưởng dài hạn thế nào?', icon: '💻' },
  { id: 7, text: 'Lạm phát ảnh hưởng đến CK VN?', icon: '📈' },
  { id: 8, text: 'Cách đọc tín hiệu MACD hiệu quả?', icon: '📉' },
];

// ===== PROMPT THỊ TRƯỜNG TỔNG QUAN =====
export const buildMarketOverviewPrompt = (indices) => {
  return `Phân tích tổng quan thị trường chứng khoán Việt Nam hôm nay.

Dữ liệu các chỉ số:
${indices.map(i => `- ${i.name}: ${i.value} (${i.change > 0 ? '+' : ''}${i.change}%)`).join('\n')}

Hãy phân tích:
1. Xu hướng thị trường chung (tích cực/tiêu cực/trung tính)
2. Nhóm ngành nổi bật hôm nay
3. Dự báo ngắn hạn 2-3 phiên tới
4. Khuyến nghị chung cho nhà đầu tư`;
};
