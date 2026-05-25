import { Routes, Route } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import Layout from './components/Layout/Layout'
import AnalyzePage from './pages/AnalyzePage'
import MarketPage from './pages/MarketPage'
import ChatPage from './pages/ChatPage'
import HistoryPage from './pages/HistoryPage'
import BacktestPage from './pages/BacktestPage'
import SettingsPage from './pages/SettingsPage'
import WatchlistPage from './pages/WatchlistPage'
import { OnboardingModal } from './components/UI/OnboardingModal'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'

function AppInner() {
  useKeyboardShortcuts()
  return (
    <>
      <OnboardingModal />
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<AnalyzePage />} />
          <Route path="/market" element={<MarketPage />} />
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/backtest" element={<BacktestPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/watchlist" element={<WatchlistPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </>
  )
}

export default function App() {
  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#0d1b2a',
            color: '#e2e8f0',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '12px',
            fontSize: '13px',
          },
          success: { iconTheme: { primary: '#22c55e', secondary: '#050d17' } },
          error: { iconTheme: { primary: '#ef4444', secondary: '#050d17' } },
        }}
      />
      <AppInner />
    </>
  )
}
