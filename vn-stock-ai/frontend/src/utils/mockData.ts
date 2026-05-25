export function generateMockOHLCV(ticker: string, days: number) {
  // Seed dựa trên ticker để cùng ticker luôn ra cùng data (deterministic)
  let seed = ticker.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  const rng = () => {
    seed = (seed * 1664525 + 1013904223) & 0xffffffff
    return (seed >>> 0) / 0xffffffff
  }

  const records = []
  let base = (15 + rng() * 85) * 1000
  const now = new Date()

  for (let i = days; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(now.getDate() - i)
    if (d.getDay() === 0 || d.getDay() === 6) continue // bỏ T7, CN

    const change = (rng() - 0.48) * 0.04
    base = Math.max(5, base * (1 + change))
    const h = base * (1 + rng() * 0.025)
    const l = base * (1 - rng() * 0.025)
    const o = l + rng() * (h - l)

    records.push({
      date: d.toISOString().slice(0, 10),
      open: +o.toFixed(2),
      high: +h.toFixed(2),
      low: +l.toFixed(2),
      close: +base.toFixed(2),
      volume: Math.floor(300_000 + rng() * 4_700_000),
    })
  }
  return records
}
