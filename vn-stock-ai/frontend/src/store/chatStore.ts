import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp?: string
}

interface SimpleChatState {
  messages: ChatMessage[]
  addMessage: (msg: ChatMessage) => void
  clearMessages: () => void
}

// Simple flat chat store for ChatPage (single-session multi-turn)
export const useChatStore = create<SimpleChatState>()(
  persist(
    (set) => ({
      messages: [],

      addMessage: (msg) =>
        set(s => ({
          messages: [...s.messages, { ...msg, timestamp: msg.timestamp || new Date().toISOString() }],
        })),

      clearMessages: () => set({ messages: [] }),
    }),
    { name: 'vn-stock-chat-v2' }
  )
)
