import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export function useKeyboardShortcuts() {
  const navigate = useNavigate()

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return

      // Ctrl+K / Cmd+K — focus ticker input
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        document.getElementById('ticker-input')?.focus()
      }
      // Esc — blur active element
      if (e.key === 'Escape') {
        (document.activeElement as HTMLElement)?.blur()
      }
      // Số phím nhanh chuyển trang
      if (e.key === '1') navigate('/')
      if (e.key === '2') navigate('/market')
      if (e.key === '3') navigate('/chat')
      if (e.key === '4') navigate('/history')
      if (e.key === '5') navigate('/watchlist')
      if (e.key === '6') navigate('/settings')
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [navigate])
}
