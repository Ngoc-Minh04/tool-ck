// ===== TRANG THỊ TRƯỜNG TỔNG QUAN =====

import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import Header from '../components/Layout/Header';
import IndexCard from '../components/Market/IndexCard';
import SectorSignals from '../components/Market/SectorSignals';
import ForeignTrading from '../components/Market/ForeignTrading';
import { SkeletonCard, Button } from '../components/UI';
import useVnStock from '../hooks/useVnStock';

const getPriceColorClass = (price, ceil, floor, ref) => {
  if (!ceil || !floor || !ref) return 'text-slate-200';
  if (price >= ceil) return 'text-fuchsia-400 font-bold'; // Trần (Tím)
  if (price <= floor) return 'text-cyan-400 font-bold'; // Sàn (Xanh lơ)
  if (price === ref) return 'text-yellow-400 font-bold'; // Tham chiếu (Vàng)
  if (price > ref) return 'text-green-400 font-bold'; // Tăng (Xanh lá)
  return 'text-red-400 font-bold'; // Giảm (Đỏ)
};

const MarketPage = () => {
  const [marketData, setMarketData] = useState(null);
  const { loading, fetchMarket } = useVnStock();

  const loadData = async () => {
    const data = await fetchMarket();
    if (data) setMarketData(data);
  };

  useEffect(() => {
    loadData();
    // Auto refresh mỗi 30 giây
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title="Thị trường tổng quan" />

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Section: Chỉ số */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-300">📊 Chỉ số thị trường</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={loadData}
              loading={loading}
              icon={RefreshCw}
            >
              Làm mới
            </Button>
          </div>

          {loading && !marketData ? (
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : (
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
              {marketData?.indices?.map((index) => (
                <IndexCard key={index.name} index={index} />
              ))}
            </div>
          )}
        </div>

        {/* Section: Sectors + Foreign */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {loading && !marketData ? (
            <>
              <SkeletonCard />
              <SkeletonCard />
            </>
          ) : (
            <>
              <SectorSignals sectors={marketData?.sectors || []} />
              <ForeignTrading data={marketData?.foreign} />
            </>
          )}
        </div>

        {/* Section: Market heatmap placeholder */}
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-slate-200 mb-4">
            🗺️ Bảng giá nhanh {(!marketData || marketData.isOffline || !marketData.quickQuotes?.length) ? '(Mẫu)' : ''}
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(79,195,247,0.1)' }}>
                  {['Mã', 'Sàn', 'Trần', 'Sàn', 'TC', 'Giá', 'Thay đổi', '%', 'Mở', 'Cao', 'Thấp', 'KL (K)', 'Vốn hóa'].map((h) => (
                    <th key={h} className="text-left py-2 px-3 text-slate-500 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const fallbackQuotes = [
                    { ticker: 'VCB', exchange: 'HOSE', price: 85200, change: 400, pct: 0.47, vol: 2140, cap: '530.6T', ref: 84800, ceil: 90700, floor: 78900, high: 85500, low: 84500, open: 84800 },
                    { ticker: 'BID', exchange: 'HOSE', price: 42500, change: -300, pct: -0.70, vol: 3560, cap: '245T', ref: 42800, ceil: 45750, floor: 39850, high: 43000, low: 42400, open: 42800 },
                    { ticker: 'CTG', exchange: 'HOSE', price: 28700, change: 100, pct: 0.35, vol: 4210, cap: '185T', ref: 28600, ceil: 30600, floor: 26600, high: 28900, low: 28500, open: 28600 },
                    { ticker: 'FPT', exchange: 'HOSE', price: 132000, change: 1500, pct: 1.15, vol: 1870, cap: '145T', ref: 130500, ceil: 139600, floor: 121400, high: 132500, low: 130000, open: 130500 },
                    { ticker: 'HPG', exchange: 'HOSE', price: 24600, change: -500, pct: -1.99, vol: 8940, cap: '140T', ref: 25100, ceil: 26850, floor: 23350, high: 25200, low: 24500, open: 25100 },
                    { ticker: 'VIC', exchange: 'HOSE', price: 38900, change: 200, pct: 0.52, vol: 1230, cap: '135T', ref: 38700, ceil: 41400, floor: 36000, high: 39100, low: 38600, open: 38700 },
                    { ticker: 'VNM', exchange: 'HOSE', price: 68500, change: -200, pct: -0.29, vol: 980, cap: '125T', ref: 68700, ceil: 73500, floor: 63900, high: 69000, low: 68300, open: 68700 },
                    { ticker: 'ACB', exchange: 'HOSE', price: 24800, change: 300, pct: 1.22, vol: 5670, cap: '95T', ref: 24500, ceil: 26200, floor: 22800, high: 24900, low: 24450, open: 24500 },
                  ];
                  const quotes = (marketData && !marketData.isOffline && marketData.quickQuotes?.length) 
                    ? marketData.quickQuotes 
                    : fallbackQuotes;

                  return quotes.map((row) => {
                    const priceColorClass = getPriceColorClass(row.price, row.ceil, row.floor, row.ref);
                    
                    return (
                      <tr
                        key={row.ticker}
                        className="transition-colors"
                        style={{ borderBottom: '1px solid rgba(79,195,247,0.04)' }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(79,195,247,0.03)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        <td className="py-2 px-3 font-bold text-slate-200">{row.ticker}</td>
                        <td className="py-2 px-3 text-slate-500">{row.exchange}</td>
                        <td className="py-2 px-3 font-num text-fuchsia-400">{row.ceil ? row.ceil.toLocaleString('vi-VN') : '-'}</td>
                        <td className="py-2 px-3 font-num text-cyan-400">{row.floor ? row.floor.toLocaleString('vi-VN') : '-'}</td>
                        <td className="py-2 px-3 font-num text-yellow-400">{row.ref ? row.ref.toLocaleString('vi-VN') : '-'}</td>
                        <td className={`py-2 px-3 font-num ${priceColorClass}`}>{row.price.toLocaleString('vi-VN')}</td>
                        <td className={`py-2 px-3 font-num ${row.change > 0 ? 'text-green-400' : row.change < 0 ? 'text-red-400' : 'text-slate-400'}`}>
                          {row.change > 0 ? '+' : ''}{row.change.toLocaleString('vi-VN')}
                        </td>
                        <td className={`py-2 px-3 font-num font-bold ${row.pct > 0 ? 'text-green-400' : row.pct < 0 ? 'text-red-400' : 'text-slate-400'}`}>
                          {row.pct > 0 ? '+' : ''}{row.pct}%
                        </td>
                        <td className={`py-2 px-3 font-num ${getPriceColorClass(row.open, row.ceil, row.floor, row.ref)}`}>
                          {row.open ? row.open.toLocaleString('vi-VN') : '-'}
                        </td>
                        <td className={`py-2 px-3 font-num ${getPriceColorClass(row.high, row.ceil, row.floor, row.ref)}`}>
                          {row.high ? row.high.toLocaleString('vi-VN') : '-'}
                        </td>
                        <td className={`py-2 px-3 font-num ${getPriceColorClass(row.low, row.ceil, row.floor, row.ref)}`}>
                          {row.low ? row.low.toLocaleString('vi-VN') : '-'}
                        </td>
                        <td className="py-2 px-3 font-num text-cyan-400">{row.vol.toLocaleString('vi-VN')}</td>
                        <td className="py-2 px-3 font-num text-slate-400">{row.cap}</td>
                      </tr>
                    );
                  });
                })()}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MarketPage;
