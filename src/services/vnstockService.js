// ===== VNSTOCK SERVICE =====
// Tạo mock data OHLCV realistic cho demo
// Trong production: thay bằng API thực (vnstock, SSI, TCBS...)

import { subDays, format, addMinutes, startOfDay } from 'date-fns';

/**
 * Tạo dữ liệu OHLCV mock realistic với random walk
 * @param {string} ticker - Mã CK
 * @param {number} days - Số ngày lịch sử
 * @param {number} basePrice - Giá khởi điểm
 * @returns {Array} - Mảng OHLCV
 */
export const generateMockOHLCV = (ticker, days = 90, basePrice = null) => {
  // Giá khởi điểm dựa trên mã (để consistent)
  const seed = ticker.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const rng = (min, max) => {
    const x = Math.sin(seed + Math.random() * 1000) * 10000;
    return min + (x - Math.floor(x)) * (max - min);
  };

  const startPrice = basePrice || (20000 + (seed % 80) * 1000);
  const data = [];
  let currentPrice = startPrice;

  // Tạo xu hướng tổng thể (uptrend hoặc sideways)
  const trend = seed % 3 === 0 ? 0.0002 : seed % 3 === 1 ? -0.0001 : 0.0001;
  const volatility = 0.015 + (seed % 10) * 0.001;

  for (let i = days; i >= 0; i--) {
    const date = subDays(new Date(), i);
    // Bỏ qua cuối tuần
    if (date.getDay() === 0 || date.getDay() === 6) continue;

    // Random walk với xu hướng
    const change = (Math.random() - 0.48) * volatility + trend;
    const open = currentPrice;
    const closeChange = (Math.random() - 0.48) * volatility + trend;
    const close = open * (1 + closeChange);
    const high = Math.max(open, close) * (1 + Math.random() * 0.02);
    const low = Math.min(open, close) * (1 - Math.random() * 0.02);

    // Volume tăng khi giá biến động mạnh
    const volumeBase = 500000 + (seed % 5) * 300000;
    const volumeMultiplier = 1 + Math.abs(closeChange) * 20;
    const volume = Math.floor(volumeBase * volumeMultiplier * (0.7 + Math.random() * 0.6));

    data.push({
      date: format(date, 'yyyy-MM-dd'),
      timestamp: date.getTime(),
      open: Math.round(open),
      high: Math.round(high),
      low: Math.round(low),
      close: Math.round(close),
      volume,
      // Tính toán chỉ báo kỹ thuật
    });

    currentPrice = close * (1 + change * 0.3);
  }

  return data;
};

/**
 * Tính MA (Moving Average)
 */
const calculateMA = (data, period) => {
  return data.map((item, index) => {
    if (index < period - 1) return { ...item, [`ma${period}`]: null };
    const slice = data.slice(index - period + 1, index + 1);
    const avg = slice.reduce((sum, d) => sum + d.close, 0) / period;
    return { ...item, [`ma${period}`]: Math.round(avg) };
  });
};

/**
 * Tính RSI
 */
const calculateRSI = (data, period = 14) => {
  return data.map((item, index) => {
    if (index < period) return { ...item, rsi: null };

    const changes = [];
    for (let i = index - period + 1; i <= index; i++) {
      changes.push(data[i].close - data[i - 1].close);
    }

    const gains = changes.filter(c => c > 0).reduce((s, c) => s + c, 0) / period;
    const losses = Math.abs(changes.filter(c => c < 0).reduce((s, c) => s + c, 0)) / period;

    if (losses === 0) return { ...item, rsi: 100 };
    const rs = gains / losses;
    return { ...item, rsi: Math.round(100 - 100 / (1 + rs)) };
  });
};

/**
 * Tính Bollinger Bands
 */
const calculateBollingerBands = (data, period = 20, stdDev = 2) => {
  return data.map((item, index) => {
    if (index < period - 1) return { ...item, bbUpper: null, bbMid: null, bbLower: null };
    const slice = data.slice(index - period + 1, index + 1);
    const avg = slice.reduce((sum, d) => sum + d.close, 0) / period;
    const variance = slice.reduce((sum, d) => sum + Math.pow(d.close - avg, 2), 0) / period;
    const std = Math.sqrt(variance);
    return {
      ...item,
      bbUpper: Math.round(avg + stdDev * std),
      bbMid: Math.round(avg),
      bbLower: Math.round(avg - stdDev * std),
    };
  });
};

/**
 * Tính MACD
 */
