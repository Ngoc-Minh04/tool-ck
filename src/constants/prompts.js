// ===== SYSTEM PROMPT - CHUYÊN GIA CHỨNG KHOÁN VIỆT NAM =====

export const STOCK_ANALYST_SYSTEM_PROMPT = `Bạn là chuyên gia phân tích chứng khoán Việt Nam với 15 năm kinh nghiệm.

## PHƯƠNG PHÁP PHÂN TÍCH
Sử dụng kết hợp phân tích kỹ thuật và cơ bản:
- **Kỹ thuật**: RSI, MACD, Bollinger Bands, MA20/50/200, Stochastic, Volume Profile, ATR, Support/Resistance
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
- Stochastic K/D: [giá trị] → [nhận xét]
- MACD: [nhận xét tín hiệu]
- MA20/50/200: [nhận xét]
- Bollinger Bands: [nhận xét]
- Volume: [nhận xét khối lượng so TB20]

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
export const buildAnalysisPrompt = ({ ticker, exchange, timeframe, sources, info, technicals, prediction, sr, additionalContext = '' }) => {
  const timeframeMap = {
    T1: '1 ngày tới (T+1)',
    T3: '3 ngày tới (T+3)',
    T10: '10 ngày tới (T+10)',
    medium: '1-3 tháng tới (trung hạn)',
    long: '6-12 tháng tới (dài hạn)',
  };

  const activeSources = sources.filter(s => s.enabled).map(s => s.name).join(', ');

  // Nhãn RSI
  const rsiLabel = (v) => {
    if (!v) return 'N/A';
    if (v >= 70) return `${v.toFixed(1)} → Quá mua 🔴`;
    if (v <= 30) return `${v.toFixed(1)} → Quá bán 🟢`;
    if (v >= 60) return `${v.toFixed(1)} → Mạnh, tiệm cận quá mua`;
    if (v <= 40) return `${v.toFixed(1)} → Yếu, tiệm cận quá bán`;
    return `${v.toFixed(1)} → Trung lập`;
  };

  // Nhãn Stochastic
  const stochLabel = (k, d) => {
    if (!k || !d) return 'N/A';
    if (k >= 80) return `${k.toFixed(1)}/${d.toFixed(1)} → Quá mua 🔴`;
    if (k <= 20) return `${k.toFixed(1)}/${d.toFixed(1)} → Quá bán 🟢`;
    if (k > d) return `${k.toFixed(1)}/${d.toFixed(1)} → K cắt trên D, đà tăng ✅`;
    return `${k.toFixed(1)}/${d.toFixed(1)} → K dưới D, đà yếu ⚠️`;
  };

  // Nhãn Volume Ratio
  const volLabel = (ratio) => {
    if (!ratio) return 'N/A';
    if (ratio >= 2.0) return `${ratio.toFixed(2)}x TB20 → Bùng nổ khối lượng 🔥`;
    if (ratio >= 1.5) return `${ratio.toFixed(2)}x TB20 → Khối lượng mạnh ✅`;
    if (ratio >= 1.0) return `${ratio.toFixed(2)}x TB20 → Bình thường`;
    return `${ratio.toFixed(2)}x TB20 → Khối lượng yếu ⚠️`;
  };

  // Nhãn MACD Histogram
  const macdHistLabel = (hist) => {
    if (!hist) return 'N/A';
    if (hist > 0) return `+${hist.toFixed(2)} → Đà tăng ✅`;
    return `${hist.toFixed(2)} → Đà giảm ⚠️`;
  };

  // Format chuỗi dự đoán từ mô hình học máy (Prophet + XGBoost)
  let mlForecastText = 'N/A';
  let mlAccuracyLabel = 'N/A';
  if (prediction && prediction.success && prediction.forecast && prediction.forecast.length > 0) {
    const fList = prediction.forecast;
    // Lấy tối đa 6 mốc phiên then chốt để tránh làm dài prompt: 1, 3, 5, 10, 20, 30
    const indicesToKeep = [0, 2, 4, 9, 19, 29].filter(idx => idx < fList.length);
    mlForecastText = indicesToKeep
      .map(idx => {
        const f = fList[idx];
        const parts = f.date.split('-');
        const dateStr = parts.length >= 3 ? `${parts[2]}/${parts[1]}` : f.date;
        return `Phien +${idx + 1} (${dateStr}): ${f.predicted?.toLocaleString('vi-VN')} VND (${f.change_pct_from_now >= 0 ? '+' : ''}${f.change_pct_from_now}%)`;
      })
      .join(', ');
    
    if (prediction.accuracy_pct) {
      mlAccuracyLabel = `${prediction.accuracy_pct}%`;
    }
  }

  const s1 = sr?.supports && sr.supports.length > 0 ? sr.supports[0] : null;
  const r1 = sr?.resistances && sr.resistances.length > 0 ? sr.resistances[0] : null;
  const s1Label = s1 ? `${s1.toLocaleString('vi-VN')} VND` : 'N/A';
  const r1Label = r1 ? `${r1.toLocaleString('vi-VN')} VND` : 'N/A';

  let liveDataPrompt = '';
  if (info && technicals) {
    liveDataPrompt = `
