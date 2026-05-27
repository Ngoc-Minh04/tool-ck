// ===== VOLUME CHART =====

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useMemo } from 'react';

const VolumeChart = ({ data = [], height = 100 }) => {
  const displayData = useMemo(() => data.slice(-60), [data]);

  if (!displayData.length) return null;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={displayData} margin={{ top: 0, right: 10, left: 10, bottom: 0 }}>
        <XAxis dataKey="date" hide />
        <YAxis
          tick={{ fill: '#4a6b8a', fontSize: 9, fontFamily: 'JetBrains Mono' }}
          tickLine={false}
          axisLine={false}
          orientation="right"
          tickFormatter={(v) => `${(v / 1e6).toFixed(0)}M`}
          domain={[0, 'auto']}
        />
        <Tooltip
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const d = payload[0]?.payload;
            return (
              <div className="p-2 text-xs rounded" style={{ background: '#162336', border: '1px solid rgba(79,195,247,0.2)' }}>
                <div className="text-slate-400">{d.date}</div>
                <div className="text-cyan-400 font-num">{(d.volume / 1e6).toFixed(2)}M</div>
              </div>
            );
          }}
        />
        <Bar isAnimationActive={false} dataKey="volume" maxBarSize={12} radius={[2, 2, 0, 0]}>
          {displayData.map((entry, i) => (
            <Cell
              key={i}
              fill={entry.close >= entry.open ? 'rgba(0,230,118,0.6)' : 'rgba(255,82,82,0.6)'}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};

export default VolumeChart;

