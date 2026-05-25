// ===== HEADER COMPONENT =====

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Bell, Wifi, WifiOff, Key } from 'lucide-react';
import useAppStore from '../../store/appStore';
import { useNavigate } from 'react-router-dom';

// Kiểm tra thị trường đang mở (9:00 - 15:15 ngày T2-T6 giờ VN)
const isMarketOpen = () => {
  const now = new Date();
  const day = now.getDay(); // 0=CN, 1=T2...6=T7
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const timeInMinutes = hours * 60 + minutes;
  // GTM+7: 9:00 = 540, 15:15 = 915
  return day >= 1 && day <= 5 && timeInMinutes >= 540 && timeInMinutes <= 915;
};

const Header = ({ title = 'VN Stock AI Analyzer' }) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [marketOpen, setMarketOpen] = useState(isMarketOpen());
  const settings = useAppStore((s) => s.settings);
  const navigate = useNavigate();

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      setCurrentTime(now);
      setMarketOpen(isMarketOpen());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const hasApiKey = (settings.apiKey && !settings.apiKey.includes('DÁN_KEY_CỦA_BẠN_VÀO_ĐÂY') && settings.apiKey.trim() !== '' && settings.apiKey !== 'sk-ant-api03-' && settings.apiKey !== 'your_key_here') || 
                    (import.meta.env.VITE_ANTHROPIC_API_KEY && !import.meta.env.VITE_ANTHROPIC_API_KEY.includes('DÁN_KEY_CỦA_BẠN_VÀO_ĐÂY') && import.meta.env.VITE_ANTHROPIC_API_KEY.trim() !== '' && import.meta.env.VITE_ANTHROPIC_API_KEY !== 'sk-ant-api03-' && import.meta.env.VITE_ANTHROPIC_API_KEY !== 'your_key_here');

  return (
    <header
      className="flex items-center justify-between px-6 py-3 flex-shrink-0"
      style={{
        background: 'rgba(13, 27, 42, 0.95)',
        borderBottom: '1px solid rgba(79, 195, 247, 0.1)',
        backdropFilter: 'blur(12px)',
        height: 60,
      }}
    >
      {/* Left: Title */}
      <div className="flex items-center gap-3">
        <h1 className="text-base font-semibold text-slate-200">{title}</h1>
      </div>

      {/* Right: Status + Time */}
      <div className="flex items-center gap-4">
        {/* API Key Warning */}
        {!hasApiKey && (
          <button
            onClick={() => navigate('/settings')}
            className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg cursor-pointer border-none animate-pulse-cyan"
            style={{ background: 'rgba(255,179,0,0.1)', color: '#ffb300', border: '1px solid rgba(255,179,0,0.3)' }}
          >
            <Key size={12} />
            Chưa có API Key
          </button>
        )}

        {/* Market Status */}
        <div
          className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg font-medium"
          style={{
            background: marketOpen ? 'rgba(0, 230, 118, 0.1)' : 'rgba(255, 82, 82, 0.1)',
            color: marketOpen ? '#00e676' : '#ff5252',
            border: `1px solid ${marketOpen ? 'rgba(0,230,118,0.3)' : 'rgba(255,82,82,0.3)'}`,
          }}
        >
          <div
            className="rounded-full"
            style={{
              width: 6,
              height: 6,
              background: marketOpen ? '#00e676' : '#ff5252',
              animation: marketOpen ? 'pulse-cyan 2s infinite' : 'none',
            }}
          />
          {marketOpen ? 'Thị trường đang mở' : 'Thị trường đóng cửa'}
        </div>

        {/* Clock */}
        <div className="font-num text-sm text-cyan-400 tabular-nums" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
          {format(currentTime, 'HH:mm:ss', { locale: vi })}
        </div>
        <div className="text-xs text-slate-500">
          {format(currentTime, 'dd/MM/yyyy', { locale: vi })}
        </div>
      </div>
    </header>
  );
};

export default Header;
