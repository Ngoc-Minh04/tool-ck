// ===== APP ROOT =====

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Sidebar from './components/Layout/Sidebar';
import AnalyzePage from './pages/AnalyzePage';
import MarketPage from './pages/MarketPage';
import ChatPage from './pages/ChatPage';
import HistoryPage from './pages/HistoryPage';
import SettingsPage from './pages/SettingsPage';
import WatchlistPage from './pages/WatchlistPage';
import ScreenerPage from './pages/ScreenerPage';
import OnboardingModal from './components/UI/OnboardingModal';
import useKeyboardShortcuts from './hooks/useKeyboardShortcuts';

import { useEffect } from 'react';
import useAppStore from './store/appStore';

function AppInner() {
  useKeyboardShortcuts();
  const settings = useAppStore((s) => s.settings);
  const updateSettings = useAppStore((s) => s.updateSettings);

  useEffect(() => {
    const isKeyPlaceholder = (key) => {
      if (!key) return true;
      const trimmed = key.trim();
      if (trimmed === '') return true;
      if (trimmed.length < 25) return true;
      if (trimmed.includes('DÁN_KEY')) return true;
      if (trimmed.includes('your-key')) return true;
      if (trimmed.includes('your_key')) return true;
      if (trimmed.includes('placeholder')) return true;
      return false;
    };

    const envKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
    if (isKeyPlaceholder(settings.apiKey) && !isKeyPlaceholder(envKey)) {
      updateSettings({ apiKey: envKey });
    }
  }, [settings.apiKey, updateSettings]);

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#0d1b2a' }}>
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        <OnboardingModal />
        <Routes>
          <Route path="/" element={<Navigate to="/analyze" replace />} />
          <Route path="/analyze"  element={<AnalyzePage />} />
          <Route path="/market"   element={<MarketPage />} />
          <Route path="/screener" element={<ScreenerPage />} />
          <Route path="/chat"     element={<ChatPage />} />
          <Route path="/history"  element={<HistoryPage />} />
          <Route path="/watchlist" element={<WatchlistPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/analyze" replace />} />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      {/* Toast notifications */}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#162336',
            color: '#e2e8f0',
            border: '1px solid rgba(79, 195, 247, 0.2)',
            borderRadius: '10px',
            fontSize: '13px',
            fontFamily: 'Inter, sans-serif',
          },
          success: {
            iconTheme: { primary: '#00e676', secondary: '#0d1b2a' },
          },
          error: {
            iconTheme: { primary: '#ff5252', secondary: '#0d1b2a' },
          },
        }}
      />

      <AppInner />
    </BrowserRouter>
  );
}

export default App;
