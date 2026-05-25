import { useState, useCallback } from 'react'
import { callClaude } from '../services/claudeService'
import { useAppStore } from '../store/appStore'
import toast from 'react-hot-toast'

async function simulateMockAnalysis(
  userMessage: string,
  onStream?: (chunk: string) => void
): Promise<string> {
  const tickerMatch = userMessage.match(/cổ phiếu\s+([A-Z0-9]+)/i) || userMessage.match(/ticker\s+([A-Z0-9]+)/i)
  const ticker = tickerMatch ? tickerMatch[1].toUpperCase() : 'CỔ PHIẾU'

  const rsiMatch = userMessage.match(/RSI.*?([\d.]+)/)
  const rsi = rsiMatch ? rsiMatch[1] : '50.6'
  
  const closeMatch = userMessage.match(/giá đóng cửa.*?([\d,.]+)/i) || userMessage.match(/close.*?([\d,.]+)/i)
  const close = closeMatch ? closeMatch[1] : '75.1k'

  const mockText = `### 🤖 BÁO CÁO PHÂN TÍCH CHỨNG KHOÁN AI (MÔ PHỎNG)
---
Hệ thống phát hiện bạn **chưa nhập Claude API Key**. Dưới đây là nhận định mô phỏng chi tiết cho mã cổ phiếu **${ticker}**:

#### 1. 📈 Phân Tích Kỹ Thuật (Technical Analysis)
* **Xu hướng giá:** **${ticker}** đang vận hành trong xu hướng tích lũy trung hạn. Mức giá đóng cửa gần đây nhất dao động quanh ngưỡng **${close} VND**.
* **Động lượng (RSI):** Chỉ báo sức mạnh tương đối **RSI(14) đạt ${rsi}**, nằm ở vùng trung tính. Không xuất hiện tín hiệu quá mua hay quá bán, phản ánh trạng thái cân bằng giữa cung và cầu.
* **Đường trung bình động (MA):** Giá hiện tại đang duy trì ổn định phía trên đường trung bình MA20 và MA50, cho thấy lực đỡ ngắn hạn tương đối tốt.
* **Dải Bollinger Bands:** Biên độ dải đang co hẹp lại, dự kiến cổ phiếu sắp bước vào giai đoạn biến động mạnh về giá trong 1-2 tuần tới.

#### 2. 📊 Phân Tích Cơ Bản (Fundamental Highlights)
* **Hiệu quả kinh doanh:** Doanh nghiệp đầu ngành với tỷ lệ sinh lời trên vốn chủ sở hữu **ROE duy trì ở mức cao ấn tượng (> 22%)**. 
* **Định giá tài chính:** Chỉ số P/E giao dịch ở mức hợp lý so với trung bình lịch sử 3 năm của ngành. Dòng tiền kinh doanh hoạt động ổn định và có dư địa tăng trưởng cao nhờ các dự án chuyển đổi số và hợp đồng ký mới lớn.

#### 3. 🎯 Khuyến Nghị Chiến Lược Giao Dịch
* **Chiến lược hành động:** Khuyến nghị **Mua Tích Lũy** từng phần khi giá điều chỉnh về vùng hỗ trợ kỹ thuật gần nhất.
* **Vùng gom mua tối ưu:** Vùng giá hỗ trợ dưới biên dưới dải Bollinger.
* **Mức cắt lỗ (Stop-loss):** Thủng vùng đáy cũ ngắn hạn gần nhất (khoảng 5-7% từ mức giá mua).
* **Mục tiêu chốt lời (Target):** Lợi nhuận kỳ vọng ngắn hạn đạt từ 10% - 15%.

---
> 💡 *Để nhận được bài phân tích thực tế, cập nhật thời gian thực từ mô hình AI tiên tiến nhất của Anthropic, vui lòng truy cập mục **Cài đặt** và nhập Claude API Key của riêng bạn.*`

  if (onStream) {
    const words = mockText.split(/(\s+)/)
    let index = 0
    let currentText = ''
    return new Promise((resolve) => {
      const interval = setInterval(() => {
        if (index < words.length) {
          const chunk = words[index]
          currentText += chunk
          onStream(chunk)
          index++
        } else {
          clearInterval(interval)
          resolve(currentText)
        }
      }, 15)
    })
  } else {
    return mockText
  }
}

export function useClaude() {
  const [loading, setLoading] = useState(false)
  const [streamContent, setStreamContent] = useState('')
  const { apiKey, model } = useAppStore()

  const analyze = useCallback(async ({
    systemPrompt,
    userMessage,
    history = [],
    stream = false,
  }: {
    systemPrompt: string
    userMessage: string
    history?: { role: string; content: string }[]
    stream?: boolean
  }): Promise<string | null> => {
    if (!apiKey) {
      toast('Cấu hình API Key trống — đang chạy chế độ mô phỏng', { icon: 'ℹ️', id: 'api-warn' })
      setLoading(true)
      setStreamContent('')
      const mockRes = await simulateMockAnalysis(userMessage, stream ? (chunk) => setStreamContent(prev => prev + chunk) : undefined)
      setLoading(false)
      return mockRes
    }
    setLoading(true)
    setStreamContent('')
    try {
      let result = ''
      if (stream) {
        result = await callClaude(userMessage, systemPrompt, history, apiKey, model,
          (chunk) => setStreamContent(prev => prev + chunk))
      } else {
        result = await callClaude(userMessage, systemPrompt, history, apiKey, model)
      }
      return result
    } catch (err: any) {
      const msg = err?.message || 'Lỗi không xác định'
      if (msg.includes('401') || msg.toLowerCase().includes('api_key') || msg.toLowerCase().includes('authentication')) {
        toast.error('API Key không hợp lệ!')
      } else if (msg.includes('429')) {
        toast.error('Rate limit. Thử lại sau vài giây.')
      } else if (msg.includes('500') || msg.includes('overloaded')) {
        toast.error('Claude đang quá tải. Thử lại sau.')
      } else {
        toast.error(`Lỗi Claude: ${msg.slice(0, 100)}`)
      }
      return null
    } finally {
      setLoading(false)
    }
  }, [apiKey, model])

  return { loading, streamContent, analyze, clearStream: () => setStreamContent('') }
}

export default useClaude
