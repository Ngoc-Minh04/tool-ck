import React from 'react';
import { ReferenceLine } from 'recharts';

export function SupportResistanceLines({ sr }) {
  if (!sr) return null;

  const lines = [];

  // 1. Vẽ các mức hỗ trợ (Supports) - Xanh lá
  sr.supports?.forEach((price, i) => {
    lines.push(
      <ReferenceLine
        key={`s-${price}-${i}`}
        y={price}
        stroke="#00e676"
        strokeWidth={1}
        strokeDasharray="4 4"
        label={{ 
          value: `S${i + 1} (${price.toLocaleString('vi-VN')})`, 
          fill: '#00e676', 
          fontSize: 9, 
          position: 'insideBottomLeft',
          fontFamily: 'JetBrains Mono, sans-serif'
        }}
      />
    );
  });

  // 2. Vẽ các mức kháng cự (Resistances) - Đỏ
  sr.resistances?.forEach((price, i) => {
    lines.push(
      <ReferenceLine
        key={`r-${price}-${i}`}
        y={price}
        stroke="#ff5252"
        strokeWidth={1}
        strokeDasharray="4 4"
        label={{ 
          value: `R${i + 1} (${price.toLocaleString('vi-VN')})`, 
          fill: '#ff5252', 
          fontSize: 9, 
          position: 'insideTopLeft',
          fontFamily: 'JetBrains Mono, sans-serif'
        }}
      />
    );
  });

  // 3. Vẽ Pivot Point (PP) - Vàng
  if (sr.pivot_points?.pivot) {
    const pp = sr.pivot_points.pivot;
    lines.push(
      <ReferenceLine
        key={`pp-${pp}`}
        y={pp}
        stroke="#ffb300"
        strokeWidth={1.2}
        label={{ 
          value: `PP (${pp.toLocaleString('vi-VN')})`, 
          fill: '#ffb300', 
          fontSize: 9, 
          position: 'insideBottomRight',
          fontFamily: 'JetBrains Mono, sans-serif'
        }}
      />
    );
  }

  return <>{lines}</>;
}

export default SupportResistanceLines;
