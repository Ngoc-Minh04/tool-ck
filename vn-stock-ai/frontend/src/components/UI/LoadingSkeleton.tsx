export function LoadingSkeleton({ rows = 3, className = '' }: { rows?: number; className?: string }) {
  return (
    <div className={`space-y-3 animate-pulse ${className}`}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-4 bg-white/6 rounded-lg" style={{ width: `${85 - i * 10}%` }} />
      ))}
    </div>
  )
}

export function CardSkeleton() {
  return (
    <div className="bg-[#0d1b2a] rounded-2xl border border-white/10 p-5 animate-pulse space-y-4">
      <div className="flex justify-between">
        <div className="h-5 bg-white/8 rounded w-24" />
        <div className="h-5 bg-white/8 rounded w-16" />
      </div>
      <div className="h-48 bg-white/5 rounded-xl" />
      <div className="space-y-2">
        <div className="h-3 bg-white/6 rounded w-full" />
        <div className="h-3 bg-white/6 rounded w-4/5" />
        <div className="h-3 bg-white/6 rounded w-3/5" />
      </div>
    </div>
  )
}

export function ChartSkeleton({ height = 300 }: { height?: number }) {
  return (
    <div className="animate-pulse bg-white/4 rounded-xl" style={{ height }} />
  )
}
