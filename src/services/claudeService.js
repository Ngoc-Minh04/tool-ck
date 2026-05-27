// ===== CLAUDE AI SERVICE =====
// Gọi qua backend proxy (FastAPI) thay vì gọi trực tiếp Anthropic từ frontend để bảo mật API key

import axios from 'axios';

const BACKEND = import.meta.env.VITE_BACKEND_URL || 'http://127.0.0.1:8000';

/**
 * Giả lập phản hồi từ AI khi người dùng chưa cấu hình API Key (Demo Mode)
 */
const handleMockResponse = async ({ systemPrompt, messages, onStream }) => {
  const lastMessage = messages[messages.length - 1]?.content || '';
  const lastMessageUpper = lastMessage.toUpperCase();

  // Giả lập độ trễ suy nghĩ của AI
  await new Promise((resolve) => setTimeout(resolve, 800));

  let responseText = '';

  // 1. Phân tích cổ phiếu
  if (
    lastMessageUpper.includes('PHÂN TÍCH TOÀN DIỆN CỔ PHIẾU') || 
    lastMessageUpper.includes('PHÂN TÍCH CỔ PHIẾU') || 
    lastMessageUpper.includes('MÃ CỔ PHIẾU') ||
    lastMessageUpper.includes('TÌNH HÌNH MÃ')
  ) {
    let ticker = 'HPG';
    const tickerMatch = lastMessage.match(/cổ phiếu \*\*([A-Za-z0-9]+)\*\*/i) 
                      || lastMessage.match(/cổ phiếu ([A-Za-z0-9]+)/i)
                      || lastMessage.match(/mã ([A-Za-z0-9]+)/i)
                      || lastMessage.match(/([A-Z]{3,4})/);
    if (tickerMatch) {
      ticker = tickerMatch[1].toUpperCase();
    }

    let signal = 'BUY';
    let probability = '75%';
    let rsi = '58.4';
    let macd = 'vừa cắt lên trên đường tín hiệu (Signal Line), cho thấy động lượng tăng đang hình thành.';
    let priceTarget = 'tăng khoảng 12% - 15%';
    let stopLoss = 'giảm 5%';
    let description = 'vị thế đầu ngành tốt, tiềm năng tăng trưởng trung và dài hạn vững chắc.';

    if (ticker === 'VCB') {
      signal = 'HOLD';
      probability = '65%';
      rsi = '62.1';
      macd = 'đang đi ngang sát đường tín hiệu, thể hiện xu hướng tích lũy kéo dài.';
      priceTarget = 'tăng 5% - 7%';
      stopLoss = 'giảm 3%';
      description = 'ngân hàng quốc doanh hàng đầu, chỉ số an toàn cao nhưng tốc độ tăng trưởng giá thường chậm và chắc.';
    } else if (ticker === 'FPT') {
      signal = 'BUY';
      probability = '85%';
      rsi = '66.2';
      macd = 'đang phân kỳ dương mạnh mẽ trên khung ngày, củng cố xu hướng uptrend mạnh mẽ.';
      priceTarget = 'tăng 18% - 20%';
      stopLoss = 'giảm 6%';
      description = 'ông lớn công nghệ, tăng trưởng kép ổn định, động lực lớn từ xuất khẩu phần mềm và bán dẫn.';
    } else if (ticker === 'VND' || ticker === 'SSI') {
      signal = 'SELL';
      probability = '70%';
      rsi = '34.5';
      macd = 'đang phân kỳ âm và hướng xuống dưới mức 0, cho thấy áp lực bán ngắn hạn đang chiếm ưu thế.';
      priceTarget = 'hồi phục kỹ thuật nhẹ 2% - 4% trước khi test lại đáy cũ';
      stopLoss = 'nếu vượt lại MA20';
      description = 'nhóm chứng khoán nhạy cảm với thị trường, chịu áp lực chốt lời lớn khi thanh khoản sụt giảm.';
    }

    const emojiSignal = signal === 'BUY' ? 'BUY 🟢' : signal === 'SELL' ? 'SELL 🔴' : 'HOLD 🟡';

    responseText = `### 📊 TỔNG QUAN MÃ ${ticker}
[MOCK AI - CHẾ ĐỘ DEMO] Cổ phiếu **${ticker}** là một trong những đại diện nổi bật trên sàn chứng khoán Việt Nam. Doanh nghiệp được đánh giá có ${description}

### 📈 PHÂN TÍCH KỸ THUẬT
- **Xu hướng hiện tại**: ${signal === 'BUY' ? 'Uptrend ngắn hạn, đang tích lũy tốt trên đường MA20.' : signal === 'SELL' ? 'Downtrend ngắn hạn, giá nằm dưới đường MA20/MA50 và liên tục gặp áp lực cản.' : 'Sideway tích lũy trong biên độ hẹp.'}
- **RSI**: ${rsi} → Thể hiện trạng thái ${rsi > 60 ? 'khá mạnh nhưng chưa quá mua' : rsi < 40 ? 'yếu, tiệm cận vùng quá bán' : 'trung tính, đang chờ đợi dòng tiền kích hoạt'}.
- **MACD**: MACD ${macd}
- **MA20/50/200**: Giá đang tương tác với các đường trung bình động. ${signal === 'BUY' ? 'Các đường MA đang hướng lên nâng đỡ giá.' : signal === 'SELL' ? 'Giá bị chặn dưới các đường MA ngắn hạn.' : 'Các đường MA đan xen lẫn nhau.'}
- **Bollinger Bands**: Dải băng đang ${signal === 'HOLD' ? 'co thắt (Squeeze), báo hiệu chuẩn bị có biến động mạnh' : 'mở rộng ra hướng xu hướng hiện tại'}.
- **Volume**: Khối lượng giao dịch ${signal === 'BUY' ? 'cải thiện tốt hơn trung bình 20 phiên, cho thấy dòng tiền tham gia chủ động.' : 'sụt giảm, thể hiện sự thận trọng của nhà đầu tư.'}

### 🏢 PHÂN TÍCH CƠ BẢN
- Định giá P/E hiện tại ở mức hợp lý so với trung vị lịch sử của mã này.
- Biên lợi nhuận gộp duy trì ở mức ổn định trong 2 quý gần nhất.
- Động thái giao dịch của khối ngoại (ĐTNN) đang đóng vai trò nâng đỡ/áp lực lên giá cổ phiếu này.

### 🎯 KHUYẾN NGHỊ
**Tín hiệu**: ${emojiSignal}
**Xác suất thành công**: ${probability}
**Vùng giá vào**: Theo dõi quanh vùng hỗ trợ kỹ thuật gần nhất.
**Giá mục tiêu**: Biên độ ${priceTarget} trong 1 - 3 tháng tới.
**Stop-loss**: Khuyến nghị cắt lỗ nếu ${stopLoss} từ điểm mua.
**Tỷ lệ R:R**: 2.5:1

### ⚠️ RỦI RO
- Rủi ro điều chỉnh chung của chỉ số VNINDEX.
- Rủi ro thanh khoản ngành suy giảm hoặc các thông tin vĩ mô bất lợi đột xuất.

---
*Lưu ý: Phân tích trên được tạo ở Chế độ Demo offline (Mock AI) do hệ thống chưa có API Key. Tuy nhiên, các chỉ báo và biểu đồ kỹ thuật vẫn hiển thị dữ liệu thật.*`;
  }
  // 2. Phân tích tổng quan thị trường
  else if (lastMessageUpper.includes('PHÂN TÍCH TỔNG QUAN THỊ TRƯỜNG') || lastMessageUpper.includes('VNINDEX') || lastMessageUpper.includes('THỊ TRƯỜNG')) {
    responseText = `### 📊 PHÂN TÍCH THỊ TRƯỜNG CHUNG (VNINDEX)
[MOCK AI - CHẾ ĐỘ DEMO] Chỉ số VN-Index đang thể hiện những diễn biến tích lũy quanh vùng hỗ trợ tâm lý quan trọng.

1. **Xu hướng chung**: Thị trường đang trong pha sideway-up ngắn hạn, thanh khoản giữ ở mức trung bình.
2. **Nhóm ngành nổi bật**: 
   - Nhóm **Ngân hàng & Tài chính**: Giữ nhịp chỉ số.
   - Nhóm **Bất động sản / Khu công nghiệp**: Có sự phân hóa, một số mã có dòng tiền riêng thu hút.
   - Nhóm **Công nghệ / Xuất khẩu**: Giữ phong độ tăng trưởng tốt.
3. **Dự báo ngắn hạn**: Chỉ số kỳ vọng sẽ tiếp tục thử thách vùng kháng cự phía trên với biên độ dao động hẹp, cần thanh khoản cải thiện để bứt phá.
4. **Khuyến nghị đầu tư**: Duy trì tỷ trọng cổ phiếu ở mức an toàn (50-60%), hạn chế mua đuổi trong các phiên hưng phấn, ưu tiên gom các mã đầu ngành khi có nhịp điều chỉnh kỹ thuật.`;
  }
  // 3. Hỏi đáp chat thông thường
  else {
    // Thử check xem có mã chứng khoán nào được nhắc đến không
    const tickerMatch = lastMessage.match(/([A-Z]{3,4})/);
    if (tickerMatch) {
      const t = tickerMatch[1].toUpperCase();
      responseText = `Chào bạn! Tôi thấy bạn có hỏi về mã **${t}**. 
      
[MOCK AI - CHẾ ĐỘ DEMO] Về mặt kỹ thuật, mã **${t}** đang nằm trong vùng quan sát tích lũy. Chỉ số RSI của **${t}** dao động quanh vùng trung tính. Bạn có thể sử dụng tính năng **Phân tích** ở thanh bên để nhận báo cáo kỹ thuật chi tiết của mã này ở chế độ offline (Mock AI).

Để trò chuyện với trí tuệ nhân tạo Claude AI đầy đủ, bạn vui lòng cập nhật API Key thật trong mục **Cài đặt** nhé!`;
    } else {
      responseText = `Chào bạn! Tôi là trợ lý AI chuyên về Chứng khoán Việt Nam.

**Hiện tại ứng dụng chưa được cấu hình API Key thật**, nên tôi đang phản hồi bạn ở **Chế độ Demo (Mock AI)**. 

Nếu bạn muốn tôi phân tích một mã cụ thể ở chế độ demo này, bạn có thể gõ câu hỏi có chứa tên mã cổ phiếu (ví dụ: *FPT thế nào?*, *Mã HPG có tốt không?*) hoặc dùng tính năng **Phân tích** ở thanh bên.

Để kết nối với AI thật của Claude, bạn hãy cập nhật API Key (Anthropic, Gemini hoặc OpenAI) trong mục **Cài đặt** nhé!`;
    }
  }

  if (onStream) {
    const words = responseText.split(/(\s+)/);
    for (const word of words) {
      onStream(word);
      await new Promise((resolve) => setTimeout(resolve, Math.random() * 15 + 5));
    }
    return responseText;
  }

  return responseText;
};

