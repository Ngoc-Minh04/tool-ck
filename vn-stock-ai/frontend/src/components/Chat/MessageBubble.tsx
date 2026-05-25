import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { motion } from 'framer-motion'

interface Props {
  role: 'user' | 'assistant'
  content: string
  streaming?: boolean
  timestamp?: string
}

export default function MessageBubble({ role, content, streaming, timestamp }: Props) {
  const isUser = role === 'user'
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
    >
      {/* Avatar */}
      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0
        ${isUser ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'bg-violet-500/20 text-violet-400 border border-violet-500/30'}`}>
        {isUser ? '👤' : '🤖'}
      </div>

      {/* Bubble */}
      <div className={`max-w-[78%] ${isUser ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
        <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed
          ${isUser
            ? 'bg-cyan-500/15 border border-cyan-500/25 text-white rounded-tr-sm'
            : 'bg-[#0d1b2a] border border-white/10 text-slate-200 rounded-tl-sm'
          } prose prose-invert prose-sm max-w-none
          prose-headings:text-cyan-400 prose-strong:text-white prose-code:text-cyan-300
          prose-a:text-cyan-400 prose-blockquote:border-cyan-500`}
        >
          {isUser ? (
            <p className="m-0">{content}</p>
          ) : (
            <>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
              {streaming && (
                <span className="inline-block w-2 h-3.5 bg-cyan-400 ml-0.5 animate-pulse rounded-sm align-middle" />
              )}
            </>
          )}
        </div>
        {timestamp && (
          <span className="text-xs text-slate-700 px-1">
            {new Date(timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
      </div>
    </motion.div>
  )
}
