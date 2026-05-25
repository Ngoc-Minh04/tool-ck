// ===== SIGNAL BADGE =====

const SIGNAL_CONFIG = {
  BUY: { label: '📈 MUA', color: '#00e676', bg: 'rgba(0,230,118,0.1)', border: 'rgba(0,230,118,0.4)' },
  HOLD: { label: '⏸️ NẮNG GIỮ', color: '#ffb300', bg: 'rgba(255,179,0,0.1)', border: 'rgba(255,179,0,0.4)' },
  SELL: { label: '📉 BÁN', color: '#ff5252', bg: 'rgba(255,82,82,0.1)', border: 'rgba(255,82,82,0.4)' },
};

// Tự động detect signal từ text
export const detectSignal = (text) => {
  if (!text) return null;
  const upper = text.toUpperCase();
  if (upper.includes('BUY') || upper.includes('MUA') || upper.includes('🟢')) return 'BUY';
  if (upper.includes('SELL') || upper.includes('BÁN') || upper.includes('🔴')) return 'SELL';
  if (upper.includes('HOLD') || upper.includes('NẮM GIỮ') || upper.includes('🟡')) return 'HOLD';
  return null;
};

const SignalBadge = ({ signal, size = 'md', showLabel = true }) => {
  if (!signal) return null;
  const config = SIGNAL_CONFIG[signal.toUpperCase()] || SIGNAL_CONFIG.HOLD;

  const sizes = {
    sm: { padding: '4px 10px', fontSize: 11 },
    md: { padding: '6px 14px', fontSize: 13 },
    lg: { padding: '10px 20px', fontSize: 16 },
  };

  return (
    <span
      className="inline-flex items-center font-bold rounded-lg"
      style={{
        ...sizes[size],
        color: config.color,
        background: config.bg,
        border: `1px solid ${config.border}`,
        boxShadow: `0 0 12px ${config.bg}`,
        letterSpacing: '0.05em',
      }}
    >
      {showLabel ? config.label : signal.toUpperCase()}
    </span>
  );
};

export default SignalBadge;
