import { useCallback } from 'react'

export function useLocalStorage<T>(key: string, defaultValue: T) {
  const read = useCallback((): T => {
    try {
      const raw = localStorage.getItem(key)
      return raw ? (JSON.parse(raw) as T) : defaultValue
    } catch {
      return defaultValue
    }
  }, [key, defaultValue])

  const write = useCallback((value: T) => {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch {}
  }, [key])

  const remove = useCallback(() => {
    try { localStorage.removeItem(key) } catch {}
  }, [key])

  return { read, write, remove }
}

export default useLocalStorage