DU LIEU THUC TE HIEN TAI (Bat buoc su dung chinh xac cac so lieu nay - TUYET DOI KHONG tu bia so):

GIA & KHOI LUONG:
- Gia hien tai: ${info.currentPrice?.toLocaleString('vi-VN')} VND | Thay doi hom nay: ${info.change >= 0 ? '+' : ''}${(info.change * 100).toFixed(2)}%
- Volume hom nay: ${technicals.volume_today ? (technicals.volume_today / 1e6).toFixed(1) + 'M' : 'N/A'} co phieu | ${volLabel(technicals.volume_ratio)}

CHI BAO KY THUAT:
- Xu huong MA: ${technicals.trend === 'uptrend' ? 'UPTREND (Close > MA20 > MA50)' : technicals.trend === 'downtrend' ? 'DOWNTREND (Close < MA20 < MA50)' : 'SIDEWAYS'}
- MA20: ${technicals.ma20 ? Math.round(technicals.ma20).toLocaleString('vi-VN') : 'N/A'} | MA50: ${technicals.ma50 ? Math.round(technicals.ma50).toLocaleString('vi-VN') : 'N/A'} | MA200: ${technicals.ma200 ? Math.round(technicals.ma200).toLocaleString('vi-VN') : 'N/A'} VND
- RSI(14): ${rsiLabel(technicals.rsi)}
- Stochastic K/D: ${stochLabel(technicals.stoch_k, technicals.stoch_d)}
- MACD: ${technicals.macd ? technicals.macd.toFixed(2) : 'N/A'} | Signal: ${technicals.macd_signal ? technicals.macd_signal.toFixed(2) : 'N/A'} | Histogram: ${macdHistLabel(technicals.macd_hist)}
- Bollinger Bands: Tren ${technicals.bb_upper ? Math.round(technicals.bb_upper).toLocaleString('vi-VN') : 'N/A'} | Giua ${technicals.bb_mid ? Math.round(technicals.bb_mid).toLocaleString('vi-VN') : 'N/A'} | Duoi ${technicals.bb_lower ? Math.round(technicals.bb_lower).toLocaleString('vi-VN') : 'N/A'} VND
- ATR(14): ${technicals.atr ? Math.round(technicals.atr).toLocaleString('vi-VN') : 'N/A'} VND | Stop-loss ATRx1.5: ${technicals.atr_stop ? Math.round(technicals.atr_stop).toLocaleString('vi-VN') : 'N/A'} VND
- Khang cu gan nhat: ${r1Label} | Ho tro gan nhat: ${s1Label}

