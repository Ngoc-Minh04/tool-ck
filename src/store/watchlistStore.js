import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useWatchlist = create(
  persist(
    (set, get) => ({
      items: [],
      add: (ticker, exchange = 'HOSE', note = '') => set((s) => {
        const normalized = ticker.toUpperCase();
        if (s.items.some((i) => i.ticker === normalized)) {
          return { items: s.items };
        }
        return {
          items: [
            ...s.items,
            {
              ticker: normalized,
              exchange,
              note,
              addedAt: new Date().toISOString(),
              lastSignal: null,
            },
          ],
        };
      }),
      remove: (ticker) => set((s) => ({
        items: s.items.filter((i) => i.ticker !== ticker.toUpperCase()),
      })),
      updateSignal: (ticker, signal) => set((s) => ({
        items: s.items.map((i) =>
          i.ticker === ticker.toUpperCase() ? { ...i, lastSignal: signal } : i
        ),
      })),
      has: (ticker) => {
        if (!ticker) return false;
        return get().items.some((i) => i.ticker === ticker.toUpperCase());
      },
    }),
    {
      name: 'vn-stock-watchlist',
    }
  )
);

export default useWatchlist;