/**
 * Gọi Anthropic Claude API qua backend proxy
 * @param {Object} params
 * @param {string} params.apiKey - Anthropic API key
 * @param {string} params.model - Model ID
 * @param {string} params.systemPrompt - System prompt
 * @param {Array} params.messages - Mảng messages [{role, content}]
 * @param {number} params.maxTokens - Số token tối đa
 * @param {Function} params.onStream - Callback nhận streaming (optional)
 * @returns {Promise<string>} - Nội dung phản hồi
 */
export const callClaude = async ({
  apiKey,
  model = 'claude-sonnet-4-5',
  systemPrompt,
  messages,
  maxTokens = 4096,
  onStream = null,
  googleSearch = false,
}) => {
  // Lấy key từ .env làm dự phòng nếu key truyền vào từ settings trống hoặc là placeholder
  let activeKey = apiKey;
  const envKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
  const isKeyEmptyOrPlaceholder = (key) => {
    if (!key) return true;
    const trimmed = key.trim();
    if (trimmed === '') return true;
    if (trimmed.length < 25) return true;
    if (trimmed.includes('DÁN_KEY')) return true;
    if (trimmed.includes('your-key')) return true;
    if (trimmed.includes('your_key')) return true;
    if (trimmed.includes('placeholder')) return true;
    return false;
  };

  if (isKeyEmptyOrPlaceholder(activeKey)) {
    if (!isKeyEmptyOrPlaceholder(envKey)) {
      activeKey = envKey;
    }
  }

  // Kiểm tra chế độ Mock Mode khi cả key truyền vào và key trong .env đều trống/placeholder
  const isMockMode = isKeyEmptyOrPlaceholder(activeKey);

  if (isMockMode) {
    return await handleMockResponse({ systemPrompt, messages, onStream });
  }

  const payload = {
    model,
    max_tokens: maxTokens,
    system: systemPrompt,
    messages,
    stream: !!onStream,
    google_search: googleSearch,
  };

  const headers = {
    'Content-Type': 'application/json',
  };
  if (activeKey) {
    headers['x-api-key'] = activeKey;
  }


  try {
    if (onStream) {
      const response = await fetch(`${BACKEND}/claude/analyze`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`API_ERROR_${response.status}: ${errText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');
      const decoder = new TextDecoder();
      let fullText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunkText = decoder.decode(value, { stream: true });
        const lines = chunkText.split('\n');
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const dataStr = line.slice(6).trim();
          if (dataStr === '[DONE]') continue;
          try {
            const json = JSON.parse(dataStr);
            if (json.type === 'content_block_delta' && json.delta?.type === 'text_delta') {
              const text = json.delta.text;
              fullText += text;
              onStream(text);
            }
          } catch {
            // bỏ qua dòng lỗi parse json
          }
        }
      }
      return fullText;
    } else {
      const response = await axios.post(`${BACKEND}/claude/analyze`, payload, { headers });
      if (response.data?.error) {
        throw new Error(response.data.error.message || 'Lỗi dịch vụ AI');
      }
      if (response.data?.content?.[0]?.text) {
        return response.data.content[0].text;
      }
      throw new Error('Invalid response format from proxy');
    }
  } catch (error) {
    if (error.response) {
      const status = error.response.status;
      const errorMsg = error.response.data?.error?.message || error.response.data?.detail || '';

      if (status === 401) {
        throw new Error('API_KEY_INVALID');
      } else if (status === 429) {
        throw new Error('RATE_LIMIT_EXCEEDED');
      } else if (status === 400) {
        throw new Error(`BAD_REQUEST: ${errorMsg}`);
      } else if (status === 529 || status === 503) {
        throw new Error('SERVICE_OVERLOADED');
      } else {
        throw new Error(`API_ERROR_${status}: ${errorMsg}`);
      }
    }

    if (error.message === 'Network Error') {
      throw new Error('NETWORK_ERROR');
    }

    throw error;
  }
};

/**
 * Kiểm tra tính hợp lệ của API Key đối với nhà cung cấp tương ứng qua backend
 */
export const testApiKey = async (apiKey) => {
  try {
    const res = await fetch(`${BACKEND}/claude/test-key`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    return !!data.ok;
  } catch {
    return false;
  }
};

/**
 * Parse lỗi từ Claude service thành thông báo tiếng Việt
 */
export const parseClaudeError = (error) => {
  const msg = error.message || '';

  if (msg === 'API_KEY_MISSING') {
    return 'Chưa cấu hình API Key. Vui lòng vào Cài đặt để nhập key.';
  }
  if (msg === 'API_KEY_INVALID') {
    return 'API Key không hợp lệ. Vui lòng kiểm tra lại trong Cài đặt.';
  }
  if (msg === 'RATE_LIMIT_EXCEEDED') {
    return 'Vượt quá giới hạn gọi API (20 req/phút). Vui lòng thử lại sau vài phút.';
  }
  if (msg === 'NETWORK_ERROR') {
    return 'Lỗi kết nối mạng hoặc Backend đang đóng. Vui lòng khởi động backend FastAPI.';
  }
  if (msg === 'SERVICE_OVERLOADED') {
    return 'Dịch vụ Claude đang quá tải. Thử lại sau vài giây.';
  }
  if (msg.startsWith('BAD_REQUEST')) {
    return `Yêu cầu không hợp lệ: ${msg.replace('BAD_REQUEST: ', '')}`;
  }

  return `Lỗi hệ thống: ${msg}`;
};