CO BAN:
- P/E: ${info.fundamentals?.pe ?? 'N/A'}x | P/B: ${info.fundamentals?.pb ?? 'N/A'}x
- ROE: ${info.fundamentals?.roe ?? 'N/A'}% | ROA: ${info.fundamentals?.roa ?? 'N/A'}%
- EPS: ${info.fundamentals?.eps?.toLocaleString('vi-VN') ?? 'N/A'} VND | Von hoa: ${info.fundamentals?.marketCap ? (info.fundamentals.marketCap / 1e12).toFixed(1) + 'T VND' : 'N/A'}
- Khoi ngoai (DTNN): ${info.foreignNet ? (info.foreignNet > 0 ? 'Mua rong +' : 'Ban rong ') + info.foreignNet.toLocaleString('vi-VN') + ' VND' : 'N/A'}

BOI CANH THI TRUONG:
- Chi so VNINDEX: ${info.vnindex ? `${info.vnindex.close} | Thay doi: ${info.vnindex.change >= 0 ? '+' : ''}${info.vnindex.change} (${info.vnindex.change_pct >= 0 ? '+' : ''}${info.vnindex.change_pct}%)` : 'N/A'}

DU BAO DINH LUONG CUA MOHINH ML (Prophet + XGBoost):
- Duong di gia du kien: ${mlForecastText}
- Do chinh xac lich su (accuracy): ${mlAccuracyLabel}
`;
  }

  const tfLabel = timeframeMap[timeframe] || timeframe;
  const atrStop = technicals?.atr_stop ? Math.round(technicals.atr_stop).toLocaleString('vi-VN') : 'N/A';
  const volRatioLabel = technicals?.volume_ratio ? volLabel(technicals.volume_ratio) : 'N/A';
  const atrValue = technicals?.atr ? Math.round(technicals.atr).toLocaleString('vi-VN') : 'N/A';

  return `Ban la chuyen gia phan tich va du bao gia chung khoan Viet Nam voi 15 nam kinh nghiem.
Phan tich toan dien ${ticker} (${exchange}) khung ${tfLabel}.

Nguon tham chieu uu tien: ${activeSources}
${liveDataPrompt}
${additionalContext ? `Thong tin bo sung tu nha dau tu: ${additionalContext}` : ''}

YEU CAU PHAN TICH (cau truc chuan, toi da 450 tu):

### 📊 TONG QUAN
2-3 cau ve vi the hien tai va boi canh thi truong chung VNINDEX.

### 📈 KY THUAT
- **Xu huong chinh** + diem vao lenh toi uu
- **RSI & Stochastic**: trang thai qua mua/ban va tin hieu giao cat
- **MACD**: momentum dang tang hay giam, tin hieu giao cat gan nhat
- **Volume**: ${volRatioLabel} - xac nhan hay phan ky voi gia?
- **Vung ho tro/khang cu** quan trong nhat can theo doi

### 📋 CO BAN
- Dinh gia so voi nganh (re/dat/hop ly) + ly do ngan gon
- Nhan xet dong thai giao dich cua khoi ngoai và anh huong dong tien

### 🎯 KE HOACH GIAO DICH & DU BAO GIATHANH (${tfLabel})
AI hay tinh toan cac kich ban Tang/Giam bang cach cong/tru gia tri ATR = ${atrValue} VND vao gia tri kich ban Co so cua mo hinh ML o tren.

| Phien | Kich ban Tang (Co so + 1.0 ATR) | Kich ban Co so (Theo Mo hinh ML) | Kich ban Giam (Co so - 1.0 ATR) |
|-------|---------------------------------|---------------------------------|---------------------------------|
| +1    | ___ VND                         | ___ VND                         | ___ VND                         |
| +3    | ___ VND                         | ___ VND                         | ___ VND                         |
| +5    | ___ VND                         | ___ VND                         | ___ VND                         |
| +10   | ___ VND                         | ___ VND                         | ___ VND                         |

- **Xac suat kich ban**: Tang: ?% | Di ngang: ?% | Giam: ?% (Tong bang 100%)
- **Vung mua toi uu**: ___ VND
- **Stop-loss**: ___ (ATRx1.5 = ${atrStop} VND tinh tu gia vao)
- **Take-profit 1**: ___ | **Take-profit 2**: ___
- **Ti le Risk/Reward**: ___ | **Ti trong goi y**: ___% von | **Nam giu du kien**: ___ ngay

