import { useState } from 'react'
import { useAppStore } from '@/store/appStore'

export function OnboardingModal() {
  const { apiKey } = useAppStore()
  const [step, setStep] = useState(1)
  // Hiện modal chỉ khi lần đầu vào (chưa có apiKey và chưa từng bỏ qua)
  const [dismissed, setDismissed] = useState(
    () => !!localStorage.getItem('vn-stock-onboarding-done')
  )

  if (dismissed || apiKey) return null

  const dismiss = () => {
    localStorage.setItem('vn-stock-onboarding-done', '1')
    setDismissed(true)
  }

  const steps = [
    {
      emoji: '🚀',
      title: 'Chào mừng đến VN Stock AI',
      desc: 'Ứng dụng phân tích chứng khoán Việt Nam với Claude AI — dữ liệu thực từ vnstock, phân tích thông minh từ Anthropic Claude.',
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{
            background: 'rgba(79,195,247,0.08)', border: '1px solid rgba(79,195,247,0.2)',
            borderRadius: 10, padding: '12px 14px',
          }}>
            <div style={{ fontSize: 12, color: '#4fc3f7', fontWeight: 600, marginBottom: 6 }}>
              🔒 Bảo mật API Key
            </div>
            <p style={{ fontSize: 12, color: '#94a3b8', margin: 0, lineHeight: 1.7 }}>
              API Key của bạn được lưu <strong style={{ color: '#e2e8f0' }}>trong backend</strong> (file <code style={{ color: '#4fc3f7' }}>backend/.env</code>), không bao giờ gửi ra ngoài từ trình duyệt.
            </p>
          </div>
          <div style={{
            background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)',
            borderRadius: 10, padding: '12px 14px',
          }}>
            <div style={{ fontSize: 12, color: '#22c55e', fontWeight: 600, marginBottom: 6 }}>
              📶 Offline Mode
            </div>
            <p style={{ fontSize: 12, color: '#94a3b8', margin: 0, lineHeight: 1.7 }}>
              Nếu backend chưa chạy, app tự động dùng dữ liệu mô phỏng với đầy đủ chart và indicator.
            </p>
          </div>
        </div>
      ),
      primary: { label: 'Bắt đầu →', action: () => setStep(2) },
      secondary: { label: 'Bỏ qua', action: dismiss },
    },
    {
      emoji: '⚙️',
      title: 'Cài đặt Backend',
      desc: 'Để sử dụng dữ liệu thực và phân tích Claude AI, cần chạy backend FastAPI:',
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{
            background: 'rgba(0,0,0,0.4)', borderRadius: 8, padding: '12px 14px',
            fontSize: 12, fontFamily: 'monospace', color: '#4fc3f7', lineHeight: 2,
          }}>
            <span style={{ color: '#64748b' }}># 1. Tạo file .env từ mẫu</span><br />
            copy backend\.env.example backend\.env<br />
            <br />
            <span style={{ color: '#64748b' }}># 2. Điền API key vào .env</span><br />
            <span style={{ color: '#94a3b8' }}>ANTHROPIC_API_KEY=sk-ant-api03-...</span><br />
            <br />
            <span style={{ color: '#64748b' }}># 3. Khởi động backend</span><br />
            cd backend<br />
            venv\Scripts\uvicorn app.main:app --reload
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 12px', borderRadius: 8,
            background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)',
          }}>
            <span style={{ fontSize: 14 }}>💡</span>
            <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>
              Không cần Redis — app tự dùng in-memory cache nếu Redis chưa chạy.
            </p>
          </div>
        </div>
      ),
      primary: { label: 'Bắt đầu sử dụng ✓', action: dismiss },
      secondary: { label: '← Quay lại', action: () => setStep(1) },
    },
  ]

  const current = steps[step - 1]

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(5,13,23,0.85)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 9999, padding: 24, backdropFilter: 'blur(6px)',
    }}>
      <div style={{
        background: 'linear-gradient(135deg, #0d1b2a 0%, #0a1628 100%)',
        borderRadius: 18, padding: '28px 28px 24px',
        maxWidth: 460, width: '100%',
        border: '1px solid rgba(79,195,247,0.15)',
        boxShadow: '0 30px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.03)',
      }}>
        {/* Step dots */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
          {steps.map((_, i) => (
            <div key={i} style={{
              flex: 1, height: 3, borderRadius: 3, transition: 'background 0.3s',
              background: i < step ? '#4fc3f7' : 'rgba(255,255,255,0.08)',
            }} />
          ))}
        </div>

        {/* Header */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>{current.emoji}</div>
          <h2 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 8px', color: '#f1f5f9' }}>
            {current.title}
          </h2>
          <p style={{ fontSize: 13, color: '#64748b', margin: 0, lineHeight: 1.6 }}>
            {current.desc}
          </p>
        </div>

        {/* Content */}
        <div style={{ marginBottom: 22 }}>{current.content}</div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={current.secondary.action}
            style={{
              flex: 1, padding: '11px 0', borderRadius: 10,
              border: '1px solid rgba(255,255,255,0.08)',
              cursor: 'pointer', fontSize: 13, fontWeight: 500,
              background: 'transparent', color: '#64748b',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.color = '#94a3b8'
              e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.color = '#64748b'
              e.currentTarget.style.background = 'transparent'
            }}
          >
            {current.secondary.label}
          </button>
          <button
            onClick={current.primary.action}
            style={{
              flex: 2, padding: '11px 0', borderRadius: 10, border: 'none',
              cursor: 'pointer', fontSize: 13, fontWeight: 600,
              background: 'linear-gradient(135deg, #0ea5e9, #4fc3f7)',
              color: '#050d17', boxShadow: '0 4px 15px rgba(79,195,247,0.25)',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.opacity = '0.9'; e.currentTarget.style.transform = 'translateY(-1px)' }}
            onMouseLeave={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'translateY(0)' }}
          >
            {current.primary.label}
          </button>
        </div>

        {/* Footer */}
        <p style={{ textAlign: 'center', fontSize: 11, color: '#334155', margin: '14px 0 0' }}>
          Bước {step}/{steps.length} · Nhấn <kbd style={{
            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 3, padding: '1px 5px', fontFamily: 'monospace', fontSize: 10,
          }}>Esc</kbd> để bỏ qua
        </p>
      </div>
    </div>
  )
}
