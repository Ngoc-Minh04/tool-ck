import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell as ReCell
} from 'recharts'

interface Props {
  data: any[]
  height?: number
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload
  if (!d) return null
  const isUp = d.close >= d.open
  return (
    <div className="bg-[#0a1628] border border-white/15 rounded-xl p-3 text-xs space-y-1 shadow-xl">
      <p className="text-slate-400 mb-1">{d.date}</p>
      <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
        <span className="text-slate-500">Mở</span><span className="text-right font-mono">{d.open?.toLocaleString('vi-VN')}</span>
        <span className="text-slate-500">Cao</span><span className="text-right font-mono text-green-400">{d.high?.toLocaleString('vi-VN')}</span>
        <span className="text-slate-500">Thấp</span><span className="text-right font-mono text-red-400">{d.low?.toLocaleString('vi-VN')}</span>
        <span className="text-slate-500">Đóng</span><span className={`text-right font-mono font-bold ${isUp ? 'text-green-400' : 'text-red-400'}`}>{d.close?.toLocaleString('vi-VN')}</span>
        <span className="text-slate-500">Vol</span><span className="text-right font-mono text-cyan-400">{(d.volume / 1e6).toFixed(1)}M</span>
      </div>
    </div>
  )
}

export default function CandlestickChart({ data, height = 380 }: Props) {
  if (!data?.length) return (
    <div className="flex items-center justify-center h-48 text-slate-600">Chưa có dữ liệu</div>
  )

  // Recharts candlestick: encode as bar with custom shape
  const chartData = data.map(d => ({
    ...d,
    // for OHLC bars: low base, body = |close-open|, wick values
    low: d.low,
    high: d.high,
    open: d.open,
    close: d.close,
    bodyLow: Math.min(d.open, d.close),
    bodyHigh: Math.max(d.open, d.close),
    isUp: d.close >= d.open,
  }))

  const CandleBar = (props: any) => {
    const { x, y, width, height: h, payload } = props
    if (!payload) return null
    const { open, close, high, low, isUp } = payload
    const color = isUp ? '#22c55e' : '#ef4444'
    const scaleY = props.background?.height / (props.yAxis?.domain?.[1] - props.yAxis?.domain?.[0] || 1)
    return <g />  // simplified — recharts doesn't natively do OHLC; use ComposedChart lines
  }

  // Use simplified line-based candlestick with MA overlays
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis
            dataKey="date"
            tick={{ fill: '#64748b', fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            interval={Math.floor(chartData.length / 8)}
            tickFormatter={v => v?.slice(5)}
          />
          <YAxis
            yAxisId="price"
            orientation="right"
            tick={{ fill: '#64748b', fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={v => (v / 1000).toFixed(0) + 'k'}
            domain={['auto', 'auto']}
          />
          <YAxis
            yAxisId="vol"
            orientation="left"
            tick={{ fill: '#64748b', fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={v => (v / 1e6).toFixed(0) + 'M'}
            width={45}
          />
          <Tooltip content={<CustomTooltip />} />
          {/* Volume bars */}
          <Bar yAxisId="vol" dataKey="volume" maxBarSize={6} radius={[2, 2, 0, 0]} opacity={0.4}>
            {chartData.map((d, i) => (
              <ReCell key={i} fill={d.isUp ? '#22c55e' : '#ef4444'} />
            ))}
          </Bar>
          {/* Close price line */}
          <Line yAxisId="price" type="monotone" dataKey="close" stroke="#4fc3f7" dot={false}
            strokeWidth={1.5} />
          {/* MA lines */}
          <Line yAxisId="price" type="monotone" dataKey="ma20" stroke="#f59e0b" dot={false}
            strokeWidth={1} strokeDasharray="3 3" opacity={0.8} />
          <Line yAxisId="price" type="monotone" dataKey="ma50" stroke="#a78bfa" dot={false}
            strokeWidth={1} strokeDasharray="5 3" opacity={0.7} />
          <Line yAxisId="price" type="monotone" dataKey="ma200" stroke="#f87171" dot={false}
            strokeWidth={1} strokeDasharray="8 4" opacity={0.6} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