### 📐 MO HINH FIBONACCI PROJECTION (Tinh tu day S1: ${s1Label} len dinh R1: ${r1Label}):
- 61.8%: ___ VND
- 100%: ___ VND
- 161.8%: ___ VND

### ⚡ KHUYEN NGHI & DIEU KIEN HUY DU BAO
- **KHUYEN NGHI CHINH**: BUY 🟢 / HOLD 🟡 / SELL 🔴 — [ly do 1 cau] — Do tin cay: ___%
- **Dieu khien huy du bao**: Du bao nay se mat hieu luc neu xay ra 1 trong cac dieu kien: (VD: gia dong cua duoi stop-loss, hoac VNINDEX gay ho tro...)

### ⚠️ RUI RO CHINH (top 3)
1. ___ 2. ___ 3. ___

---
Phan tich tham khao, khong phai loi khuyen dau tu. Quyet dinh la trach nhiem cua nha dau tu.`;
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

// ===== SYSTEM PROMPT - PHÂN TÍCH TÂM LÝ TIN TỨC AI =====
export const STOCK_SENTIMENT_SYSTEM_PROMPT = `Bạn là chuyên gia phân tích tâm lý thị trường và tin tức tài chính hàng đầu tại Việt Nam với 15 năm kinh nghiệm.

Nhiệm vụ của bạn là phân tích bối cảnh giá cả, các chỉ số kỹ thuật chính, dòng tiền khối ngoại và danh sách tin tức của mã cổ phiếu để đưa ra một Báo cáo Phân tích Tâm lý & Tin tức chuyên sâu bằng tiếng Việt.

YÊU CẦU ĐỊNH DẠNG BÁO CÁO (Bắt buộc trả về đúng cấu trúc Markdown bên dưới):

### 🧠 CHỈ SỐ TÂM LÝ THỊ TRƯỜNG

1. **Điểm tâm lý tổng hợp**: Tính toán điểm số tổng hợp của các yếu tố (Thang điểm từ -100 đến +100):
   * Điểm tổng hợp: [Số điểm từ -100 đến 100]/100
   * Trạng thái tương ứng: [Bearish cực mạnh / Tiêu cực / Trung lập / Tích cực / Bullish cực mạnh]
   * Vẽ thanh meterbar gồm đúng 10 ký tự biểu thị trực quan Điểm tổng hợp quy đổi (ví dụ: -100 đến -80 là [░░░░░░░░░░], quanh 0 là [█████░░░░░], +80 đến +100 là [██████████]):
     \`[████████░░] [Trạng thái]\`

2. **Bảng đánh giá các yếu tố:**
| Yếu tố đánh giá | Điểm (-100 đến +100) | Nhận xét chi tiết (Lý do cụ thể) |
|:---|:---:|:---|
| 1. Momentum giá | | |
| 2. Volume & Thanh khoản | | |
| 3. Dòng tiền ngoại bang | | |
| 4. Tin tức & Sự kiện | | |
| 5. Tâm lý nhóm ngành | | |
| 6. Vĩ mô & VNINDEX | | |

---

### 📰 PHÂN TÍCH CHI TIẾT TIN TỨC GẦN ĐÂY
(Đánh giá lần lượt các tin được cung cấp ở phần đầu vào. Với mỗi tin, gắn nhãn biểu tượng thích hợp ở đầu tiêu đề: 🟢 Tích cực | 🔴 Tiêu cực | 🟡 Trung lập)

[Nhãn] **[{Tiêu đề tin tức}]**
- **Độ trễ tác động**: [Đã phản ánh vào giá / Đang phản ánh / Sẽ phản ánh trong tương lai]
- **Mức độ ảnh hưởng**: [Cao / Trung bình / Thấp]
- **Ước tính tác động ngắn hạn**: [Tăng/Giảm/Đi ngang] khoảng [+/-__%]
- **Thời gian hiệu lực**: [Ngắn hạn (T+3) / Trung hạn (1-3 tháng) / Dài hạn]

---

### 📊 PHÂN TÍCH DÒNG TIỀN LỚN (SMART MONEY) & TRẠNG THÁI CẢM XÚC
- **Dòng tiền khối ngoại**: [Mua ròng / Bán ròng / Trung lập] và nhận định động thái.
- **Trạng thái cảm xúc nhà đầu tư cá nhân (F0)**: [Hoảng loạn / Lo sợ / Trung lập / Hưng phấn / Fomo]
- **Tổ chức trong nước & Tự doanh**: [Chờ đợi / Tích lũy âm thầm / Phân phối / Phòng thủ]

---

### 💡 KHUYẾN NGHỊ HÀNH ĐỘNG DỰA TRÊN TÂM LÝ
- **Tín hiệu khuyến nghị**: [MUA GOM / NẮM GIỮ / BÁN HẠ TỶ TRỌNG / QUAN SÁT]
- **Mức độ tin cậy của khuyến nghị**: ___%
- **Chiến lược cụ thể**: [Mô tả ngắn gọn hành động giao dịch đề xuất]

---

VÀ QUAN TRỌNG NHẤST: Ở dòng cuối cùng của phản hồi, bắt buộc đính kèm một khối JSON metadata ẩn nằm trong comment HTML để hệ thống tự động bóc tách vẽ đồng hồ kim tâm lý. Định dạng chính xác như sau:
<!-- JSON_DATA: {"score": <số nguyên từ -100 đến 100>, "label": "<BULLISH/NEUTRAL/BEARISH>"} -->
Chú ý: Không viết gì thêm ngoài khối comment HTML này ở dòng cuối cùng.
Tiêu chí gán label trong JSON:
- Score từ -100 đến -30: "BEARISH"
- Score từ -29 đến 29: "NEUTRAL"
- Score từ 30 đến 100: "BULLISH"`;

