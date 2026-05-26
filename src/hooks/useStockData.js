import { useState, useCallback } from 'react';
import { stockApi } from '../services/stockApi';
import { generateMockOHLCV } from '../utils/mockData';
import { compute_indicators_client, enrichOHLCV } from '../utils/indicators';
import toast from 'react-hot-toast';

export function useStockData() {
  const [ohlcv, setOhlcv] = useState([]);
  const [info, setInfo] = useState(null);
  const [technicals, setTechnicals] = useState(null);
  const [sr, setSr] = useState(null);
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [backendOk, setBackendOk] = useState(null);

  const _loadMockData = (ticker, period) => {
    const days = period === '1mo' || period === '1M' ? 30 
               : period === '6mo' || period === '6M' ? 180 
               : period === '1y' || period === '1Y' ? 365 
               : 90;
    const mockRaw = generateMockOHLCV(ticker, days);
    const mockData = enrichOHLCV(mockRaw);
    const closes = mockData.map((d) => d.close);
    const highs = mockData.map((d) => d.high);
    const lows = mockData.map((d) => d.low);
    const lastH = highs[highs.length - 2] ?? highs[highs.length - 1];
    const lastL = lows[lows.length - 2] ?? lows[lows.length - 1];
    const lastC = closes[closes.length - 2] ?? closes[closes.length - 1];
    const pivots = compute_indicators_client.pivotPoints(lastH, lastL, lastC);
    const currentPrice = closes[closes.length - 1];

    const techObj = {
      close: currentPrice,
      rsi: compute_indicators_client.rsi(closes),
      ma20: compute_indicators_client.ma(closes, 20),
      ma50: compute_indicators_client.ma(closes, 50),
      ma200: compute_indicators_client.ma(closes, 200),
      trend: (() => {
        const ma20 = compute_indicators_client.ma(closes, 20);
        const ma50 = compute_indicators_client.ma(closes, 50);
        if (ma20 && ma50) return ma20 > ma50 ? 'uptrend' : 'downtrend';
        return 'sideways';
      })(),
      macd: null, macd_signal: null, macd_hist: null,
      bb_upper: null, bb_lower: null, bb_mid: null,
      volume_avg20: null, atr: null,
    };

    const infoObj = {
      ticker: ticker.toUpperCase(),
      company_name: ticker.toUpperCase() + ' Corp',
      industry: 'Chưa xác định (Offline)',
      currentPrice,
      change: mockData.length > 1 ? (mockData[mockData.length - 1].close - mockData[mockData.length - 2].close) / mockData[mockData.length - 2].close : 0,
      volume: mockData[mockData.length - 1]?.volume || 0,
      fundamentals: {
        pe: null,
        pb: null,
        roe: null,
        roa: null,
        eps: null,
        marketCap: null,
      },
      foreignNet: 0,
    };

    setOhlcv(mockData);
    setIsOffline(true);
    setTechnicals(techObj);
    setInfo(infoObj);
    setSr({
      current_price: currentPrice,
      pivot_points: { pivot: pivots.PP, r1: pivots.R1, r2: pivots.R2, s1: pivots.S1, s2: pivots.S2 },
      supports: [pivots.S1, pivots.S2].filter(Boolean),
      resistances: [pivots.R1, pivots.R2].filter(Boolean),
      swing_highs: [], swing_lows: [], volume_zones: [],
    });
    setNews([]);
    return { info: infoObj, technicals: techObj };
  };

  const fetchAll = useCallback(async (ticker, period = '3mo') => {
    setLoading(true);
    try {
      const isOk = await stockApi.healthCheck();
      setBackendOk(isOk);

      if (isOk) {
        // Backend online — fetch dữ liệu thật
        const [fullData, srData, newsData] = await Promise.all([
          stockApi.getFullAnalysis(ticker, period),
          stockApi.getSupportResistance(ticker, period),
          stockApi.getNews(ticker),
        ]);
        
        const enrichedOhlcv = enrichOHLCV(fullData.ohlcv || []);
        setOhlcv(enrichedOhlcv);
        const lastBar = enrichedOhlcv[enrichedOhlcv.length - 1] || {};
        const prevBar = enrichedOhlcv[enrichedOhlcv.length - 2] || lastBar;
        const currentPrice = lastBar.close || 0;
        const change = prevBar.close ? (lastBar.close - prevBar.close) / prevBar.close : 0;
        const volume = lastBar.volume || 0;

        const infoObj = {
          ticker: ticker.toUpperCase(),
          company_name: fullData.info?.company_name || ticker.toUpperCase(),
          industry: fullData.info?.industry || 'N/A',
          currentPrice,
          change,
          volume,
          fundamentals: {
            pe: fullData.info?.pe,
            pb: fullData.info?.pb,
            roe: fullData.info?.roe,
            roa: fullData.info?.roa,
            eps: fullData.info?.eps,
            marketCap: fullData.info?.market_cap,
          },
          foreignNet: fullData.info?.foreign_net || 0,
        };

        setInfo(infoObj);
        setTechnicals(fullData.technicals || null);
        setSr(srData || null);
        setNews(newsData || []);
        setIsOffline(false);
        return { info: infoObj, technicals: fullData.technicals || null };
      } else {
        // Backend offline → fallback sang mock data
        const mockRes = _loadMockData(ticker, period);
        toast('Backend offline — đang dùng dữ liệu mô phỏng', { icon: '⚠️', id: 'backend-warn' });
        return mockRes;
      }
    } catch (err) {
      setBackendOk(false);
      const mockRes = _loadMockData(ticker, period);
      toast('Dùng mock data (backend chưa chạy)', { icon: '⚠️', id: 'backend-warn' });
      return mockRes;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchOHLCV = useCallback(async (ticker, period = '3mo') => {
    setLoading(true);
    try {
      const data = await stockApi.getOHLCV(ticker, period);
      setOhlcv(data);
      return data;
    } catch (err) {
      const days = period === '1mo' || period === '1M' ? 30 
                 : period === '6mo' || period === '6M' ? 180 
                 : 90;
      const mock = enrichOHLCV(generateMockOHLCV(ticker, days));
      setOhlcv(mock);
      return mock;
    } finally {
      setLoading(false);
    }
  }, []);

  return { ohlcv, info, technicals, sr, news, loading, isOffline, backendOk, fetchAll, fetchOHLCV };
}

export default useStockData;
