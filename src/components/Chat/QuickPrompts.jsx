// ===== CHAT: QUICK PROMPTS =====

import { QUICK_PROMPTS } from '../../constants/prompts';

const QuickPrompts = ({ onSelect, disabled }) => {
  return (
    <div className="flex flex-wrap gap-2 pb-1">
      {QUICK_PROMPTS.map((prompt) => (
        <button
          key={prompt.id}
          onClick={() => onSelect(prompt.text)}
          disabled={disabled}
          className="text-xs px-3 py-1.5 rounded-full cursor-pointer transition-all duration-200 border-none whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed"
          style={{
            background: 'rgba(26, 47, 69, 0.8)',
            color: '#94a3b8',
            border: '1px solid rgba(79, 195, 247, 0.15)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(79, 195, 247, 0.1)';
            e.currentTarget.style.color = '#4fc3f7';
            e.currentTarget.style.borderColor = 'rgba(79, 195, 247, 0.4)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(26, 47, 69, 0.8)';
            e.currentTarget.style.color = '#94a3b8';
            e.currentTarget.style.borderColor = 'rgba(79, 195, 247, 0.15)';
          }}
        >
          {prompt.icon} {prompt.text}
        </button>
      ))}
    </div>
  );
};

export default QuickPrompts;
