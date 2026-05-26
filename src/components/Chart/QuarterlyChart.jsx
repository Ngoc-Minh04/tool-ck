// ===== QUARTERLY CHART =====
// Biểu đồ kết quả kinh doanh theo quý (Bar chart đơn giản thuần SVG)

const MOCK_QUARTERLY = (ticker) => {
  // Dữ liệu mẫu khi offline — tạo ngẫu nhiên có xu hướng tăng
  const seed = ticker ? ticker.charCodeAt(0) + ticker.charCodeAt(1) : 65;
  const base = (seed % 5 + 1) * 1000; // 1000–5000 tỷ
  return ['Q2/23', 'Q3/23', 'Q4/23', 'Q1/24', 'Q2/24', 'Q3/24', 'Q4/24', 'Q1/25'].map((q, i) => ({
    quarter: q,
    revenue: Math.round(base * (1 + i * 0.05 + Math.sin(i) * 0.1)),
    profit: Math.round(base * 0.18 * (1 + i * 0.07 + Math.cos(i) * 0.08)),
  }));
};

const QuarterlyChart = ({ ticker, quarterlyData }) => {
  const data = quarterlyData?.length ? quarterlyData : MOCK_QUARTERLY(ticker);
  const isMock = !quarterlyData?.length;

  const [metric, setMetric] = React.useState('revenue');
  const values = data.map(d => d[metric]);
  const maxVal = Math.max(...values);
  const chartH = 120;
  const barW = 22;
  const gap = 8;
  const totalW = data.length * (barW + gap);
  const padL = 40;
  const padB = 24;
  const padT = 12;
  const svgW = totalW + padL + 8;
  const svgH = chartH + padB + padT;

  const fmtBil = (v) => v >= 1000 ? `${(v / 1000).toFixed(1)}N` : `${v}T`;
  const barColor = metric === 'revenue' ? '#4fc3f7' : '#4ade80';

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-300">📋 Kết quả kinh doanh theo quý</span>
          {isMock && <span className="text-xs text-yellow-500">(Dữ liệu mẫu)</span>}
        </div>
        <div className="flex gap-1.5">
          {[
            { key: 'revenue', label: 'Doanh thu', color: '#4fc3f7' },
            { key: 'profit', label: 'Lợi nhuận', color: '#4ade80' },
          ].map(m => (
            <button
              key={m.key}
              onClick={() => setMetric(m.key)}
              className="text-xs px-2.5 py-1 rounded-full transition-all duration-200"
              style={{
                background: metric === m.key ? `${m.color}25` : 'rgba(26,47,69,0.6)',
                color: metric === m.key ? m.color : '#64748b',
                border: `1px solid ${metric === m.key ? m.color + '50' : 'transparent'}`,
              }}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* SVG Chart */}
      <div className="overflow-x-auto">
        <svg width={svgW} height={svgH} style={{ display: 'block' }}>
          {/* Y axis ticks */}
          {[0, 0.25, 0.5, 0.75, 1].map(pct => {
            const y = padT + chartH - pct * chartH;
            return (
              <g key={pct}>
                <line x1={padL} y1={y} x2={svgW - 8} y2={y} stroke="rgba(79,195,247,0.06)" strokeWidth="1" />
                {pct > 0 && (
                  <text x={padL - 4} y={y + 3} textAnchor="end" fill="#475569" fontSize="8">
                    {fmtBil(Math.round(maxVal * pct))}
                  </text>
                )}
              </g>
            );
          })}

          {/* Bars */}
          {data.map((d, i) => {
            const val = d[metric];
            const barH = maxVal > 0 ? (val / maxVal) * chartH : 0;
            const x = padL + i * (barW + gap);
            const y = padT + chartH - barH;
            const prevVal = i > 0 ? data[i - 1][metric] : val;
            const isGrowth = val >= prevVal;
            return (
              <g key={d.quarter}>
                {/* Bar */}
                <rect
                  x={x}
                  y={y}
                  width={barW}
                  height={barH}
                  rx={3}
                  fill={barColor}
                  opacity={0.7}
                />
                {/* Growth indicator */}
                {i > 0 && (
                  <text
                    x={x + barW / 2}
                    y={y - 3}
                    textAnchor="middle"
                    fill={isGrowth ? '#4ade80' : '#f87171'}
                    fontSize="7"
                  >
                    {isGrowth ? '▲' : '▼'}
                  </text>
                )}
                {/* X label */}
                <text
                  x={x + barW / 2}
                  y={padT + chartH + 14}
                  textAnchor="middle"
                  fill="#475569"
                  fontSize="8"
                >
                  {d.quarter}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-3 gap-2 text-xs">
        {[
          { label: 'Quý gần nhất', value: fmtBil(values[values.length - 1]) + ' tỷ' },
          {
            label: 'Tăng trưởng QoQ',
            value: values.length >= 2
              ? `${((values[values.length - 1] / values[values.length - 2] - 1) * 100).toFixed(1)}%`
              : 'N/A',
          },
          {
            label: 'YoY',
            value: values.length >= 5
              ? `${((values[values.length - 1] / values[values.length - 5] - 1) * 100).toFixed(1)}%`
              : 'N/A',
          },
        ].map(s => (
          <div key={s.label} className="rounded-lg p-2 text-center" style={{ background: 'rgba(13,27,42,0.6)', border: '1px solid rgba(79,195,247,0.07)' }}>
            <div className="text-slate-500">{s.label}</div>
            <div className="font-semibold text-slate-200 font-num mt-0.5">{s.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Need React for useState
import React from 'react';
export default QuarterlyChart;
