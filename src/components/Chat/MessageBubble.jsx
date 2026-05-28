// ===== CHAT: MESSAGE BUBBLE =====

import ReactMarkdown from 'react-markdown';
import { User, Bot, Copy } from 'lucide-react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import toast from 'react-hot-toast';

const MessageBubble = ({ message }) => {
  const { role, content, id } = message;
  const isUser = role === 'user';
  const timestamp = id ? new Date(parseInt(id)) : new Date();

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    toast.success('Đã sao chép!');
  };

  return (
    <div className={`flex gap-3 group animate-fade-in-up ${isUser ? 'flex-row-reverse' : ''}`}>
      {/* Avatar */}
      <div
        className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
        style={{
          background: isUser
            ? 'linear-gradient(135deg, #1a3a5c, #2563a0)'
            : 'linear-gradient(135deg, #1a2f45, #4fc3f7)',
          border: `1px solid ${isUser ? 'rgba(79,195,247,0.3)' : 'rgba(79,195,247,0.5)'}`,
        }}
      >
        {isUser ? <User size={14} color="#4fc3f7" /> : <Bot size={14} color="#0d1b2a" />}
      </div>

      {/* Bubble */}
      <div className={`flex-1 max-w-[85%] ${isUser ? 'items-end' : 'items-start'} flex flex-col`}>
        <div
          className="rounded-2xl px-4 py-3 relative"
          style={{
            background: isUser
              ? 'linear-gradient(135deg, #1a3a5c, #1e4d7b)'
              : 'rgba(26, 47, 69, 0.7)',
            border: `1px solid ${isUser ? 'rgba(79,195,247,0.2)' : 'rgba(79,195,247,0.1)'}`,
            borderRadius: isUser ? '18px 4px 18px 18px' : '4px 18px 18px 18px',
          }}
        >
          {message.image && (
            <div className="mb-2 max-w-sm rounded-lg overflow-hidden border border-cyan-500/20 bg-slate-950/40">
              <img
                src={message.image.base64.startsWith('data:') ? message.image.base64 : `data:${message.image.mimeType};base64,${message.image.base64}`}
                alt="Uploaded attachment"
                className="max-h-60 w-auto object-contain rounded-lg"
              />
            </div>
          )}
          {isUser ? (
            <p className="text-sm text-slate-200 whitespace-pre-wrap">{content}</p>
          ) : (
            <div className="markdown-content text-sm text-slate-300">
              <ReactMarkdown>{content}</ReactMarkdown>
            </div>
          )}
        </div>

        {/* Time + Copy */}
        <div className={`flex items-center gap-2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity ${isUser ? 'flex-row-reverse' : ''}`}>
          <span className="text-xs text-slate-600">
            {format(timestamp, 'HH:mm', { locale: vi })}
          </span>
          {!isUser && (
            <button
              onClick={handleCopy}
              className="text-slate-600 hover:text-cyan-400 transition-colors cursor-pointer border-none bg-transparent"
            >
              <Copy size={11} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;
