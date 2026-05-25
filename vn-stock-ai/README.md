# VN Stock AI Predictor 📊

Ứng dụng phân tích & dự đoán chứng khoán Việt Nam full-stack:
**Claude AI API** + **FastAPI backend** + **dữ liệu thực từ vnstock3**

## ✨ Tính năng

| Tính năng | Mô tả |
|-----------|-------|
| 📈 **Phân tích AI** | BUY/HOLD/SELL + giá mục tiêu + stop-loss |
| 🕯️ **Biểu đồ kỹ thuật** | Nến Nhật, MA20/50/200, BB, Volume |
| 📊 **RSI + MACD** | Indicator panels trực quan |
| 🌐 **Thị trường** | VNINDEX, VN30, HNX30, UPCOM realtime |
| 🚀 **Top Movers** | Top tăng/giảm/volume mạnh nhất |
| 💰 **ĐTNN** | Dòng tiền khối ngoại realtime |
| 💬 **Chat AI** | Hỏi đáp đa lượt với Claude |
| 🧪 **Backtest** | MA Cross, RSI, MACD strategy |
| 🔔 **Price Alert** | Cảnh báo giá qua Telegram |
| 📋 **Lịch sử** | Export CSV, filter, tìm kiếm |

## 🚀 Cài đặt nhanh (không Docker)

### 1. Clone & Setup Backend

```bash
cd vn-stock-ai/backend

# Tạo virtual env
python -m venv venv
# Windows:
venv\Scripts\activate

# Cài dependencies
pip install -r requirements.txt

# Cấu hình env
copy .env.example .env
# Mở .env, điền các giá trị cần thiết (Telegram token nếu muốn)

# Chạy backend
uvicorn app.main:app --reload --port 8000
```

Backend sẽ chạy tại: **http://localhost:8000**
Swagger docs: **http://localhost:8000/docs**

### 2. Setup Frontend

```bash
cd vn-stock-ai/frontend

# Cài dependencies
npm install

# Cấu hình env
copy .env.example .env
# Mở .env, điền VITE_ANTHROPIC_API_KEY=sk-ant-...

# Chạy dev server
npm run dev
```

Frontend sẽ chạy tại: **http://localhost:5173**

### 3. Cấu hình API Key trong app

1. Mở http://localhost:5173
2. Vào trang **Cài đặt** (icon gear)
3. Nhập Claude API Key → Lưu
4. Bắt đầu phân tích!

---

## 🐳 Chạy bằng Docker

```bash
cd vn-stock-ai

# Copy env files
copy backend\.env.example backend\.env
copy frontend\.env.example frontend\.env
# Điền API keys vào các file .env

# Build & run
docker-compose up --build

# Hoặc chạy background
docker-compose up -d --build
```

---

## 🔑 Lấy API Keys

### Claude API Key (bắt buộc)
1. Truy cập https://console.anthropic.com
2. **API Keys** → **Create Key**
3. Copy key (bắt đầu với `sk-ant-...`)
4. Điền vào frontend/.env hoặc trong Settings của app

### Telegram Bot Token (tùy chọn — cho price alerts)
1. Chat với **@BotFather** trên Telegram
2. Gửi `/newbot` → đặt tên bot
3. Copy token nhận được
4. Lấy Chat ID: Chat với bot → truy cập `https://api.telegram.org/bot<TOKEN>/getUpdates`
5. Điền vào `backend/.env` hoặc trong Settings → Telegram

---

## 🛠️ Tech Stack

### Backend
| Package | Mục đích |
|---------|---------|
| FastAPI + uvicorn | Web framework |
| vnstock3 | Dữ liệu thực CK Việt Nam |
| pandas + pandas-ta | Tính chỉ số kỹ thuật |
| Redis | Cache (optional) |
| APScheduler | Scheduler cho price alerts |
| python-telegram-bot | Gửi Telegram notifications |

### Frontend
| Package | Mục đích |
|---------|---------|
| React 18 + TypeScript | UI Framework |
| Vite | Build tool |
| TailwindCSS | Styling |
| Recharts | Biểu đồ |
| Zustand | State management |
| React Router v6 | Routing |
| Framer Motion | Animations |
| react-markdown | Render AI output |

---

## 📁 Cấu trúc dự án

```
vn-stock-ai/
├── frontend/
│   ├── src/
│   │   ├── components/    # UI Components
│   │   ├── pages/         # 6 trang
│   │   ├── hooks/         # Custom hooks
│   │   ├── store/         # Zustand stores
│   │   ├── services/      # API clients
│   │   ├── constants/     # Prompts, sources
│   │   └── utils/         # Helpers
│   └── ...
├── backend/
│   ├── app/
│   │   ├── routers/       # API endpoints
│   │   ├── services/      # Business logic
│   │   ├── models/        # Pydantic schemas
│   │   └── tasks/         # Scheduled jobs
│   └── requirements.txt
├── docker-compose.yml
└── README.md
```

---

## ⚠️ Lưu ý quan trọng

1. **Dữ liệu thực**: Backend dùng `vnstock3` để fetch dữ liệu thực từ VCI/SSI. Nếu API vnstock3 thay đổi, có fallback mock data.
2. **Redis không bắt buộc**: App tự động dùng in-memory cache nếu Redis không có sẵn.
3. **Claude API**: Streaming mode cho UX tốt hơn — thấy kết quả ngay khi AI đang viết.
4. **Dev only**: Gọi Anthropic API trực tiếp từ browser với header `anthropic-dangerous-direct-browser-access`. Không dùng trong production.
5. **Phân tích AI**: Chỉ mang tính tham khảo, không phải lời khuyên đầu tư.

---

## 🔧 Scripts hữu ích

```bash
# Backend
uvicorn app.main:app --reload --port 8000  # Dev
uvicorn app.main:app --port 8000           # Production

# Frontend
npm run dev          # Dev server
npm run build        # Production build
npm run type-check   # Check TypeScript
```

---

Made with ❤️ · VN Stock AI Predictor v2.0
FastAPI + vnstock3 + Claude AI + React TypeScript
