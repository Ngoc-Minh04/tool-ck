import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts'

export default function IndicatorPanel({ data }: { data: any[] }) {
  if (!data?.length) return null
  return (
    <div className="space-y-3">
      {/* RSI Panel */}
      <div className="bg-[#0a1628]/60 rounded-xl p-3">
        <div className="text-xs text-slate-500 mb-2 font-medium">RSI (14)</div>
        <ResponsiveContainer width="100%" height={80}>
          <ComposedChart data={data} margin={{ top: 2, right: 10, left: 0, bottom: 2 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis dataKey="date" hide />
            <YAxis domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={false} width={30} />
            <Tooltip
              contentStyle={{ background: '#0a1628', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 11 }}
              labelStyle={{ color: '#64748b' }}
              formatter={(v: any) => [Number(v).toFixed(1), 'RSI']}
            />
            <ReferenceLine y={70} stroke="rgba(239,68,68,0.4)" strokeDasharray="4 2" />
            <ReferenceLine y={30} stroke="rgba(34,197,94,0.4)" strokeDasharray="4 2" />
            <ReferenceLine y={50} stroke="rgba(255,255,255,0.1)" strokeDasharray="2 2" />
            <Line type="monotone" dataKey="rsi" stroke="#4fc3f7" dot={false} strokeWidth={1.5} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* MACD Panel */}
      <div className="bg-[#0a1628]/60 rounded-xl p-3">
        <div className="text-xs text-slate-500 mb-2 font-medium">MACD (12,26,9)</div>
        <ResponsiveContainer width="100%" height={80}>
          <ComposedChart data={data} margin={{ top: 2, right: 10, left: 0, bottom: 2 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis dataKey="date" hide />
            <YAxis tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={false} width={42}
              tickFormatter={v => v.toFixed(0)} />
            <Tooltip
              contentStyle={{ background: '#0a1628', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 11 }}
              formatter={(v: any, n: string) => [Number(v).toFixed(3), n]}
            />
            <ReferenceLine y={0} stroke="rgba(255,255,255,0.15)" />
            <Bar dataKey="macd_hist" name="Histogram" radius={[1, 1, 0, 0]}
              fill="#4fc3f7" opacity={0.7}
              label={false}
            />
            <Line type="monotone" dataKey="macd" name="MACD" stroke="#4fc3f7" dot={false} strokeWidth={1.5} />
            <Line type="monotone" dataKey="macd_signal" name="Signal" stroke="#f59e0b" dot={false}
              strokeWidth={1} strokeDasharray="3 2" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
