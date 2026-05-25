import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { motion, AnimatePresence } from 'framer-motion'
import SignalBadge from './SignalBadge'
import { extractSignal, fmtPrice } from '../../utils/formatters'
import { useAppStore } from '../../store/appStore'

interface Props {
  ticker: string
  content: string
  streaming?: boolean
  technicals?: any
  info?: any
  onSave?: () => void
  saved?: boolean
}

export default function ResultCard({ ticker, content, streaming, technicals, info, onSave, saved }: Props) {
  const signal = extractSignal(content)
  const { addHistory } = useAppStore()

  const handleSave = () => {
    addHistory({ ticker, content, signal, timestamp: new Date().toISOString() })
    onSave?.()
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[#0d1b2a] rounded-2xl border border-white/10 overflow-hidden"
    >
      {/* Card header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/10 bg-white/[0.02]">
        <div className="flex items-center gap-3">
          <span className="font-mono font-bold text-cyan-400 text-lg">{ticker}</span>
          {info?.industry && <span className="text-xs text-slate-500 bg-white/5 px-2 py-0.5 rounded-full">{info.industry}</span>}
          {!streaming && content && <SignalBadge signal={signal} size="sm" />}
        </div>
        <div className="flex items-center gap-2">
          {technicals?.close && (
            <span className="text-sm text-slate-400 font-mono">{fmtPrice(technicals.close)}</span>
          )}
          {!streaming && content && !saved && (
            <button onClick={handleSave}
              className="text-xs px-3 py-1 bg-white/5 hover:bg-cyan-500/15 text-slate-400 hover:text-cyan-400
                border border-white/10 hover:border-cyan-500/30 rounded-lg transition-all">
              💾 Lưu
            </button>
          )}
          {saved && <span className="text-xs text-green-400">✓ Đã lưu</span>}
        </div>
      </div>

      {/* Content */}
      <div className="px-5 py-4 prose prose-invert prose-sm max-w-none
        prose-headings:text-cyan-400 prose-strong:text-white prose-code:text-cyan-300
        prose-blockquote:border-cyan-500 prose-a:text-cyan-400">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
        <AnimatePresence>
          {streaming && (
            <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="inline-block w-2 h-4 bg-cyan-400 ml-1 animate-pulse rounded-sm" />
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}
