// ===== CANDLESTICK CHART =====
// Sử dụng Recharts ComposedChart để vẽ biểu đồ nến

import { useMemo } from 'react';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import SupportResistanceLines from './SupportResistanceLines';

// Custom Candlestick shape
const CandlestickBar = (props) => {
  const { x, y, width, height, open, close, high, low, index } = props;
  if (!open || !close || !high || !low) return null;

  const isUp = close >= open;
  const color = isUp ? '#00e676' : '#ff5252';
  const candleWidth = Math.max(width * 0.7, 3);
  const candleX = x + (width - candleWidth) / 2;

  // Tính tọa độ từ giá trị
  const chartTop = props.background?.y || 0;
  const chartHeight = props.background?.height || 1;
  const yScale = (price) => {
    const { yAxisMap } = props;
    if (yAxisMap) {
      const yAxis = Object.values(yAxisMap)[0];
      return yAxis.scale(price);
    }
    return 0;
  };

  return (
    <g>
      {/* Bấc trên/dưới */}
      <Line isAnimationActive={false}
        x1={x + width / 2}
        y1={y}
        x2={x + width / 2}
        y2={y + height}
        stroke={color}
        strokeWidth={1}
      />
      {/* Thân nến */}
      <rect
        x={candleX}
        y={isUp ? y + height * (1 - Math.abs((close - open) / (high - low))) : y}
        width={candleWidth}
        height={Math.max(height * Math.abs((close - open) / (high - low || 1)), 1)}
        fill={color}
        fillOpacity={0.9}
        rx={1}
      />
    </g>
  );
};

// Custom Tooltip
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;

  const isUp = d.close >= d.open;
  const change = d.close - d.open;
  const changePct = ((change / d.open) * 100).toFixed(2);

  return (
    <div
      className="p-3 rounded-lg text-xs space-y-1"
      style={{ background: '#162336', border: '1px solid rgba(79,195,247,0.3)', minWidth: 160 }}
    >
      <div className="font-semibold text-slate-200 mb-2">
        {format(new Date(d.date || d.timestamp || Date.now()), 'dd/MM/yyyy', { locale: vi })}
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-1">
        <span className="text-slate-500">Mở cửa</span>
        <span className="font-num text-right">{d.open?.toLocaleString('vi-VN')}</span>
        <span className="text-slate-500">Cao nhất</span>
        <span className="font-num text-right text-green-400">{d.high?.toLocaleString('vi-VN')}</span>
        <span className="text-slate-500">Thấp nhất</span>
        <span className="font-num text-right text-red-400">{d.low?.toLocaleString('vi-VN')}</span>
        <span className="text-slate-500">Đóng cửa</span>
        <span className={`font-num text-right font-bold ${isUp ? 'text-green-400' : 'text-red-400'}`}>
          {d.close?.toLocaleString('vi-VN')}
        </span>
        <span className="text-slate-500">Thay đổi</span>
        <span className={`font-num text-right ${isUp ? 'text-green-400' : 'text-red-400'}`}>
          {isUp ? '+' : ''}{changePct}%
        </span>
        <span className="text-slate-500">Khối lượng</span>
        <span className="font-num text-right text-cyan-400">
          {(d.volume / 1000).toFixed(0)}K
        </span>
      </div>
    </div>
  );
};

