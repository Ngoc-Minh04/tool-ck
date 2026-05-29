// ===== ZUSTAND STORE =====
// Quản lý state toàn cục: settings, history, chat, sources

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DATA_SOURCES, MODELS } from '../constants/sources';

const useAppStore = create(
  persist(
    (set, get) => ({
      // ===== SETTINGS =====
      settings: {
        apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY || '',
        model: import.meta.env.VITE_MODEL || 'claude-sonnet-4-5',
        theme: 'dark',
        language: 'vi',
        defaultExchange: 'HOSE',
        defaultTimeframe: 'T3',
        sources: DATA_SOURCES,
        googleSearch: true,
      },

      updateSettings: (updates) =>
        set((state) => ({
          settings: { ...state.settings, ...updates },
        })),

      updateSources: (sources) =>
        set((state) => ({
          settings: { ...state.settings, sources },
        })),

      toggleSource: (sourceId) =>
        set((state) => ({
          settings: {
            ...state.settings,
            sources: state.settings.sources.map((s) =>
              s.id === sourceId ? { ...s, enabled: !s.enabled } : s
            ),
          },
        })),

      // ===== ANALYSIS HISTORY =====
      history: [],

      addToHistory: (entry) =>
        set((state) => {
          const filteredHistory = state.history.filter(
            (h) =>
              !(
                h.ticker.toUpperCase() === entry.ticker.toUpperCase() &&
                (h.exchange || '').toUpperCase() === (entry.exchange || '').toUpperCase() &&
                (h.timeframe || '').toUpperCase() === (entry.timeframe || '').toUpperCase()
              )
          );
          return {
            history: [
              {
                id: Date.now().toString(),
                timestamp: new Date().toISOString(),
                ...entry,
              },
              ...filteredHistory,
            ].slice(0, 100),
          };
        }),

      removeFromHistory: (id) =>
        set((state) => ({
          history: state.history.filter((h) => h.id !== id),
        })),

      clearHistory: () => set({ history: [] }),

      // ===== CHAT SESSIONS =====
      chatSessions: [],
      currentChatId: null,

      createChatSession: () => {
        const id = Date.now().toString();
        set((state) => ({
          chatSessions: [
            {
              id,
              title: `Phiên chat ${new Date().toLocaleString('vi-VN')}`,
              messages: [],
              createdAt: new Date().toISOString(),
            },
            ...state.chatSessions,
          ].slice(0, 50), // Giới hạn 50 sessions
          currentChatId: id,
        }));
        return id;
      },

      addChatMessage: (sessionId, message) =>
        set((state) => ({
          chatSessions: state.chatSessions.map((s) =>
            s.id === sessionId
              ? {
                  ...s,
                  messages: [...s.messages, { id: Date.now().toString(), ...message }],
                  title:
                    s.messages.length === 0 && message.role === 'user'
                      ? message.content.slice(0, 50)
                      : s.title,
                }
              : s
          ),
        })),

      deleteChatSession: (id) =>
        set((state) => ({
          chatSessions: state.chatSessions.filter((s) => s.id !== id),
          currentChatId: state.currentChatId === id ? null : state.currentChatId,
        })),

      setCurrentChat: (id) => set({ currentChatId: id }),

      getCurrentChat: () => {
        const { chatSessions, currentChatId } = get();
        return chatSessions.find((s) => s.id === currentChatId) || null;
      },

      // ===== ACTIVE STOCK ANALYSIS STATE =====
      activeAnalysis: {
        result: null,
        currentParams: null,
        compareMode: false,
        compareTickers: [],
        quarterlyData: null,
        sentimentData: null,
        predictionData: null,
        backtestResult: null,
        chartPeriod: '3M',
        chartTab: 'candle',
        infoTab: 'result',
        showBB: false,
        stock1Data: { ohlcv: [], info: null, technicals: null, sr: null, news: [] },
        stock2Data: { ohlcv: [], info: null, technicals: null, sr: null, news: [] },
        stock3Data: { ohlcv: [], info: null, technicals: null, sr: null, news: [] },
        stock4Data: { ohlcv: [], info: null, technicals: null, sr: null, news: [] },
      },

      updateActiveAnalysis: (updates) =>
        set((state) => ({
          activeAnalysis: { ...state.activeAnalysis, ...updates },
        })),

      resetActiveAnalysis: () =>
        set({
          activeAnalysis: {
            result: null,
            currentParams: null,
            compareMode: false,
            compareTickers: [],
            quarterlyData: null,
            sentimentData: null,
            predictionData: null,
            backtestResult: null,
            chartPeriod: '3M',
            chartTab: 'candle',
            infoTab: 'result',
            showBB: false,
            stock1Data: { ohlcv: [], info: null, technicals: null, sr: null, news: [] },
            stock2Data: { ohlcv: [], info: null, technicals: null, sr: null, news: [] },
            stock3Data: { ohlcv: [], info: null, technicals: null, sr: null, news: [] },
            stock4Data: { ohlcv: [], info: null, technicals: null, sr: null, news: [] },
          },
        }),

      // ===== UI STATE (không persist) =====
      sidebarOpen: true,
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

      isAnalyzing: false,
      setIsAnalyzing: (v) => set({ isAnalyzing: v }),

      // ===== MARKET DATA CACHE =====
      marketDataCache: {},
      setMarketData: (key, data) =>
        set((state) => ({
          marketDataCache: { ...state.marketDataCache, [key]: { data, ts: Date.now() } },
        })),
    }),
    {
      name: 'vn-stock-ai-store',
      partialize: (state) => ({
        settings: state.settings,
        history: state.history,
        chatSessions: state.chatSessions,
        currentChatId: state.currentChatId,
        activeAnalysis: state.activeAnalysis,
      }),
    }
  )
);

export default useAppStore;
