// ===== MARKET: FOREIGN TRADING =====

import { TrendingUp, TrendingDown } from 'lucide-react';

const ForeignTrading = ({ data }) => {
  if (!data) return null;
  const { topBuy, topSell } = data;

  const renderList = (items, isBuy) => (
    <div className="space-y-2">
      {items.map((item, i) => {
        const absVal = Math.abs(item.value);
        const barWidth = (absVal / Math.abs(items[0].value)) * 100;

        return (
          <div key={item.ticker} className="flex items-center gap-2">
            <span className="text-xs font-num font-bold text-slate-300 w-10">{item.ticker}</span>
            <div className="flex-1 relative h-5 flex items-center">
              <div
                className="absolute h-4 rounded"
                style={{
                  width: `${barWidth}%`,
                  background: isBuy ? 'rgba(0,230,118,0.15)' : 'rgba(255,82,82,0.15)',
                  border: `1px solid ${isBuy ? 'rgba(0,230,118,0.3)' : 'rgba(255,82,82,0.3)'}`,
                  left: isBuy ? 0 : `${100 - barWidth}%`,
                }}
              />
              <span
                className="relative text-xs font-num"
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

  return (
    <div className="glass-card p-4">
      <h3 className="text-sm font-semibold text-slate-200 mb-4 flex items-center gap-2">
        💰 Dòng tiền khối ngoại (ĐTNN)
      </h3>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="flex items-center gap-1 text-xs text-green-400 font-semibold mb-2">
            <TrendingUp size={12} /> Top mua ròng
          </div>
          {renderList(topBuy, true)}
        </div>
        <div>
          <div className="flex items-center gap-1 text-xs text-red-400 font-semibold mb-2">
            <TrendingDown size={12} /> Top bán ròng
          </div>
          {renderList(topSell, false)}
        </div>
      </div>
    </div>
  );
};

export default ForeignTrading;
