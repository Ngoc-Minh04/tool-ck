// ===== TRANG CHAT VỚI AI =====

import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Plus, Trash2, MessageSquare, Globe, ChevronDown, Check } from 'lucide-react';
import Header from '../components/Layout/Header';
import MessageBubble from '../components/Chat/MessageBubble';
import QuickPrompts from '../components/Chat/QuickPrompts';
import { LoadingDots, EmptyState } from '../components/UI';
import useClaude from '../hooks/useClaude';
import useAppStore from '../store/appStore';
import { STOCK_ANALYST_SYSTEM_PROMPT } from '../constants/prompts';
import { MODELS } from '../constants/sources';

const ChatPage = () => {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const { loading, chat } = useClaude();
  const {
    chatSessions,
    currentChatId,
    createChatSession,
    addChatMessage,
    deleteChatSession,
    setCurrentChat,
    getCurrentChat,
  } = useAppStore();
  const settings = useAppStore((s) => s.settings);
  const updateSettings = useAppStore((s) => s.updateSettings);

  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setModelDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const currentModel = MODELS.find((m) => m.value === settings?.model) || MODELS[3];

  const currentSession = getCurrentChat();

  // Auto-scroll xuống cuối
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentSession?.messages]);

  // Tạo session mới nếu chưa có
  useEffect(() => {
    if (!currentChatId) {
      createChatSession();
    }
  }, []);

  const handleSend = useCallback(async (text = input) => {
    const msg = text.trim();
    if (!msg || loading) return;

    setInput('');

    // Đảm bảo có session
    let sessionId = currentChatId;
    if (!sessionId) {
      sessionId = createChatSession();
    }

    // Thêm user message
    addChatMessage(sessionId, { role: 'user', content: msg });

    // Lấy lịch sử messages
    const session = chatSessions.find(s => s.id === sessionId) || { messages: [] };
    const historyMessages = [...(session.messages || []), { role: 'user', content: msg }]
      .map(m => ({ role: m.role, content: m.content }))
      .slice(-20); // Giới hạn 20 messages gần nhất

    // Gọi Claude
    const response = await chat({
      systemPrompt: STOCK_ANALYST_SYSTEM_PROMPT,
      messages: historyMessages,
    });

    if (response) {
      addChatMessage(sessionId, { role: 'assistant', content: response });
    }

    // Focus lại input
    inputRef.current?.focus();
  }, [input, loading, currentChatId, chatSessions, createChatSession, addChatMessage, chat]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex h-full overflow-hidden">
      {/* Session List (left panel) */}
      <div
        className="flex-shrink-0 flex flex-col"
        style={{
          width: 220,
          background: 'rgba(13,27,42,0.8)',
          borderRight: '1px solid rgba(79,195,247,0.08)',
        }}
      >
        <div className="p-3" style={{ borderBottom: '1px solid rgba(79,195,247,0.08)' }}>
          <button
            onClick={() => {
              const id = createChatSession();
              setCurrentChat(id);
            }}
            className="w-full flex items-center justify-center gap-2 py-2 text-sm rounded-lg cursor-pointer border-none transition-all"
            style={{ background: 'rgba(79,195,247,0.1)', color: '#4fc3f7', border: '1px solid rgba(79,195,247,0.2)' }}
          >
            <Plus size={14} />
            Chat mới
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {chatSessions.map((session) => (
            <div
              key={session.id}
              onClick={() => setCurrentChat(session.id)}
              className="group flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-all"
              style={{
                background: session.id === currentChatId ? 'rgba(79,195,247,0.1)' : 'transparent',
                border: `1px solid ${session.id === currentChatId ? 'rgba(79,195,247,0.2)' : 'transparent'}`,
              }}
            >
              <MessageSquare size={12} style={{ color: session.id === currentChatId ? '#4fc3f7' : '#4a6b8a', flexShrink: 0 }} />
              <span
                className="flex-1 text-xs truncate"
                style={{ color: session.id === currentChatId ? '#4fc3f7' : '#64748b' }}
              >
                {session.title || 'Phiên chat mới'}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteChatSession(session.id);
                }}
                className="opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer border-none bg-transparent text-red-400"
              >
                <Trash2 size={11} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header title="Chat với Claude AI" />

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {!currentSession || currentSession.messages.length === 0 ? (
            <EmptyState
              icon="🤖"
              title="Hỏi Claude về thị trường"
              description="Đặt câu hỏi về cổ phiếu, phân tích kỹ thuật, hoặc xu hướng thị trường Việt Nam."
            />
          ) : (
            <>
              {currentSession.messages.map((msg) => (
                <MessageBubble key={msg.id} message={msg} />
              ))}

              {/* Loading indicator */}
              {loading && (
                <div className="flex gap-3">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: 'linear-gradient(135deg, #1a2f45, #4fc3f7)', border: '1px solid rgba(79,195,247,0.5)' }}
                  >
                    🤖
                  </div>
                  <div
                    className="px-4 py-3 rounded-2xl"
                    style={{ background: 'rgba(26,47,69,0.7)', border: '1px solid rgba(79,195,247,0.1)', borderRadius: '4px 18px 18px 18px' }}
                  >
                    <LoadingDots />
                  </div>
                </div>
              )}
            </>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Prompts + Input */}
        <div
          className="p-4 space-y-3"
          style={{ borderTop: '1px solid rgba(79,195,247,0.08)', background: 'rgba(13,27,42,0.5)' }}
        >
          <div className="flex flex-wrap justify-between items-center gap-2">
            <QuickPrompts onSelect={(text) => handleSend(text)} disabled={loading} />
            
            <div className="flex items-center gap-2">
              {/* Model Selector Dropdown */}
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setModelDropdownOpen(!modelDropdownOpen)}
                  disabled={loading}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg cursor-pointer transition-all text-slate-300 hover:text-cyan-400 text-xs border bg-transparent"
                  style={{
                    borderColor: 'rgba(79,195,247,0.15)',
                    background: 'rgba(13,27,42,0.4)',
                  }}
                  title="Chọn Model AI"
                >
                  <span className="text-cyan-400 font-semibold">{currentModel?.label || 'Chọn Model'}</span>
                  <ChevronDown size={12} className="text-slate-400" />
                </button>

                {modelDropdownOpen && (
                  <div
                    className="absolute right-0 bottom-full mb-2 w-72 rounded-xl border p-1 shadow-2xl z-50 transition-all duration-200"
                    style={{
                      background: 'rgba(15, 23, 42, 0.95)',
                      borderColor: 'rgba(79, 195, 247, 0.2)',
                      backdropFilter: 'blur(12px)',
                      maxHeight: '350px',
                      overflowY: 'auto',
                    }}
                  >
                    <div className="px-3 py-2 text-[10px] font-bold text-cyan-400 uppercase tracking-wider border-b border-cyan-500/10">
                      Chọn mô hình AI
                    </div>
                    <div className="py-1">
                      {MODELS.map((model) => {
                        const isSelected = model.value === settings?.model;
                        return (
                          <button
                            key={model.value}
                            type="button"
                            onClick={() => {
                              updateSettings({ model: model.value });
                              setModelDropdownOpen(false);
                            }}
                            className="w-full text-left px-3 py-2 rounded-lg transition-all flex items-start gap-2 hover:bg-cyan-500/10 cursor-pointer border-none bg-transparent"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 justify-between">
                                <span className={`text-xs font-medium ${isSelected ? 'text-cyan-400' : 'text-slate-200'}`}>
                                  {model.label}
                                </span>
                                {isSelected && <Check size={12} className="text-cyan-400 flex-shrink-0" />}
                              </div>
                              {model.description && (
                                <p className="text-[10px] text-slate-400 mt-0.5 leading-normal break-words whitespace-normal">
                                  {model.description}
                                </p>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Google Search Toggle */}
              <button
                type="button"
                onClick={() => updateSettings({ googleSearch: !settings.googleSearch })}
                disabled={loading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg cursor-pointer transition-all text-slate-300 hover:text-cyan-400 text-xs border bg-transparent"
                style={{
                  borderColor: settings.googleSearch ? 'rgba(79,195,247,0.3)' : 'rgba(79,195,247,0.08)',
                  background: settings.googleSearch ? 'rgba(79,195,247,0.1)' : 'rgba(13,27,42,0.4)',
                }}
                title={settings.googleSearch ? 'Tắt Tìm kiếm Google' : 'Bật Tìm kiếm Google'}
              >
                <Globe size={13} className={settings.googleSearch ? 'text-cyan-400' : 'text-slate-500'} />
                <span>Tìm kiếm Google: <strong className={settings.googleSearch ? 'text-cyan-400' : 'text-slate-500'}>{settings.googleSearch ? 'BẬT' : 'TẮT'}</strong></span>
              </button>
            </div>
          </div>

          <div className="flex gap-3">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Hỏi về cổ phiếu, thị trường... (Enter để gửi, Shift+Enter xuống dòng)"
              rows={2}
              className="input-dark flex-1 resize-none"
              style={{ fontFamily: 'inherit', lineHeight: 1.5 }}
            />
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || loading}
              className="flex items-center justify-center rounded-xl cursor-pointer border-none transition-all disabled:opacity-40"
              style={{
                width: 52,
                minHeight: 52,
                background: 'linear-gradient(135deg, #1a3a5c, #4fc3f7)',
                color: '#0d1b2a',
              }}
            >
              {loading ? <LoadingDots size="sm" color="white" /> : <Send size={18} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatPage;
