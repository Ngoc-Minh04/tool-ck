// ===== MARKET: SECTOR SIGNALS =====

const SectorSignals = ({ sectors = [] }) => {
  return (
    <div className="glass-card p-3.5">
      <h3 className="text-xs font-semibold text-slate-300 mb-2.5 flex items-center gap-2">
        🏭 Phân ngành
      </h3>
      <div className="space-y-1.5">
        {sectors.map((sector) => {
          const pct = parseFloat(sector.change).toFixed(2);
          const isUp = sector.change > 0;
          const barWidth = Math.min(Math.abs(sector.change) * 15, 100);

          return (
            <div key={sector.id} className="flex items-center gap-2 text-xs">
              <span className="text-xs">{sector.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center mb-0.5">
                  <span className="text-[11px] text-slate-400 truncate pr-2">{sector.name}</span>
                  <span
                    className="text-[11px] font-num font-bold"
                    style={{ color: isUp ? '#00e676' : '#ff5252' }}
                  >
                    {isUp ? '+' : ''}{pct}%
                  </span>
                </div>
                {/* Progress bar */}
                <div className="h-1 rounded-full" style={{ background: 'rgba(79,195,247,0.08)' }}>
                  <div
                    className="h-1 rounded-full transition-all duration-500"
                    style={{
                      width: `${barWidth}%`,
                      background: isUp ? '#00e676' : '#ff5252',
                      opacity: 0.7,
                      marginLeft: isUp ? 0 : `${100 - barWidth}%`,
                    }}
                  />
                </div>
              </div>
              <span className="text-[10px] font-num text-slate-500 w-12 text-right">
                {(sector.volume / 1e9).toFixed(1)}B
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SectorSignals;