const calculateEMA = (data, period) => {
  const k = 2 / (period + 1);
  const emas = [];
  let ema = data[0].close;
  data.forEach((d, i) => {
    if (i === 0) { emas.push(ema); return; }
    ema = d.close * k + ema * (1 - k);
    emas.push(ema);
  });
  return emas;
};

const calculateMACD = (data) => {
  const ema12 = calculateEMA(data, 12);
  const ema26 = calculateEMA(data, 26);
  const macdLine = ema12.map((v, i) => v - ema26[i]);

  // Signal line (EMA9 of MACD)
  const k = 2 / 10;
  let signal = macdLine[0];
  const signalLine = macdLine.map((v, i) => {
    if (i === 0) { signal = v; return v; }
    signal = v * k + signal * (1 - k);
    return signal;
  });

  return data.map((item, i) => ({
    ...item,
    macd: Math.round(macdLine[i]),
    macdSignal: Math.round(signalLine[i]),
    macdHistogram: Math.round(macdLine[i] - signalLine[i]),
  }));
};

/**
 * Lấy dữ liệu đầy đủ cho một mã CK
 */
export const getStockData = (ticker, exchange = 'HOSE', period = '3M') => {
  const periodDays = { '1M': 30, '3M': 90, '6M': 180, '1Y': 365 };
  const days = periodDays[period] || 90;

  let data = generateMockOHLCV(ticker, days);

  // Tính các chỉ báo kỹ thuật
  data = calculateMA(data, 20);
  data = calculateMA(data, 50);
  data = calculateMA(data, 200);
  data = calculateRSI(data);
  data = calculateBollingerBands(data);
  data = calculateMACD(data);

  return data;
};

/**
 * Lấy thông tin cơ bản của mã CK (mock)
 */
export const getStockInfo = (ticker) => {
  const seed = ticker.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const basePrice = 20000 + (seed % 80) * 1000;

  // Mock fundamental data
  const fundamentals = {
    pe: (8 + (seed % 20) + Math.random() * 5).toFixed(1),
    pb: (0.8 + (seed % 4) + Math.random() * 1).toFixed(2),
    eps: Math.floor(1000 + (seed % 5000)),
    roe: (8 + (seed % 25) + Math.random() * 3).toFixed(1),
    roa: (2 + (seed % 10) + Math.random() * 2).toFixed(1),
    marketCap: Math.floor(basePrice * (100000000 + (seed % 500000000))),
    outstandingShares: Math.floor(100000000 + (seed % 500000000)),
    foreignOwnership: (20 + (seed % 30) + Math.random() * 10).toFixed(1),
    foreignRoom: (5 + (seed % 15)).toFixed(1),
  };

  // Mock foreign buying/selling
  const foreignNet = (Math.random() - 0.5) * 50000000000;

  return {
    ticker,
    exchange: 'HOSE',
    currentPrice: basePrice + Math.floor(Math.random() * 2000 - 1000),
    change: (Math.random() - 0.5) * 0.05,
    changeAbs: Math.floor((Math.random() - 0.5) * 2000),
    volume: Math.floor(1000000 + Math.random() * 5000000),
    fundamentals,
    foreignNet,
    lastUpdated: new Date().toISOString(),
  };
};

/**
 * Mock dữ liệu các chỉ số thị trường
 */
export const getMarketIndices = () => {
  const vnindex = 1180 + (Math.random() - 0.5) * 30;
  const vn30 = 1220 + (Math.random() - 0.5) * 25;
  const hnx = 230 + (Math.random() - 0.5) * 8;
  const upcom = 92 + (Math.random() - 0.5) * 3;

  return [
    {
      name: 'VNINDEX',
      value: vnindex.toFixed(2),
      change: ((Math.random() - 0.5) * 3).toFixed(2),
      changePct: ((Math.random() - 0.48) * 1.5).toFixed(2),
      volume: Math.floor(400000000 + Math.random() * 200000000),
      advance: Math.floor(180 + Math.random() * 50),
      decline: Math.floor(120 + Math.random() * 60),
      unchanged: Math.floor(40 + Math.random() * 30),
    },
    {
      name: 'VN30',
      value: vn30.toFixed(2),
      change: ((Math.random() - 0.5) * 4).toFixed(2),
      changePct: ((Math.random() - 0.48) * 1.2).toFixed(2),
      volume: Math.floor(100000000 + Math.random() * 50000000),
      advance: Math.floor(15 + Math.random() * 8),
      decline: Math.floor(10 + Math.random() * 8),
      unchanged: Math.floor(2 + Math.random() * 5),
    },
    {
      name: 'HNX30',
      value: hnx.toFixed(2),
      change: ((Math.random() - 0.5) * 2).toFixed(2),
      changePct: ((Math.random() - 0.48) * 1.8).toFixed(2),
      volume: Math.floor(50000000 + Math.random() * 30000000),
      advance: Math.floor(60 + Math.random() * 20),
      decline: Math.floor(50 + Math.random() * 20),
      unchanged: Math.floor(10 + Math.random() * 15),
    },
    {
      name: 'UPCOM',
      value: upcom.toFixed(2),
      change: ((Math.random() - 0.5) * 1).toFixed(2),
      changePct: ((Math.random() - 0.48) * 0.8).toFixed(2),
      volume: Math.floor(20000000 + Math.random() * 15000000),
      advance: Math.floor(100 + Math.random() * 40),
      decline: Math.floor(80 + Math.random() * 40),
      unchanged: Math.floor(30 + Math.random() * 20),
    },
  ];
};

