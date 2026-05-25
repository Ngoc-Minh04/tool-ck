import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface WatchItem {
  ticker: string
  exchange: string
  addedAt: string
  note?: string
  lastSignal?: 'BUY' | 'HOLD' | 'SELL'
}

interface WatchlistState {
  items: WatchItem[]
  add: (ticker: string, exchange?: string, note?: string) => void
  remove: (ticker: string) => void
  updateSignal: (ticker: string, signal: 'BUY' | 'HOLD' | 'SELL') => void
  has: (ticker: string) => boolean
}

export const useWatchlist = create<WatchlistState>()(
  persist(
    (set, get) => ({
      items: [],
      add: (ticker, exchange = 'HOSE', note) => set(s => ({
        items: s.items.find(i => i.ticker === ticker.toUpperCase()) ? s.items :
          [...s.items, {
            ticker: ticker.toUpperCase(), exchange, note,
            addedAt: new Date().toISOString(),
          }],
      })),
      remove: (ticker) => set(s => ({
        items: s.items.filter(i => i.ticker !== ticker.toUpperCase()),
      })),
      updateSignal: (ticker, signal) => set(s => ({
        items: s.items.map(i =>
          i.ticker === ticker.toUpperCase() ? { ...i, lastSignal: signal } : i
        ),
      })),
      has: (ticker) => get().items.some(i => i.ticker === ticker.toUpperCase()),
    }),
    { name: 'vn-stock-watchlist' }
  )
)
