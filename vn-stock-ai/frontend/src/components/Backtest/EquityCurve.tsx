import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'

export default function EquityCurve({ data }: { data: any[] }) {
  if (!data?.length) return null
  const initial = data[0]?.equity || 0
  return (
    <div className="bg-[#0a1628]/60 rounded-xl p-3">
      <div className="text-xs text-slate-500 mb-2 font-medium">📈 Đường vốn (Equity Curve)</div>
      <ResponsiveContainer width="100%" height={180}>
        <AreaChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#4fc3f7" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#4fc3f7" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={false}
            interval={Math.floor(data.length / 6)} tickFormatter={v => v?.slice(5)} />
          <YAxis tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={false} width={60}
            tickFormatter={v => (v / 1e6).toFixed(0) + 'M'} />
          <Tooltip
            contentStyle={{ background: '#0a1628', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 11 }}
            formatter={(v: any) => [(Number(v) / 1e6).toFixed(1) + ' triệu', 'Vốn']}
          />
          <ReferenceLine y={initial} stroke="rgba(255,255,255,0.15)" strokeDasharray="4 2" />
          <Area type="monotone" dataKey="equity" stroke="#4fc3f7" strokeWidth={2}
            fill="url(#equityGrad)" dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
