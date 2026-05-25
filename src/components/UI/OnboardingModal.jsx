import React, { useState, useEffect } from 'react';
import useAppStore from '../../store/appStore';

export function OnboardingModal() {
  const settings = useAppStore((s) => s.settings);
  const [step, setStep] = useState(1);
  const [dismissed, setDismissed] = useState(
    () => !!localStorage.getItem('vn-stock-onboarding-done')
  );

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') dismiss();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (dismissed || settings.apiKey) return null;

  const dismiss = () => {
    localStorage.setItem('vn-stock-onboarding-done', '1');
    setDismissed(true);
  };

  const steps = [
    {
      emoji: '🚀',
      title: 'Chào mừng đến VN Stock AI',
      desc: 'Ứng dụng phân tích chứng khoán Việt Nam chuyên nghiệp với Claude AI — Tích hợp đồ thị kỹ thuật thời gian thực và sức mạnh suy luận từ Anthropic.',
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{
            background: 'rgba(79,195,247,0.08)',
            border: '1px solid rgba(79,195,247,0.2)',
            borderRadius: 10,
            padding: '12px 14px',
          }}>
            <div style={{ fontSize: 12, color: '#4fc3f7', fontWeight: 600, marginBottom: 6 }}>
              🔒 Bảo mật API Key tuyệt đối
            </div>
            <p style={{ fontSize: 12, color: '#94a3b8', margin: 0, lineHeight: 1.7 }}>
              Khác với phiên bản cũ, API Key của bạn hiện được lưu <strong style={{ color: '#e2e8f0' }}>ở phía Backend</strong> (file <code style={{ color: '#4fc3f7' }}>backend/.env</code>), đảm bảo không bao giờ bị lộ ra ngoài trình duyệt.
            </p>
          </div>
          <div style={{
            background: 'rgba(0, 230, 118, 0.08)',
            border: '1px solid rgba(0, 230, 118, 0.2)',
            borderRadius: 10,
            padding: '12px 14px',
          }}>
            <div style={{ fontSize: 12, color: '#00e676', fontWeight: 600, marginBottom: 6 }}>
              📶 Hỗ trợ chế độ ngoại tuyến
            </div>
            <p style={{ fontSize: 12, color: '#94a3b8', margin: 0, lineHeight: 1.7 }}>
              Nếu chưa khởi động FastAPI backend, ứng dụng sẽ tự động chuyển sang chế độ nạp dữ liệu mô phỏng với đầy đủ nến và chỉ báo kỹ thuật.
            </p>
          </div>
        </div>
      ),
      primary: { label: 'Tiếp tục →', action: () => setStep(2) },
      secondary: { label: 'Bỏ qua', action: dismiss },
    },
    {
      emoji: '⚙️',
      title: 'Khởi chạy Backend',
      desc: 'Để sử dụng dữ liệu thực và phân tích Claude AI, vui lòng khởi chạy backend FastAPI:',
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{
            background: '#070f19',
            borderRadius: 8,
            padding: '12px 14px',
            fontSize: 12,
            fontFamily: 'JetBrains Mono, monospace',
            color: '#4fc3f7',
            lineHeight: 1.8,
            border: '1px solid rgba(79, 195, 247, 0.1)',
          }}>
            <span style={{ color: '#64748b' }}># 1. Tạo file cấu hình .env</span><br />
            copy backend\.env.example backend\.env<br />
            <br />
            <span style={{ color: '#64748b' }}># 2. Điền khóa Anthropic API Key vào .env</span><br />
            <span style={{ color: '#94a3b8' }}>ANTHROPIC_API_KEY=sk-ant-api03-...</span><br />
            <br />
            <span style={{ color: '#64748b' }}># 3. Khởi động máy chủ</span><br />
            cd backend<br />
            venv\Scripts\activate<br />
            uvicorn app.main:app --reload --port 8000
          </div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 12px',
            borderRadius: 8,
            background: 'rgba(255,179,0,0.08)',
            border: '1px solid rgba(255,179,0,0.2)',
          }}>
            <span style={{ fontSize: 14 }}>💡</span>
            <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>
              Ứng dụng tự động chạy cache trong bộ nhớ (in-memory) nếu Redis chưa mở!
            </p>
          </div>
        </div>
      ),
      primary: { label: 'Bắt đầu ngay ✓', action: dismiss },
      secondary: { label: '← Quay lại', action: () => setStep(1) },
    },
  ];

  const current = steps[step - 1];

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(5,13,23,0.85)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: 24,
      backdropFilter: 'blur(6px)',
    }}>
      <div style={{
        background: 'linear-gradient(135deg, #0d1b2a 0%, #0a1628 100%)',
        borderRadius: 18,
        padding: '28px 28px 24px',
        maxWidth: 480,
        width: '100%',
        border: '1px solid rgba(79,195,247,0.15)',
        boxShadow: '0 30px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.03)',
      }}>
        {/* Step progress dots */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
          {steps.map((_, i) => (
            <div key={i} style={{
              flex: 1,
              height: 3,
              borderRadius: 3,
              transition: 'background 0.3s',
              background: i < step ? '#4fc3f7' : 'rgba(255,255,255,0.08)',
            }} />
          ))}
        </div>

        {/* Top Info */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>{current.emoji}</div>
          <h2 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 8px', color: '#f1f5f9' }}>
            {current.title}
          </h2>
          <p style={{ fontSize: 13, color: '#64748b', margin: 0, lineHeight: 1.6 }}>
            {current.desc}
          </p>
        </div>

        {/* Render content block */}
        <div style={{ marginBottom: 22 }}>{current.content}</div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={current.secondary.action}
            style={{
              flex: 1,
              padding: '11px 0',
              borderRadius: 10,
              border: '1px solid rgba(255,255,255,0.08)',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 500,
              background: 'transparent',
              color: '#64748b',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.color = '#94a3b8';
              e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.color = '#64748b';
              e.currentTarget.style.background = 'transparent';
            }}
          >
            {current.secondary.label}
          </button>
          
          <button
            onClick={current.primary.action}
            style={{
              flex: 2,
              padding: '11px 0',
              borderRadius: 10,
              border: 'none',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 600,
              background: 'linear-gradient(135deg, #0ea5e9, #4fc3f7)',
              color: '#050d17',
              boxShadow: '0 4px 15px rgba(79,195,247,0.25)',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.opacity = '0.9';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.opacity = '1';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            {current.primary.label}
          </button>
        </div>

        {/* Keyboard Helper */}
        <p style={{ textAlign: 'center', fontSize: 11, color: '#334155', margin: '14px 0 0' }}>
          Bước {step}/{steps.length} · Nhấn <kbd style={{
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 3,
            padding: '1px 5px',
            fontFamily: 'monospace',
            fontSize: 10,
          }}>Esc</kbd> để đóng nhanh
        </p>
      </div>
    </div>
  );
}

export default OnboardingModal;
