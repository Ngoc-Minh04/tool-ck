import { useState } from 'react'
import { useAppStore } from '../store/appStore'
import AlertForm from '../components/Alert/AlertForm'
import AlertList from '../components/Alert/AlertList'
import { useAlerts } from '../hooks/useAlerts'
import { testApiKey } from '../services/claudeService'
import toast from 'react-hot-toast'
import { motion } from 'framer-motion'

const MODELS = [
  { value: 'claude-sonnet-4-5', label: 'Claude Sonnet 4.5 (Khuyến nghị)' },
  { value: 'claude-haiku-3-5', label: 'Claude Haiku 3.5 (Nhanh hơn, rẻ hơn)' },
  { value: 'claude-opus-4-5', label: 'Claude Opus 4.5 (Mạnh nhất)' },
]

export default function SettingsPage() {
  const { apiKey, setApiKey, model, setModel, backendUrl, setBackendUrl } = useAppStore()
  const [keyInput, setKeyInput] = useState(apiKey)
  const [backendInput, setBackendInput] = useState(backendUrl || 'http://localhost:8000')
  const [testing, setTesting] = useState(false)
  const { alerts, loading: alertLoading, create, remove } = useAlerts()

  const handleSaveKey = () => {
    setApiKey(keyInput)
    toast.success('Đã lưu API Key!')
  }

  const handleTestKey = async () => {
    if (!keyInput) return toast.error('Nhập API Key trước!')
    setTesting(true)
    const ok = await testApiKey(keyInput)
    setTesting(false)
    if (ok) toast.success('✅ API Key hợp lệ!')
    else toast.error('❌ API Key không hợp lệ hoặc hết quota')
  }

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="bg-[#0d1b2a] rounded-2xl border border-white/10 p-5 space-y-4">
      <div className="text-sm font-semibold text-white border-b border-white/8 pb-2">{title}</div>
      {children}
    </div>
  )

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Claude API */}
      <Section title="🤖 Claude AI API">
        <div>
          <label className="text-xs text-slate-500 mb-1 block">API Key (sk-ant-...)</label>
          <div className="flex gap-2">
            <input type="password" value={keyInput} onChange={e => setKeyInput(e.target.value)}
              placeholder="sk-ant-api03-..."
              className="flex-1 bg-[#050d17] border border-white/15 rounded-lg px-3 py-2 text-white text-sm
                focus:outline-none focus:border-cyan-500/50 transition font-mono" />
            <button onClick={handleTestKey} disabled={testing}
              className="px-3 py-2 text-xs bg-white/5 hover:bg-white/10 border border-white/15 rounded-lg
                text-slate-400 hover:text-white transition-all">
              {testing ? '⟳' : '🧪 Test'}
            </button>
          </div>
          <p className="text-xs text-slate-600 mt-1">Lấy key tại <a href="https://console.anthropic.com" target="_blank"
            className="text-cyan-500 hover:underline">console.anthropic.com</a></p>
        </div>
        <div>
          <label className="text-xs text-slate-500 mb-1 block">Model</label>
          <select value={model} onChange={e => setModel(e.target.value)}
            className="w-full bg-[#050d17] border border-white/15 rounded-lg px-3 py-2 text-slate-300 text-sm
              focus:outline-none focus:border-cyan-500/50 transition">
            {MODELS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </div>
        <motion.button whileTap={{ scale: 0.97 }} onClick={handleSaveKey}
          className="w-full py-2 bg-cyan-500 hover:bg-cyan-400 text-[#050d17] font-bold rounded-lg text-sm transition-all">
          💾 Lưu cài đặt Claude
        </motion.button>
      </Section>

      {/* Backend */}
      <Section title="🔌 Backend API">
        <div>
          <label className="text-xs text-slate-500 mb-1 block">Backend URL</label>
          <div className="flex gap-2">
            <input value={backendInput} onChange={e => setBackendInput(e.target.value)}
              placeholder="http://localhost:8000"
              className="flex-1 bg-[#050d17] border border-white/15 rounded-lg px-3 py-2 text-white text-sm
                focus:outline-none focus:border-cyan-500/50 transition font-mono" />
            <button onClick={() => { setBackendUrl(backendInput); toast.success('Đã lưu!') }}
              className="px-3 py-2 text-xs bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/35 rounded-lg
                text-cyan-400 transition-all">
              Lưu
            </button>
          </div>
          <p className="text-xs text-slate-600 mt-1">Khởi động: <code className="text-cyan-500">uvicorn app.main:app --reload</code></p>
        </div>
      </Section>

      {/* Price Alerts */}
      <Section title="🔔 Price Alerts">
        <AlertForm onSubmit={create} loading={alertLoading} />
        <AlertList alerts={alerts} onDelete={remove} />
      </Section>

      {/* Info */}
      <Section title="ℹ️ Thông tin">
        <div className="text-xs text-slate-500 space-y-1.5">
          <div>Version: <span className="text-white">VN Stock AI Predictor v2.0</span></div>
          <div>Stack: <span className="text-white">React 18 + TypeScript + FastAPI + vnstock3 + Claude AI</span></div>
          <div className="pt-2 text-slate-700">
            Dữ liệu từ vnstock3 (VCI/SSI). Phân tích AI chỉ mang tính tham khảo.
          </div>
        </div>
      </Section>
    </div>
  )
}