// Simplified candlestick using two bars (OHLC representation)
const CandlestickChart = ({ data = [], showMA = true, showBB = false, sr = null, height = 320 }) => {
  // Tạo data cho biểu đồ (dùng Bar với trick để giả lập nến)
  const chartData = useMemo(() => {
    if (!data.length) return [];
    return data.map((d) => ({
      ...d,
      // Cho ComposedChart: dùng base + value để vẽ thân nến
      candleBase: Math.min(d.open, d.close),
      candleHeight: Math.abs(d.close - d.open),
      // Bấc
      wickBase: d.low,
      wickHeight: d.high - d.low,
      isUp: d.close >= d.open,
    }));
  }, [data]);

  if (!data.length) return (
    <div className="flex items-center justify-center h-48 text-slate-500 text-sm">
      Không có dữ liệu
    </div>
  );

  // Lấy 60 nến gần nhất để hiển thị
  const displayData = chartData.slice(-60);

  // Tính toán miền giá trị Y-axis chính xác để tránh bị nén/chồng chéo do lỗi tự động scale của Recharts Bar
  const yDomain = useMemo(() => {
    if (!displayData.length) return ['auto', 'auto'];

    let min = Infinity;
    let max = -Infinity;

    displayData.forEach((d) => {
      // Chỉ lấy các giá trị số hợp lệ
      const vals = [d.low, d.high, d.open, d.close];
      if (showMA) {
        vals.push(d.ma20, d.ma50, d.ma200);
      }
      if (showBB) {
        vals.push(d.bb_lower, d.bb_upper);
      }

      vals.forEach((val) => {
        if (val !== null && val !== undefined && typeof val === 'number' && isFinite(val)) {
          if (val < min) min = val;
          if (val > max) max = val;
        }
      });
    });

    if (sr) {
      const allSr = [
        ...(sr.supports || []),
        ...(sr.resistances || []),
        sr.pivot_points?.pivot,
      ].filter((val) => val !== null && val !== undefined && typeof val === 'number' && isFinite(val));

      allSr.forEach((val) => {
        const currentRange = max - min;
        const pad = currentRange * 0.15 || 2000;
        if (val >= min - pad && val <= max + pad) {
          if (val < min) min = val;
          if (val > max) max = val;
        }
      });
    }

    if (min === Infinity || max === -Infinity) return ['auto', 'auto'];

    const padding = (max - min) * 0.05 || 1000;
    return [Math.floor(min - padding), Math.ceil(max + padding)];
  }, [displayData, showMA, showBB, sr]);

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={displayData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(79,195,247,0.06)" vertical={false} />
        <XAxis
          dataKey="date"
          tick={{ fill: '#4a6b8a', fontSize: 10, fontFamily: 'JetBrains Mono' }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => {
            const d = new Date(v);
            return `${d.getDate()}/${d.getMonth() + 1}`;
          }}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fill: '#4a6b8a', fontSize: 10, fontFamily: 'JetBrains Mono' }}
          tickLine={false}
          axisLine={false}
          orientation="right"
          tickFormatter={(v) => (v / 1000).toFixed(0) + 'K'}
          domain={yDomain}
        />
        <Tooltip content={<CustomTooltip />} />

        {/* Bollinger Bands */}
        {showBB && (
          <>
            <Line isAnimationActive={false} type="monotone" dataKey="bb_upper" stroke="rgba(79,195,247,0.3)" dot={false} strokeWidth={1} strokeDasharray="4 2" />
            <Line isAnimationActive={false} type="monotone" dataKey="bb_mid" stroke="rgba(79,195,247,0.5)" dot={false} strokeWidth={1} />
            <Line isAnimationActive={false} type="monotone" dataKey="bb_lower" stroke="rgba(79,195,247,0.3)" dot={false} strokeWidth={1} strokeDasharray="4 2" />
          </>
        )}

        {/* Bấc nến (High-Low) */}
        <Bar isAnimationActive={false}
          dataKey="high"
          fill="transparent"
          shape={(props) => {
            const { x, width, payload, yAxis } = props;
            if (!payload || !yAxis?.scale) return null;
            const { high, low, isUp } = payload;
            if (high === undefined || low === undefined) return null;
            const yHigh = yAxis.scale(high);
            const yLow = yAxis.scale(low);
            const color = isUp ? '#00e676' : '#ff5252';
            return (
              <Line isAnimationActive={false}
                x1={x + width / 2}
                y1={yHigh}
                x2={x + width / 2}
                y2={yLow}
                stroke={color}
                strokeWidth={1.5}
              />
            );
          }}
        />

        {/* Thân nến (Open-Close) */}
        <Bar isAnimationActive={false}
          dataKey="close"
          fill="transparent"
          shape={(props) => {
            const { x, width, payload, yAxis } = props;
            if (!payload || !yAxis?.scale) return null;
            const { open, close, isUp } = payload;
            if (open === undefined || close === undefined) return null;
            const yOpen = yAxis.scale(open);
            const yClose = yAxis.scale(close);
            const y = Math.min(yOpen, yClose);
            const height = Math.abs(yOpen - yClose);
            const color = isUp ? '#00e676' : '#ff5252';
            
            const candleWidth = Math.max(width * 0.7, 4);
            const candleX = x + (width - candleWidth) / 2;

            return (
              <rect
                x={candleX}
                y={y}
                width={candleWidth}
                height={Math.max(height, 2)}
                fill={color}
                fillOpacity={0.9}
                rx={1}
              />
            );
          }}
        />

        {/* Moving Averages */}
        {showMA && (
          <>
            <Line isAnimationActive={false} type="monotone" dataKey="ma20" stroke="#4fc3f7" dot={false} strokeWidth={1.5} />
            <Line isAnimationActive={false} type="monotone" dataKey="ma50" stroke="#ffb300" dot={false} strokeWidth={1.5} />
            <Line isAnimationActive={false} type="monotone" dataKey="ma200" stroke="#ff5252" dot={false} strokeWidth={1.5} />
          </>
        )}

        {/* Support & Resistance Levels */}
        {sr && <SupportResistanceLines sr={sr} />}
      </ComposedChart>
    </ResponsiveContainer>
  );
};

export default CandlestickChart;

