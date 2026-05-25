import { useState } from 'react'
import { motion } from 'framer-motion'

interface Props { onSubmit: (data: any) => void; loading: boolean }

export default function AlertForm({ onSubmit, loading }: Props) {
  const [ticker, setTicker] = useState('')
  const [condition, setCondition] = useState<'above' | 'below'>('above')
  const [price, setPrice] = useState('')
  const [chatId, setChatId] = useState('')
  const [note, setNote] = useState('')

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!ticker || !price) return
    onSubmit({ ticker: ticker.toUpperCase(), condition, price: Number(price), telegram_chat_id: chatId || undefined, note: note || undefined })
    setTicker(''); setPrice(''); setNote('')
  }

  return (
    <form onSubmit={submit} className="bg-[#0d1b2a] rounded-2xl border border-white/10 p-5 space-y-4">
      <div className="text-sm font-semibold text-white">🔔 Tạo cảnh báo giá</div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-slate-500 mb-1 block">Mã CK</label>
          <input value={ticker} onChange={e => setTicker(e.target.value.toUpperCase())}
            placeholder="VCB" maxLength={10}
            className="w-full bg-[#050d17] border border-white/15 rounded-lg px-3 py-2 text-white text-sm font-mono
              focus:outline-none focus:border-cyan-500/50 transition" />
        </div>
        <div>
          <label className="text-xs text-slate-500 mb-1 block">Điều kiện</label>
          <select value={condition} onChange={e => setCondition(e.target.value as any)}
            className="w-full bg-[#050d17] border border-white/15 rounded-lg px-3 py-2 text-slate-300 text-sm
              focus:outline-none focus:border-cyan-500/50 transition">
            <option value="above">Vượt lên trên</option>
            <option value="below">Xuống dưới</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-slate-500 mb-1 block">Giá (VND)</label>
          <input type="number" value={price} onChange={e => setPrice(e.target.value)}
            placeholder="85000"
            className="w-full bg-[#050d17] border border-white/15 rounded-lg px-3 py-2 text-white text-sm font-mono
              focus:outline-none focus:border-cyan-500/50 transition" />
        </div>
        <div>
          <label className="text-xs text-slate-500 mb-1 block">Telegram Chat ID (tuỳ chọn)</label>
          <input value={chatId} onChange={e => setChatId(e.target.value)}
            placeholder="-100123456789"
            className="w-full bg-[#050d17] border border-white/15 rounded-lg px-3 py-2 text-white text-sm
              focus:outline-none focus:border-cyan-500/50 transition" />
        </div>
      </div>
      <input value={note} onChange={e => setNote(e.target.value)}
        placeholder="Ghi chú (tuỳ chọn)..."
        className="w-full bg-[#050d17] border border-white/15 rounded-lg px-3 py-2 text-white text-sm
          focus:outline-none focus:border-cyan-500/50 transition" />
      <motion.button whileTap={{ scale: 0.97 }} type="submit"
        disabled={loading || !ticker || !price}
        className="w-full py-2.5 bg-cyan-500 hover:bg-cyan-400 disabled:bg-slate-700 disabled:text-slate-500
          text-[#050d17] font-bold rounded-xl transition-all text-sm">
        {loading ? '⟳ Đang tạo...' : '+ Tạo Alert'}
      </motion.button>
    </form>
  )
}
