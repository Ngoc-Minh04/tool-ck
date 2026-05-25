# VN Stock AI Analyzer 📊

Ứng dụng phân tích và dự đoán chứng khoán Việt Nam tích hợp **Claude AI API**, xây dựng bằng React + Vite.

## ✨ Tính năng

- 📈 **Phân tích cổ phiếu**: BUY/HOLD/SELL + vùng giá mục tiêu + stop-loss + xác suất
- 🕯️ **Biểu đồ kỹ thuật**: Nến Nhật, Volume, RSI, MACD, MA20/50/200, Bollinger Bands
- 🌐 **Thị trường tổng quan**: VNINDEX, VN30, HNX30, UPCOM + phân ngành + dòng tiền ĐTNN
- 💬 **Chat AI đa lượt**: Hỏi đáp với Claude về thị trường, kỹ thuật đầu tư
- 📋 **Lịch sử phân tích**: Lưu, tìm kiếm, lọc, export CSV
- ⚙️ **Cài đặt**: API Key, Model, Nguồn dữ liệu, Giao diện

## 🚀 Cài đặt và chạy

### 1. Cài dependencies
```bash
npm install
```

### 2. Cấu hình API Key
```bash
copy .env.example .env
```
Mở file `.env` và điền:
```
VITE_ANTHROPIC_API_KEY=sk-ant-api03-your-key-here
VITE_MODEL=claude-sonnet-4-5
```
> Lấy API Key tại: https://console.anthropic.com

### 3. Chạy ứng dụng
```bash
npm run dev
```
Truy cập: http://localhost:5173

---

## ⚙️ Cài đặt API Key trong ứng dụng

1. Vào trang **Cài đặt** (icon gear trong sidebar)
2. Nhập API Key → Nhấn Lưu
3. Chọn model Claude phù hợp

---

## 🛠️ Tech Stack

| Công nghệ | Mục đích |
|-----------|---------|
| React 18 + Vite | UI Framework + Build |
| TailwindCSS v4 | Styling |
| Recharts | Biểu đồ kỹ thuật |
| Zustand | State Management |
| React Router v6 | Routing |
| date-fns | Xử lý ngày |
| react-markdown | Render markdown AI |
| react-hot-toast | Notifications |
| Axios | HTTP Client |

---

## 📁 Cấu trúc dự án

```
src/
├── components/
│   ├── Layout/         # Sidebar, Header
│   ├── Analysis/       # TickerForm, ResultCard, SignalBadge
│   ├── Market/         # IndexCard, SectorSignals, ForeignTrading
│   ├── Chart/          # CandlestickChart, VolumeChart, IndicatorPanel
│   ├── Chat/           # MessageBubble, QuickPrompts
│   ├── History/        # HistoryList, HistoryItem
│   └── UI/             # Button, Badge, Tabs, Select, Skeleton...
├── pages/              # 5 trang chính
├── hooks/              # useClaude, useVnStock, useLocalStorage
├── store/              # Zustand store
├── services/           # claudeService.js, vnstockService.js
└── constants/          # sources.js, prompts.js
```

---

## ⚠️ Lưu ý quan trọng

- Ứng dụng gọi trực tiếp Anthropic API từ browser (dev only)
- Dữ liệu giá cổ phiếu là **mock data** cho demo - không phải giá thực
- Phân tích AI chỉ mang tính tham khảo, **không phải lời khuyên đầu tư**

---

Made with ❤️ · VN Stock AI Analyzer v1.0.0
