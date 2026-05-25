import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { SOURCES, MODELS } from '../constants/sources'

export interface HistoryItem {
  id?: string
  ticker: string
  signal: string
  content: string
  timestamp: string
  // legacy fields
  exchange?: string
  timeframe?: string
  period?: string
  sources?: string[]
  model?: string
}

interface AppState {
  // Settings
  apiKey: string
  model: string
  backendUrl: string
  streamingEnabled: boolean
  autoAnalyze: boolean

  // Active sources
  activeSources: string[]

  // History
  history: HistoryItem[]
  maxHistory: number

  // Runtime (not persisted)
  backendStatus: 'online' | 'offline' | 'checking'
  setBackendStatus: (s: 'online' | 'offline' | 'checking') => void

  // UI state
  sidebarCollapsed: boolean
  theme: 'dark'

  // Actions
  setApiKey: (key: string) => void
  setModel: (model: string) => void
  setBackendUrl: (url: string) => void
  setStreamingEnabled: (v: boolean) => void
  setAutoAnalyze: (v: boolean) => void
  toggleSource: (id: string) => void
  setActiveSources: (ids: string[]) => void
  addHistory: (item: Omit<HistoryItem, 'id'>) => void
  removeHistory: (index: number) => void
  clearHistory: () => void
  setSidebarCollapsed: (v: boolean) => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY || '',
      model: import.meta.env.VITE_MODEL || MODELS[0].value,
      backendUrl: import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000',
      streamingEnabled: true,
      autoAnalyze: false,
      activeSources: SOURCES.filter(s => s.defaultOn).map(s => s.id),
      history: [],
      maxHistory: 50,
      sidebarCollapsed: false,
      theme: 'dark',
      backendStatus: 'checking' as const,

      setApiKey: (apiKey) => set({ apiKey }),
      setModel: (model) => set({ model }),
      setBackendUrl: (backendUrl) => set({ backendUrl }),
      setStreamingEnabled: (streamingEnabled) => set({ streamingEnabled }),
      setAutoAnalyze: (autoAnalyze) => set({ autoAnalyze }),

      toggleSource: (id) =>
        set(s => ({
          activeSources: s.activeSources.includes(id)
            ? s.activeSources.filter(x => x !== id)
            : [...s.activeSources, id],
        })),

      setActiveSources: (activeSources) => set({ activeSources }),

      setBackendStatus: (backendStatus) => set({ backendStatus }),

      addHistory: (item) => {
        const { maxHistory } = get()
        const entry: HistoryItem = { ...item, id: Date.now().toString() }
        set(s => ({ history: [entry, ...s.history].slice(0, maxHistory) }))
      },

      removeHistory: (index) =>
        set(s => ({ history: s.history.filter((_, i) => i !== index) })),

      clearHistory: () => set({ history: [] }),

      setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
    }),
    {
      name: 'vn-stock-ai-store',
      partialize: (state) => ({
        apiKey: state.apiKey,
        model: state.model,
        backendUrl: state.backendUrl,
        streamingEnabled: state.streamingEnabled,
        autoAnalyze: state.autoAnalyze,
        activeSources: state.activeSources,
        history: state.history,
        maxHistory: state.maxHistory,
        sidebarCollapsed: state.sidebarCollapsed,
      }),
    }
  )
)
