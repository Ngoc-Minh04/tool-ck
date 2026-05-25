import EquityCurve from './EquityCurve'

interface Result {
  ticker: string; strategy: string; total_return: number; sharpe_ratio: number
  max_drawdown: number; win_rate: number; total_trades: number; equity_curve: any[]
}

function StatCard({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="bg-white/[0.03] rounded-xl p-3 border border-white/8 text-center">
      <div className="text-xs text-slate-500 mb-1">{label}</div>
      <div className={`text-lg font-bold font-mono ${color || 'text-white'}`}>{value}</div>
    </div>
  )
}

export default function BacktestResult({ result }: { result: Result }) {
  const retColor = result.total_return >= 0 ? 'text-green-400' : 'text-red-400'
  const STRATEGY_NAMES: Record<string, string> = { ma_cross: 'MA Cross', rsi: 'RSI Mean Rev.', macd: 'MACD Signal' }

  return (
    <div className="bg-[#0d1b2a] rounded-2xl border border-white/10 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold text-white">
            Kết quả: <span className="text-cyan-400 font-mono">{result.ticker}</span>
            <span className="text-slate-500 ml-2">· {STRATEGY_NAMES[result.strategy] || result.strategy}</span>
          </div>
        </div>
        <div className={`text-2xl font-bold font-mono ${retColor}`}>
          {result.total_return >= 0 ? '+' : ''}{(result.total_return * 100).toFixed(1)}%
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <StatCard label="Tổng lợi nhuận" value={`${result.total_return >= 0 ? '+' : ''}${(result.total_return * 100).toFixed(1)}%`} color={retColor} />
        <StatCard label="Sharpe Ratio" value={result.sharpe_ratio?.toFixed(2) || 'N/A'}
          color={result.sharpe_ratio > 1 ? 'text-green-400' : result.sharpe_ratio > 0 ? 'text-yellow-400' : 'text-red-400'} />
        <StatCard label="Max Drawdown" value={`${(result.max_drawdown * 100).toFixed(1)}%`} color="text-red-400" />
        <StatCard label="Tỷ lệ thắng" value={`${(result.win_rate * 100).toFixed(0)}%`}
          color={result.win_rate > 0.5 ? 'text-green-400' : 'text-red-400'} />
      </div>

      <div className="text-xs text-slate-500 text-center">
        Tổng số lệnh: <span className="text-white font-semibold">{result.total_trades}</span>
      </div>

      {result.equity_curve?.length > 0 && <EquityCurve data={result.equity_curve} />}

      <p className="text-xs text-slate-700 text-center italic">
        * Kết quả backtest là lịch sử, không đảm bảo lợi nhuận trong tương lai
      </p>
    </div>
  )
}