/**
 * Mock dữ liệu top mua/bán ròng khối ngoại
 */
export const getForeignTrades = () => {
  const topBuy = [
    { ticker: 'VCB', value: 85.4, vol: 2100000 },
    { ticker: 'FPT', value: 62.1, vol: 980000 },
    { ticker: 'ACB', value: 48.7, vol: 3200000 },
    { ticker: 'VIC', value: 41.2, vol: 890000 },
    { ticker: 'MBB', value: 35.8, vol: 2400000 },
  ];

  const topSell = [
    { ticker: 'HPG', value: -72.3, vol: 4500000 },
    { ticker: 'SSI', value: -55.6, vol: 3100000 },
    { ticker: 'VHM', value: -43.1, vol: 1200000 },
    { ticker: 'CTG', value: -38.9, vol: 2800000 },
    { ticker: 'GAS', value: -29.4, vol: 680000 },
  ];

  return { topBuy, topSell };
};

/**
 * Mock dữ liệu sector performance
 */
export const getSectorData = (quotes) => {
  const mapping = [
    { id: 'bank', name: 'Ngân hàng', icon: '🏦', tickers: ['VCB', 'BID', 'CTG', 'ACB', 'MBB', 'TCB'] },
    { id: 'realestate', name: 'Bất động sản', icon: '🏗️', tickers: ['VIC', 'VHM', 'VRE'] },
    { id: 'steel', name: 'Thép', icon: '⚙️', tickers: ['HPG'] },
    { id: 'securities', name: 'Chứng khoán', icon: '📊', tickers: ['SSI'] },
    { id: 'oil_gas', name: 'Dầu khí', icon: '⛽', tickers: ['GAS'] },
    { id: 'tech', name: 'Công nghệ', icon: '💻', tickers: ['FPT'] },
  ];

  if (!quotes || !quotes.length) {
    return mapping.map(s => {
      let baseChange = 0;
      let baseVol = 1e9;
      if (s.id === 'bank') { baseChange = -0.53; baseVol = 2.4e9; }
      else if (s.id === 'realestate') { baseChange = -0.47; baseVol = 1.8e9; }
      else if (s.id === 'steel') { baseChange = -0.88; baseVol = 1.2e9; }
      else if (s.id === 'securities') { baseChange = -0.20; baseVol = 0.9e9; }
      else if (s.id === 'oil_gas') { baseChange = 0.23; baseVol = 0.7e9; }
      else if (s.id === 'tech') { baseChange = 1.03; baseVol = 0.5e9; }
      return { ...s, change: baseChange, volume: baseVol };
    });
  }

  return mapping.map(s => {
    const matched = quotes.filter(q => s.tickers.includes(q.ticker));
    if (!matched.length) {
      return { ...s, change: 0, volume: 0 };
    }
    const avgChange = matched.reduce((sum, q) => sum + (q.pct || 0), 0) / matched.length;
    const totalValueVND = matched.reduce((sum, q) => {
      const price = q.price || 0;
      const vol = q.vol || 0;
      return sum + (price * vol * 1000);
    }, 0);
    return {
      ...s,
      change: avgChange,
      volume: totalValueVND
    };
  });
};

/**
 * Format số tiền VND
 */
export const formatVND = (value) => {
  if (Math.abs(value) >= 1e12) return `${(value / 1e12).toFixed(1)}T`;
  if (Math.abs(value) >= 1e9) return `${(value / 1e9).toFixed(1)}B`;
  if (Math.abs(value) >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
  return value.toLocaleString('vi-VN');
};

/**
 * Format khối lượng
 */
export const formatVolume = (vol) => {
  if (vol >= 1e6) return `${(vol / 1e6).toFixed(1)}M`;
  if (vol >= 1e3) return `${(vol / 1e3).toFixed(0)}K`;
  return vol.toString();
};
