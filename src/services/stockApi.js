import axios from 'axios';

const BASE = import.meta.env.VITE_BACKEND_URL || 'http://127.0.0.1:8000';
const api = axios.create({ baseURL: BASE, timeout: 30000 });

export const stockApi = {
  async getOHLCV(ticker, period = '3mo') {
    const res = await api.get(`/stock/${ticker.toUpperCase()}/ohlcv`, { params: { period } });
    return res.data?.data || res.data || [];
  },

  async getInfo(ticker) {
    const res = await api.get(`/stock/${ticker.toUpperCase()}/info`);
    return res.data?.data || res.data;
  },

  async getTechnicals(ticker, period = '3mo') {
    const res = await api.get(`/stock/${ticker.toUpperCase()}/technicals`, { params: { period } });
    return res.data?.data || res.data;
  },

  async getFullAnalysis(ticker, period = '3mo') {
    const res = await api.get(`/stock/${ticker.toUpperCase()}/full`, { params: { period } });
    return res.data?.data || res.data || {};
  },

  async getMarketOverview() {
    const res = await api.get('/market/overview');
    return res.data?.data || res.data || {};
  },

  async getTopMovers() {
    const res = await api.get('/market/movers');
    return res.data?.data || res.data;
  },

  async getForeignFlow() {
    const res = await api.get('/market/foreign');
    return res.data?.data || res.data || [];
  },

  async getAlerts() {
    const res = await api.get('/alerts');
    return res.data?.data || res.data || [];
  },

  async createAlert(body) {
    const res = await api.post('/alerts', body);
    return res.data;
  },

  async deleteAlert(id) {
    await api.delete(`/alerts/${id}`);
  },

  async healthCheck() {
    try {
      await api.get('/health', { timeout: 10000 });
      return true;
    } catch (err) {
      console.error("Health check failed:", err);
      return false;
    }
  },

  async getSupportResistance(ticker, period = '3mo') {
    const res = await api.get('/stock/support-resistance', { params: { ticker: ticker.toUpperCase(), period } });
    return res.data?.data || res.data;
  },

  async getNews(ticker) {
    const res = await api.get('/stock/news', { params: { ticker: ticker.toUpperCase() } });
    return res.data?.data || res.data || [];
  },

  async getPeers(ticker) {
    const res = await api.get('/stock/peers', { params: { ticker: ticker.toUpperCase() } });
    return res.data?.data || res.data;
  },

  async getQuickQuotes(tickers) {
    const params = tickers ? { tickers } : {};
    const res = await api.get('/market/quick-quotes', { params });
    return res.data?.data || res.data || [];
  },

  async getScreener({ exchange, min_pe, max_pe, min_roe, signal } = {}) {
    const res = await api.get('/screener', { params: { exchange, min_pe, max_pe, min_roe, signal } });
    return res.data?.data || res.data || [];
  },

  async getQuarterly(ticker) {
    const res = await api.get(`/stock/${ticker.toUpperCase()}/quarterly`);
    return res.data?.data || res.data;
  },

  async getHealthDetail() {
    const res = await api.get('/health');
    return res.data;
  },

  async getScanResults() {
    const res = await api.get('/scanner/results');
    return res.data?.data || res.data || {};
  },

  async triggerScan() {
    const res = await api.post('/scanner/refresh');
    return res.data;
  },

  async getPredict(ticker, periods = 10, sentimentScore = null) {
    let url = `/stock/predict?ticker=${ticker.toUpperCase()}&periods=${periods}`;
    if (sentimentScore !== null && sentimentScore !== undefined) {
      url += `&sentiment_score=${sentimentScore}`;
    }
    const res = await api.get(url);
    return res.data?.data || res.data || {};
  },
};


