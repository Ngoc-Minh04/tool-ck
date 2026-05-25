import { fmtPrice } from '../../utils/formatters'

interface Metric { label: string; value: any; color?: string; prefix?: string; suffix?: string }

function Cell({ label, value, color, suffix }: Metric) {
  return (
    <div className="bg-white/[0.03] rounded-xl p-3 border border-white/8">
      <div className="text-xs text-slate-500 mb-1">{label}</div>
      <div className={`font-mono font-semibold text-sm ${color || 'text-white'}`}>
        {value != null ? `${value}${suffix || ''}` : <span className="text-slate-700">N/A</span>}
      </div>
    </div>
  )
}

export default function MetricsRow({ technicals, info }: { technicals: any; info: any }) {
  if (!technicals && !info) return null

  const rsiColor = !technicals?.rsi ? '' :
    technicals.rsi > 70 ? 'text-red-400' :
    technicals.rsi < 30 ? 'text-green-400' : 'text-yellow-400'

  const macdColor = !technicals?.macd_hist ? '' :
    technicals.macd_hist > 0 ? 'text-green-400' : 'text-red-400'

  const trendColor = technicals?.trend === 'uptrend' ? 'text-green-400' :
    technicals?.trend === 'downtrend' ? 'text-red-400' : 'text-yellow-400'

  return (
    <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
      <Cell label="RSI(14)" value={technicals?.rsi?.toFixed(1)} color={rsiColor} />
      <Cell label="MACD Hist" value={technicals?.macd_hist?.toFixed(3)} color={macdColor} />
      <Cell label="MA20" value={technicals?.ma20?.toFixed(0)} />
      <Cell label="MA50" value={technicals?.ma50?.toFixed(0)} />
      <Cell label="Xu hướng" value={technicals?.trend} color={trendColor} />
      <Cell label="P/E" value={info?.pe?.toFixed(1)} />
      <Cell label="ROE" value={info?.roe?.toFixed(1)} suffix="%" />
      <Cell label="Vốn hóa" value={info?.market_cap ? (info.market_cap / 1e9).toFixed(0) + ' tỷ' : null} />
    </div>
  )
}
