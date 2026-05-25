import { useEffect } from 'react'

interface SRData {
  supports: number[]
  resistances: number[]
  pivot_points: Record<string, number>
}

interface Props {
  series: any  // ISeriesApi (candlestick series) from lightweight-charts
  sr: SRData | null
}

export function SupportResistanceLines({ series, sr }: Props) {
  useEffect(() => {
    if (!series || !sr) return
    const lines: any[] = []

    // Vẽ supports (xanh lá, nét đứt)
    sr.supports?.forEach((price, i) => {
      try {
        const line = series.createPriceLine({
          price,
          color: '#22c55e',
          lineWidth: 1,
          lineStyle: 2,  // dashed
          axisLabelVisible: true,
          title: `S${i + 1}`,
        })
        lines.push(line)
      } catch { /* ignore */ }
    })

    // Vẽ resistances (đỏ, nét đứt)
    sr.resistances?.forEach((price, i) => {
      try {
        const line = series.createPriceLine({
          price,
          color: '#ef4444',
          lineWidth: 1,
          lineStyle: 2,
          axisLabelVisible: true,
          title: `R${i + 1}`,
        })
        lines.push(line)
      } catch { /* ignore */ }
    })

    // Vẽ Pivot Point (vàng, nét liền)
    if (sr.pivot_points?.pivot) {
      try {
        const pp = series.createPriceLine({
          price: sr.pivot_points.pivot,
          color: '#f59e0b',
          lineWidth: 1,
          lineStyle: 1,
          axisLabelVisible: true,
          title: 'PP',
        })
        lines.push(pp)
      } catch { /* ignore */ }
    }

    // Cleanup khi unmount hoặc data thay đổi
    return () => {
      lines.forEach(l => {
        try { series.removePriceLine(l) } catch { /* ignore */ }
      })
    }
  }, [series, sr])

  return null
}
