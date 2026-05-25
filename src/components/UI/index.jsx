// ===== UI: LOADING DOTS =====

export const LoadingDots = ({ size = 'md', color = 'cyan' }) => {
  const sizes = { sm: 'w-1.5 h-1.5', md: 'w-2 h-2', lg: 'w-3 h-3' };
  const colors = { cyan: 'bg-cyan-400', white: 'bg-white', gray: 'bg-slate-400' };

  return (
    <div className="flex items-center gap-1">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className={`${sizes[size]} ${colors[color]} rounded-full animate-dot-bounce`}
          style={{ animationDelay: `${i * 0.16}s` }}
        />
      ))}
    </div>
  );
};

// ===== UI: SKELETON =====
export const Skeleton = ({ className = '', height = 'h-4', width = 'w-full' }) => (
  <div className={`skeleton ${height} ${width} ${className}`} />
);

export const SkeletonCard = () => (
  <div className="glass-card p-4 space-y-3">
    <Skeleton height="h-5" width="w-1/3" />
    <Skeleton height="h-4" />
    <Skeleton height="h-4" width="w-4/5" />
    <Skeleton height="h-4" width="w-2/3" />
  </div>
);

// ===== UI: BUTTON =====
export const Button = ({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  icon: Icon,
  className = '',
  type = 'button',
}) => {
  const base = 'inline-flex items-center gap-2 font-medium rounded-lg transition-all duration-200 cursor-pointer border-none';

  const variants = {
    primary: 'bg-cyan-400 text-navy-900 hover:bg-cyan-300 active:scale-95 disabled:opacity-50',
    secondary: 'bg-navy-800 text-slate-200 border border-cyan-400/20 hover:border-cyan-400/50 hover:bg-navy-700',
    danger: 'bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20',
    ghost: 'text-slate-400 hover:text-cyan-400 hover:bg-navy-800',
    outline: 'border border-cyan-400/40 text-cyan-400 hover:bg-cyan-400/10',
  };

  const sizes = {
    sm: 'text-xs px-3 py-1.5',
    md: 'text-sm px-4 py-2',
    lg: 'text-base px-6 py-3',
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      style={{
        backgroundColor: variant === 'primary' ? '#4fc3f7' : undefined,
        color: variant === 'primary' ? '#0d1b2a' : undefined,
      }}
    >
      {loading ? <LoadingDots size="sm" color={variant === 'primary' ? 'white' : 'cyan'} /> : Icon && <Icon size={size === 'sm' ? 14 : size === 'lg' ? 20 : 16} />}
      {children}
    </button>
  );
};

// ===== UI: BADGE =====
export const Badge = ({ children, variant = 'default', size = 'sm' }) => {
  const variants = {
    default: 'bg-navy-700 text-slate-300',
    cyan: 'bg-cyan-400/10 text-cyan-400 border border-cyan-400/20',
    green: 'bg-green-400/10 text-green-400 border border-green-400/20',
    red: 'bg-red-400/10 text-red-400 border border-red-400/20',
    yellow: 'bg-yellow-400/10 text-yellow-400 border border-yellow-400/20',
    buy: 'signal-buy',
    sell: 'signal-sell',
    hold: 'signal-hold',
  };

  const sizes = { xs: 'text-xs px-1.5 py-0.5', sm: 'text-xs px-2 py-1', md: 'text-sm px-3 py-1' };

  return (
    <span className={`inline-flex items-center font-semibold rounded-md ${variants[variant]} ${sizes[size]}`}>
      {children}
    </span>
  );
};

// ===== UI: TABS =====
export const Tabs = ({ tabs, activeTab, onChange }) => (
  <div className="flex gap-1 p-1 rounded-lg" style={{ background: '#0d1b2a' }}>
    {tabs.map((tab) => (
      <button
        key={tab.value}
        onClick={() => onChange(tab.value)}
        className={`flex-1 text-xs font-medium px-3 py-1.5 rounded-md transition-all duration-200 cursor-pointer border-none ${
          activeTab === tab.value
            ? 'text-navy-900 shadow-sm'
            : 'text-slate-400 hover:text-slate-200'
        }`}
        style={{
          backgroundColor: activeTab === tab.value ? '#4fc3f7' : 'transparent',
          color: activeTab === tab.value ? '#0d1b2a' : undefined,
        }}
      >
        {tab.label}
      </button>
    ))}
  </div>
);

// ===== UI: SELECT =====
export const Select = ({ value, onChange, options, className = '' }) => (
  <select
    value={value}
    onChange={(e) => onChange(e.target.value)}
    className={`select-dark ${className}`}
  >
    {options.map((opt) => (
      <option key={opt.value} value={opt.value}>
        {opt.label}
      </option>
    ))}
  </select>
);

// ===== UI: INPUT =====
export const Input = ({ value, onChange, placeholder, className = '', type = 'text', onKeyDown, autoFocus, readOnly }) => (
  <input
    type={type}
    value={value}
    onChange={(e) => onChange(e.target.value)}
    placeholder={placeholder}
    className={`input-dark ${className}`}
    onKeyDown={onKeyDown}
    autoFocus={autoFocus}
    readOnly={readOnly}
  />
);

// ===== UI: DIVIDER =====
export const Divider = ({ className = '' }) => (
  <div className={`border-t border-cyan-400/10 ${className}`} />
);

// ===== UI: TOOLTIP =====
export const Tooltip = ({ children, text }) => (
  <div className="relative group inline-flex">
    {children}
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50"
      style={{ background: '#1a2f45', border: '1px solid rgba(79,195,247,0.3)' }}>
      {text}
    </div>
  </div>
);

// ===== UI: EMPTY STATE =====
export const EmptyState = ({ icon, title, description, action }) => (
  <div className="flex flex-col items-center justify-center py-16 text-center">
    <div className="text-5xl mb-4">{icon}</div>
    <h3 className="text-lg font-semibold text-slate-200 mb-2">{title}</h3>
    {description && <p className="text-sm text-slate-500 max-w-xs mb-4">{description}</p>}
    {action}
  </div>
);
