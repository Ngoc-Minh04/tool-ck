// ===== HOOK: VN STOCK DATA =====
// Fetch và cache dữ liệu chứng khoán

import { useState, useCallback, useRef } from 'react';
import { getStockData, getStockInfo, getMarketIndices, getForeignTrades, getSectorData } from '../services/vnstockService';
import { stockApi } from '../services/stockApi';

const useVnStock = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const cache = useRef({});

  /**
   * Lấy dữ liệu OHLCV + chỉ báo kỹ thuật
   */
  const fetchOHLCV = useCallback(async (ticker, exchange, period = '3M') => {
    const cacheKey = `${ticker}_${exchange}_${period}`;

    // Kiểm tra cache (hết hạn sau 5 phút)
    if (cache.current[cacheKey] && Date.now() - cache.current[cacheKey].ts < 300000) {
      return cache.current[cacheKey].data;
    }

    setLoading(true);
    setError(null);

    try {
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 500));
      const data = getStockData(ticker, exchange, period);
      cache.current[cacheKey] = { data, ts: Date.now() };
      return data;
    } catch (err) {
      setError(`Lỗi tải dữ liệu ${ticker}: ${err.message}`);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Lấy thông tin cơ bản của mã
   */
  const fetchInfo = useCallback(async (ticker) => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 300));
      return getStockInfo(ticker);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Lấy dữ liệu thị trường
   */
  const fetchMarket = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [overviewData, foreignData, quickQuotesData] = await Promise.all([
        stockApi.getMarketOverview(),
        stockApi.getForeignFlow(),
        stockApi.getQuickQuotes(),
      ]);

      const parsedIndices = Array.isArray(overviewData)
        ? overviewData.map(item => ({
            name: item.index || '',
            value: item.close || 0,
            change: item.change || 0,
            changePct: item.change_pct || 0,
            volume: item.volume || 0,
            advance: item.advance || 0,
            decline: item.decline || 0,
            unchanged: item.unchanged || 0,
          }))
        : [];

      let parsedForeign = { topBuy: [], topSell: [] };
      if (Array.isArray(foreignData)) {
        const buyList = foreignData
          .filter(item => item.net_value > 0)
          .map(item => ({ ticker: item.ticker, value: item.net_value / 1e9 }))
          .sort((a, b) => b.value - a.value);
          
        const sellList = foreignData
          .filter(item => item.net_value < 0)
          .map(item => ({ ticker: item.ticker, value: item.net_value / 1e9 }))
          .sort((a, b) => a.value - b.value);
          
        parsedForeign = { topBuy: buyList, topSell: sellList };
      } else if (foreignData && foreignData.topBuy && foreignData.topSell) {
        parsedForeign = foreignData;
      }

      return {
        indices: parsedIndices,
        foreign: parsedForeign,
        sectors: getSectorData(),
        quickQuotes: quickQuotesData || [],
        isOffline: false,
      };
    } catch (err) {
      console.error("fetchMarket failed, using fallback:", err);
      return {
        indices: getMarketIndices(),
        foreign: getForeignTrades(),
        sectors: getSectorData(),
        quickQuotes: [],
        isOffline: true,
      };
    } finally {
      setLoading(false);
    }
  }, []);

  return { loading, error, fetchOHLCV, fetchInfo, fetchMarket };
};

export default useVnStock;
