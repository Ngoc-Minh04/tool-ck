const sig: Record<string, { label: string; color: string; bg: string; border: string }> = {
  BUY:  { label: 'MUA', color: '#22c55e', bg: 'rgba(34,197,94,0.12)', border: 'rgba(34,197,94,0.35)' },
  SELL: { label: 'BÁN', color: '#ef4444', bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.35)' },
  HOLD: { label: 'GIỮ', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.35)' },
  UNKNOWN: { label: '—', color: '#94a3b8', bg: 'rgba(148,163,184,0.08)', border: 'rgba(148,163,184,0.2)' },
}

export default function SignalBadge({ signal, size = 'md' }: { signal: string; size?: 'sm' | 'md' | 'lg' }) {
  const s = sig[signal] || sig.UNKNOWN
  const px = size === 'sm' ? 'px-2 py-0.5 text-xs' : size === 'lg' ? 'px-5 py-2 text-lg font-bold' : 'px-3 py-1 text-sm font-semibold'
  return (
    <span className={`inline-flex items-center rounded-full border tracking-wider ${px}`}
      style={{ color: s.color, background: s.bg, borderColor: s.border }}>
      {s.label}
    </span>
  )
}
