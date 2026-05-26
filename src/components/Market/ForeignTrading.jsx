// ===== MARKET: FOREIGN TRADING =====

import { TrendingUp, TrendingDown } from 'lucide-react';

const ForeignTrading = ({ data }) => {
  if (!data) return null;
  const { topBuy, topSell } = data;

  const slicedBuy = (topBuy || []).slice(0, 5);
  const slicedSell = (topSell || []).slice(0, 5);

  const renderList = (items, isBuy) => {
    if (!items.length) {
      return (
        <div className="text-slate-500 text-[10px] py-4 text-center border border-dashed border-slate-800 rounded-lg">
          Không có giao dịch ròng
        </div>
      );
    }

    const maxVal = items.length > 0 ? Math.max(...items.map(item => Math.abs(item.value))) : 1;

    return (
      <div className="space-y-1.5">
        {items.map((item) => {
          const absVal = Math.abs(item.value);
          const barWidth = maxVal ? (absVal / maxVal) * 100 : 0;

          return (
            <div key={item.ticker} className="flex items-center gap-1.5 text-xs">
              <span className="text-[11px] font-num font-bold text-slate-300 w-8 truncate">{item.ticker}</span>
              <div className="flex-1 relative h-4 flex items-center bg-slate-800/20 rounded">
                <div
                  className="absolute h-3.5 rounded-sm"
                  style={{
                    width: `${barWidth}%`,
                    background: isBuy ? 'rgba(0,230,118,0.12)' : 'rgba(255,82,82,0.12)',
                    border: `1px solid ${isBuy ? 'rgba(0,230,118,0.25)' : 'rgba(255,82,82,0.25)'}`,
                    left: isBuy ? 0 : `${100 - barWidth}%`,
                  }}
                />
                <span
                  className="relative text-[10px] font-num font-semibold"
                  style={{ color: isBuy ? '#00e676' : '#ff5252', zIndex: 1, paddingLeft: 4 }}
                >
                  {isBuy ? '+' : ''}{item.value.toFixed(1)}B
                </span>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="glass-card p-3.5">
      <h3 className="text-xs font-semibold text-slate-300 mb-3 flex items-center gap-2">
        💰 Dòng tiền khối ngoại (ĐTNN)
      </h3>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <div className="flex items-center gap-1 text-[11px] text-green-400 font-semibold mb-1.5">
            <TrendingUp size={11} /> Top mua ròng
          </div>
          {renderList(slicedBuy, true)}
        </div>
        <div>
          <div className="flex items-center gap-1 text-[11px] text-red-400 font-semibold mb-1.5">
            <TrendingDown size={11} /> Top bán ròng
          </div>
          {renderList(slicedSell, false)}
        </div>
      </div>
    </div>
  );
};

export default ForeignTrading;