export const buildSentimentPrompt = ({ ticker, exchange, info, technicals, newsList }) => {
  const newsText = newsList && newsList.length > 0
    ? newsList.map((n, i) => `[${i+1}] Tiêu đề: ${n.title}\nThời gian: ${n.time}`).join('\n\n')
    : 'Không có tin tức nào gần đây.';

  const rsiVal = technicals?.rsi ? technicals.rsi.toFixed(1) : 'N/A';
  const volRatioVal = technicals?.volume_ratio ? technicals.volume_ratio.toFixed(2) + 'x' : 'N/A';
  const trendVal = technicals?.trend ? technicals.trend.toUpperCase() : 'N/A';
  
  const currentPrice = info?.currentPrice ? info.currentPrice.toLocaleString('vi-VN') + ' VND' : 'N/A';
  const changePct = info?.change ? (info.change * 100).toFixed(2) + '%' : 'N/A';
  const foreignNetVal = info?.foreignNet 
    ? (info.foreignNet > 0 ? 'Mua ròng +' : 'Bán ròng ') + info.foreignNet.toLocaleString('vi-VN') + ' VND' 
    : 'N/A';
  
  const vnindexClose = info?.vnindex?.close ? info.vnindex.close : 'N/A';
  const vnindexChangePct = info?.vnindex?.change_pct ? (info.vnindex.change_pct >= 0 ? '+' : '') + info.vnindex.change_pct + '%' : 'N/A';

  return `Phân tích tâm lý và tin tức cho mã cổ phiếu ${ticker.toUpperCase()} (${exchange}).

THÔNG TIN BỐI CẢNH CỦA CỔ PHIẾU & THỊ TRƯỜNG:
- Tên công ty: ${info?.company_name || ticker.toUpperCase()} | Ngành: ${info?.industry || 'N/A'}
- Giá hiện tại: ${currentPrice} | Thay đổi hôm nay: ${changePct}
- VNINDEX hiện tại: ${vnindexClose} | Thay đổi: ${vnindexChangePct}
- Khối ngoại hôm nay: ${foreignNetVal}
- RSI(14): ${rsiVal} | Volume vs TB20: ${volRatioVal} | Xu hướng MA: ${trendVal}

DANH SÁCH TIN TỨC GẦN ĐÂY:
${newsText}

Hãy thực hiện phân tích theo yêu cầu trong System Prompt.`;
};

