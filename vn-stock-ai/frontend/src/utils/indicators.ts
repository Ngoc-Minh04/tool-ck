export function calcRSI(closes: number[], period = 14): number[] {
  const rsi: number[] = new Array(closes.length).fill(NaN)
  if (closes.length < period + 1) return rsi

  let gains = 0
  let losses = 0
  for (let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i - 1]
    if (diff >= 0) gains += diff
    else losses -= diff
  }

  let avgGain = gains / period
  let avgLoss = losses / period

  for (let i = period; i < closes.length; i++) {
    if (i > period) {
      const diff = closes[i] - closes[i - 1]
      const gain = Math.max(diff, 0)
      const loss = Math.max(-diff, 0)
      avgGain = (avgGain * (period - 1) + gain) / period
      avgLoss = (avgLoss * (period - 1) + loss) / period
    }
    if (avgLoss === 0) {
      rsi[i] = 100
    } else {
      const rs = avgGain / avgLoss
      rsi[i] = 100 - 100 / (1 + rs)
    }
  }
  return rsi
}

export function calcMA(closes: number[], period: number): number[] {
  return closes.map((_, i) => {
    if (i < period - 1) return NaN
    const slice = closes.slice(i - period + 1, i + 1)
    return slice.reduce((a, b) => a + b, 0) / period
  })
}

export function calcEMA(closes: number[], period: number): number[] {
  const ema: number[] = new Array(closes.length).fill(NaN)
  const k = 2 / (period + 1)
  let started = false
  let prev = 0
  for (let i = 0; i < closes.length; i++) {
    if (!started && !isNaN(closes[i])) {
      if (i >= period - 1) {
        const slice = closes.slice(i - period + 1, i + 1)
        prev = slice.reduce((a, b) => a + b, 0) / period
        ema[i] = prev
        started = true
      }
    } else if (started) {
      prev = closes[i] * k + prev * (1 - k)
      ema[i] = prev
    }
  }
  return ema
}

export function calcMACD(closes: number[], fast = 12, slow = 26, signal = 9): {
  macd: number[]
  signal_line: number[]
  histogram: number[]
} {
  const emaFast = calcEMA(closes, fast)
  const emaSlow = calcEMA(closes, slow)
  const macd = closes.map((_, i) =>
    isNaN(emaFast[i]) || isNaN(emaSlow[i]) ? NaN : emaFast[i] - emaSlow[i]
  )
  const validMacd = macd.filter(v => !isNaN(v))
  const signalFull: number[] = new Array(closes.length).fill(NaN)
  if (validMacd.length >= signal) {
    const startIdx = macd.findIndex(v => !isNaN(v))
    const signalEma = calcEMA(validMacd, signal)
    signalEma.forEach((v, i) => { if (!isNaN(v)) signalFull[startIdx + i] = v })
  }
  const histogram = closes.map((_, i) =>
    isNaN(macd[i]) || isNaN(signalFull[i]) ? NaN : macd[i] - signalFull[i]
  )
  return { macd, signal_line: signalFull, histogram }
}

export function calcBollingerBands(closes: number[], period = 20, mult = 2): {
  upper: number[]
  mid: number[]
  lower: number[]
} {
  const mid = calcMA(closes, period)
  const upper = closes.map((_, i) => {
    if (isNaN(mid[i])) return NaN
    const slice = closes.slice(i - period + 1, i + 1)
    const mean = mid[i]
    const std = Math.sqrt(slice.reduce((acc, v) => acc + (v - mean) ** 2, 0) / period)
    return mean + mult * std
  })
  const lower = closes.map((_, i) => {
    if (isNaN(mid[i])) return NaN
    const slice = closes.slice(i - period + 1, i + 1)
    const mean = mid[i]
    const std = Math.sqrt(slice.reduce((acc, v) => acc + (v - mean) ** 2, 0) / period)
    return mean - mult * std
  })
  return { upper, mid, lower }
}

export function enrichOHLCV(raw: any[]): any[] {
  if (!raw || raw.length === 0) return []
  const closes = raw.map(d => d.close)
  const ma20 = calcMA(closes, 20)
  const ma50 = calcMA(closes, 50)
  const ma200 = calcMA(closes, 200)
  const rsi = calcRSI(closes, 14)
  const { macd, signal_line, histogram } = calcMACD(closes)
  const { upper, mid, lower } = calcBollingerBands(closes)
  return raw.map((d, i) => ({
    ...d,
    ma20: isNaN(ma20[i]) ? null : +ma20[i].toFixed(2),
    ma50: isNaN(ma50[i]) ? null : +ma50[i].toFixed(2),
    ma200: isNaN(ma200[i]) ? null : +ma200[i].toFixed(2),
    rsi: isNaN(rsi[i]) ? null : +rsi[i].toFixed(2),
    macd: isNaN(macd[i]) ? null : +macd[i].toFixed(4),
    macd_signal: isNaN(signal_line[i]) ? null : +signal_line[i].toFixed(4),
    macd_hist: isNaN(histogram[i]) ? null : +histogram[i].toFixed(4),
    bb_upper: isNaN(upper[i]) ? null : +upper[i].toFixed(2),
    bb_mid: isNaN(mid[i]) ? null : +mid[i].toFixed(2),
    bb_lower: isNaN(lower[i]) ? null : +lower[i].toFixed(2),
  }))
}

/**
 * Client-side indicator helpers — dùng khi backend offline (offline fallback)
 */
export const compute_indicators_client = {
  rsi(closes: number[], period = 14): number {
    if (closes.length < period + 1) return 50
    const rsiArr = calcRSI(closes, period)
    const lastValid = rsiArr.filter(v => !isNaN(v))
    return lastValid.length > 0 ? Math.round(lastValid[lastValid.length - 1]) : 50
  },

  ma(closes: number[], period: number): number | null {
    const maArr = calcMA(closes, period)
    const lastValid = maArr.filter(v => !isNaN(v))
    return lastValid.length > 0 ? +(lastValid[lastValid.length - 1].toFixed(2)) : null
  },

  pivotPoints(h: number, l: number, c: number) {
    const PP = (h + l + c) / 3
    return {
      PP: +PP.toFixed(2),
      R1: +(2 * PP - l).toFixed(2),
      R2: +(PP + h - l).toFixed(2),
      S1: +(2 * PP - h).toFixed(2),
      S2: +(PP - (h - l)).toFixed(2),
    }
  },
}
