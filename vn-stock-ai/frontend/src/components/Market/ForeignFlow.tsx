import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

interface ForeignItem { ticker: string; buy_val?: number; sell_val?: number; net_val?: number; buy_value?: number; sell_value?: number; net_value?: number }

export default function ForeignFlow({ data }: { data: ForeignItem[] }) {
  if (!data?.length) return <div className="text-slate-600 text-center py-8 text-sm">Không có dữ liệu ĐTNN</div>

  const chartData = data.map(d => ({
    ticker: d.ticker,
    net: Number(d.net_val || d.net_value || 0) / 1e9,
    buy: Number(d.buy_val || d.buy_value || 0) / 1e9,
    sell: Number(d.sell_val || d.sell_value || 0) / 1e9,
  })).sort((a, b) => b.net - a.net)

  return (
    <div className="bg-[#0d1b2a] rounded-xl border border-white/10 p-4">
      <div className="flex justify-between items-center mb-4">
        <div className="text-sm font-semibold text-white">💰 Dòng tiền khối ngoại</div>
        <div className="text-xs text-slate-500">Đơn vị: tỷ VND</div>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={chartData} margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
          <XAxis dataKey="ticker" tick={{ fill: '#64748b', fontSize: 11 }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={false} width={40}
            tickFormatter={v => v.toFixed(0)} />
          <Tooltip
            contentStyle={{ background: '#0a1628', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 11 }}
            formatter={(v: any) => [Number(v).toFixed(1) + ' tỷ']}
          />
          <Bar dataKey="net" name="Mua ròng" radius={[3, 3, 0, 0]}>
            {chartData.map((d, i) => (
              <Cell key={i} fill={d.net >= 0 ? '#22c55e' : '#ef4444'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      {/* Table */}
      <div className="mt-3 space-y-1">
        {chartData.map((d, i) => (
          <div key={i} className="flex items-center justify-between text-xs py-1 border-b border-white/5 last:border-0">
            <span className="font-mono font-bold text-white w-10">{d.ticker}</span>
            <span className="text-green-400/80">+{d.buy.toFixed(1)}B</span>
            <span className="text-red-400/80">-{d.sell.toFixed(1)}B</span>
            <span className={`font-bold w-16 text-right ${d.net >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {d.net >= 0 ? '+' : ''}{d.net.toFixed(1)}B
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
