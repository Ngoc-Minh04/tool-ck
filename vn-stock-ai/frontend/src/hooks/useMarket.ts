import { useState, useCallback, useEffect } from 'react'
import { stockApi } from '../services/stockApi'

export function useMarket() {
  const [indices, setIndices] = useState<any[]>([])
  const [movers, setMovers] = useState<any>(null)
  const [foreign, setForeign] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const fetchMarket = useCallback(async () => {
    setLoading(true)
    try {
      const [ov, mv, ff] = await Promise.allSettled([
        stockApi.getMarketOverview(),
        stockApi.getTopMovers(),
        stockApi.getForeignFlow(),
      ])
      if (ov.status === 'fulfilled') setIndices(ov.value)
      if (mv.status === 'fulfilled') setMovers(mv.value)
      if (ff.status === 'fulfilled') setForeign(ff.value)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchMarket()
    const interval = setInterval(fetchMarket, 60_000)
    return () => clearInterval(interval)
  }, [fetchMarket])

  return { indices, movers, foreign, loading, refresh: fetchMarket }
}

export default useMarket
