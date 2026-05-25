// ===== INDICATOR PANEL =====
// Hiển thị RSI, MACD

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, BarChart, Bar, Cell
} from 'recharts';
import { useMemo } from 'react';

// RSI Chart
const RSIChart = ({ data = [], height = 100 }) => {
  const displayData = useMemo(() => data.slice(-60).filter(d => d.rsi !== null), [data]);

  return (
    <div>
      <div className="flex items-center gap-3 mb-1 text-xs text-slate-500">
        <span>RSI(14)</span>
        {displayData.length > 0 && (
          <span className={`font-num font-bold ${
            displayData[displayData.length - 1]?.rsi > 70 ? 'text-red-400' :
            displayData[displayData.length - 1]?.rsi < 30 ? 'text-green-400' : 'text-cyan-400'
          }`}>
            {displayData[displayData.length - 1]?.rsi?.toFixed(1)}
          </span>
        )}
        <span className="text-slate-600">Quá mua: 70 | Quá bán: 30</span>
      </div>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={displayData} margin={{ top: 2, right: 10, left: 10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(79,195,247,0.05)" vertical={false} />
          <XAxis dataKey="date" hide />
          <YAxis
            domain={[0, 100]}
            tick={{ fill: '#4a6b8a', fontSize: 9, fontFamily: 'JetBrains Mono' }}
            tickLine={false}
            axisLine={false}
            orientation="right"
            ticks={[0, 30, 50, 70, 100]}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const rsi = payload[0]?.value;
              return (
                <div className="p-2 text-xs rounded" style={{ background: '#162336', border: '1px solid rgba(79,195,247,0.2)' }}>
                  <span className="font-num text-cyan-400">RSI: {rsi?.toFixed(1)}</span>
                </div>
              );
            }}
          />
          <ReferenceLine y={70} stroke="rgba(255,82,82,0.4)" strokeDasharray="3 3" />
          <ReferenceLine y={30} stroke="rgba(0,230,118,0.4)" strokeDasharray="3 3" />
          <ReferenceLine y={50} stroke="rgba(79,195,247,0.2)" />
          <Line
            type="monotone"
            dataKey="rsi"
            stroke="#4fc3f7"
            dot={false}
            strokeWidth={1.5}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

// MACD Chart
const MACDChart = ({ data = [], height = 100 }) => {
  const displayData = useMemo(() => data.slice(-60), [data]);

  return (
    <div>
      <div className="flex items-center gap-3 mb-1 text-xs text-slate-500">
        <span>MACD(12,26,9)</span>
        <span className="flex items-center gap-2">
          <span className="inline-block w-3 h-0.5 bg-cyan-400" />MACD
          <span className="inline-block w-3 h-0.5 bg-yellow-400" />Signal
        </span>
      </div>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={displayData} margin={{ top: 2, right: 10, left: 10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(79,195,247,0.05)" vertical={false} />
          <XAxis dataKey="date" hide />
          <YAxis
            tick={{ fill: '#4a6b8a', fontSize: 9, fontFamily: 'JetBrains Mono' }}
            tickLine={false}
            axisLine={false}
            orientation="right"
          />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0]?.payload;
              return (
                <div className="p-2 text-xs rounded space-y-1" style={{ background: '#162336', border: '1px solid rgba(79,195,247,0.2)' }}>
                  <div><span className="text-cyan-400">MACD: </span><span className="font-num">{d.macd}</span></div>
                  <div><span className="text-yellow-400">Signal: </span><span className="font-num">{d.macdSignal}</span></div>
                  <div><span className="text-slate-400">Hist: </span><span className={`font-num ${d.macdHistogram > 0 ? 'text-green-400' : 'text-red-400'}`}>{d.macdHistogram}</span></div>
                </div>
              );
            }}
          />
          <ReferenceLine y={0} stroke="rgba(79,195,247,0.2)" />
          <Bar dataKey="macdHistogram" maxBarSize={8} radius={[2, 2, 0, 0]}>
            {displayData.map((entry, i) => (
              <Cell
                key={i}
                fill={entry.macdHistogram >= 0 ? 'rgba(0,230,118,0.6)' : 'rgba(255,82,82,0.6)'}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

const IndicatorPanel = ({ data = [] }) => {
  return (
    <div className="space-y-3">
      <RSIChart data={data} height={90} />
      <MACDChart data={data} height={90} />
    </div>
  );
};

export default IndicatorPanel;
