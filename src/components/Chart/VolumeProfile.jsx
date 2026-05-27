// ===== VOLUME PROFILE CHART =====
// Hiển thị khối lượng giao dịch theo từng vùng giá (histogram nằm ngang)
// Không cần thêm request - tính từ OHLCV đã có sẵn

import { useMemo } from 'react';

const NUM_BINS = 20;

export default function VolumeProfile({ data = [], height = 300, currentPrice = null }) {
  const { bins, maxVol, priceMin, priceMax } = useMemo(() => {
    if (!data || data.length < 5) return { bins: [], maxVol: 0, priceMin: 0, priceMax: 0 };

    const prices = data.map(d => parseFloat(d.close)).filter(Boolean);
    const vols = data.map(d => parseFloat(d.volume) || 0);
    const priceMin = Math.min(...prices);
    const priceMax = Math.max(...prices);
    const range = priceMax - priceMin || 1;
    const binSize = range / NUM_BINS;

    const bins = Array.from({ length: NUM_BINS }, (_, i) => ({
      priceFrom: priceMin + i * binSize,
      priceTo: priceMin + (i + 1) * binSize,
      priceMid: priceMin + (i + 0.5) * binSize,
      volume: 0,
    }));

    data.forEach((bar, idx) => {
      const p = parseFloat(bar.close);
      const v = parseFloat(bar.volume) || 0;
      const binIdx = Math.min(Math.floor((p - priceMin) / binSize), NUM_BINS - 1);
      if (binIdx >= 0) bins[binIdx].volume += v;
    });

    const maxVol = Math.max(...bins.map(b => b.volume), 1);
    return { bins, maxVol, priceMin, priceMax };
  }, [data]);

  if (!data || data.length < 5) return null;

  const W = 80;
  const barMaxW = W - 4;

  const fmtPrice = (p) => (p / 1000).toFixed(1) + 'k';
  const fmtVol = (v) => v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `${(v / 1e3).toFixed(0)}K` : String(Math.round(v));

  // Xác định POC (Point of Control - vùng có volume cao nhất)
  const pocBin = bins.reduce((a, b) => b.volume > a.volume ? b : a, bins[0]);

  return (
    <div
      className="flex-shrink-0 select-none"
      style={{ width: W + 2, height, position: 'relative' }}
      title="Volume Profile - Khối lượng theo vùng giá"
    >
      <div
        style={{
          width: W,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
          padding: '4px 0',
        }}
      >
        {/* Render từ cao xuống thấp */}
        {[...bins].reverse().map((bin, i) => {
          const barW = (bin.volume / maxVol) * barMaxW;
          const isPOC = bin === pocBin;
          const isCurrent = currentPrice !== null && currentPrice >= bin.priceFrom && currentPrice < bin.priceTo;
          const isHigh = bin.volume >= maxVol * 0.7;

          let barColor = 'rgba(79,195,247,0.25)';
          if (isPOC) barColor = 'rgba(250,204,21,0.7)';
          else if (isCurrent) barColor = 'rgba(74,222,128,0.5)';
          else if (isHigh) barColor = 'rgba(79,195,247,0.45)';

          return (
            <div
              key={i}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                position: 'relative',
              }}
              title={`Vùng ${fmtPrice(bin.priceFrom)}-${fmtPrice(bin.priceTo)}: ${fmtVol(bin.volume)}`}
            >
              <div
                style={{
                  height: '80%',
                  width: Math.max(barW, 1),
                  background: barColor,
                  borderRadius: '0 2px 2px 0',
                  transition: 'width 0.3s ease',
                  boxShadow: isPOC ? '0 0 6px rgba(250,204,21,0.4)' : 'none',
                }}
              />
              {/* POC label */}
              {isPOC && (
                <span
                  style={{
                    position: 'absolute',
                    right: 2,
                    fontSize: 8,
                    color: '#facc15',
                    fontWeight: 700,
                    fontFamily: 'monospace',
                    whiteSpace: 'nowrap',
                  }}
                >
                  POC
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Title */}
      <div
        style={{
          position: 'absolute',
          top: 2,
          left: 2,
          fontSize: 8,
          color: 'rgba(79,195,247,0.5)',
          fontWeight: 600,
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
          pointerEvents: 'none',
        }}
      >
        Vol Profile
      </div>
    </div>
  );
}
