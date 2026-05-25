import { useState, useRef, useEffect } from 'react'
import MessageBubble from '../components/Chat/MessageBubble'
import QuickPrompts from '../components/Chat/QuickPrompts'
import Disclaimer from '../components/UI/Disclaimer'
import { useClaude } from '../hooks/useClaude'
import { useChatStore } from '../store/chatStore'
import { STOCK_ANALYST_SYSTEM_PROMPT } from '../constants/prompts'
import { motion } from 'framer-motion'

export default function ChatPage() {
  const [input, setInput] = useState('')
  const [streamMsg, setStreamMsg] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const { messages, addMessage, clearMessages } = useChatStore()
  const { loading, streamContent, analyze, clearStream } = useClaude()

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamContent])

  const send = async (text: string) => {
    if (!text.trim() || loading) return
    const userText = text.trim()
    setInput('')
    clearStream()
    setStreamMsg('')
    addMessage({ role: 'user', content: userText, timestamp: new Date().toISOString() })

    const history = messages.map(m => ({ role: m.role, content: m.content }))
    const res = await analyze({
      systemPrompt: STOCK_ANALYST_SYSTEM_PROMPT,
      userMessage: userText,
      history,
      stream: true,
    })
    if (res) {
      addMessage({ role: 'assistant', content: res, timestamp: new Date().toISOString() })
    }
    clearStream()
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input) }
  }

  return (
    <div className="max-w-3xl mx-auto flex flex-col h-[calc(100vh-5.5rem)]">
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4">
        <div className="text-xs text-slate-500">
          Chat đa lượt · Claude nhớ ngữ cảnh trong phiên
        </div>
        {messages.length > 0 && (
          <button onClick={clearMessages}
            className="text-xs px-3 py-1 text-slate-600 hover:text-red-400 bg-white/4 hover:bg-red-500/10
              border border-white/10 hover:border-red-500/25 rounded-lg transition-all">
            🗑 Xóa chat
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1 custom-scrollbar">
        {messages.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center h-full text-center text-slate-700 gap-4">
            <div className="text-5xl">🤖</div>
            <div>
              <div className="text-slate-400 font-medium">Xin chào! Tôi là chuyên gia phân tích CK Việt Nam</div>
              <div className="text-sm mt-1">Hỏi tôi về bất kỳ cổ phiếu, chiến lược hay thị trường nào</div>
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <MessageBubble key={i} role={m.role as any} content={m.content} timestamp={m.timestamp} />
        ))}

        {loading && streamContent && (
          <MessageBubble role="assistant" content={streamContent} streaming />
        )}
        {loading && !streamContent && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-violet-500/20 border border-violet-500/30 flex items-center justify-center text-sm">🤖</div>
            <div className="bg-[#0d1b2a] border border-white/10 rounded-2xl rounded-tl-sm px-4 py-3">
              <div className="flex gap-1.5 items-center h-4">
                {[0,1,2].map(i => (
                  <span key={i} className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Quick prompts */}
      {messages.length === 0 && (
        <div className="my-3">
          <QuickPrompts onSelect={t => send(t)} />
        </div>
      )}

      {/* Input */}
      <div className="mt-3 flex gap-2">
        <textarea value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKey}
          placeholder="Hỏi về cổ phiếu, chiến lược, thị trường... (Enter để gửi)"
          rows={2}
          className="flex-1 bg-[#0d1b2a] border border-white/15 rounded-xl px-4 py-3 text-white text-sm
            placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/50 resize-none
            focus:ring-1 focus:ring-cyan-500/20 transition" />
        <motion.button whileTap={{ scale: 0.95 }} onClick={() => send(input)}
          disabled={loading || !input.trim()}
          className="px-5 py-3 bg-cyan-500 hover:bg-cyan-400 disabled:bg-slate-700 disabled:text-slate-500
            text-[#050d17] font-bold rounded-xl transition-all self-end">
          {loading ? '⟳' : '➤'}
        </motion.button>
      </div>

      <div className="mt-2">
        <Disclaimer />
      </div>
    </div>
  )
}
