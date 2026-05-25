import { QUICK_PROMPTS } from '../../constants/prompts'

export default function QuickPrompts({ onSelect }: { onSelect: (text: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {QUICK_PROMPTS.map((p, i) => (
        <button key={i} onClick={() => onSelect(p.text)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-white/5 hover:bg-cyan-500/15
            border border-white/10 hover:border-cyan-500/30 text-slate-400 hover:text-cyan-400
            rounded-full transition-all">
          <span>{p.icon}</span>{p.text}
        </button>
      ))}
    </div>
  )
}
