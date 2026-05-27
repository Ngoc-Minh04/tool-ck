// ===== TRANG THỊ TRƯỜNG TỔNG QUAN =====

import { useEffect, useState, useCallback } from 'react';
import { RefreshCw, Pin, PinOff, Search, X } from 'lucide-react';
import Header from '../components/Layout/Header';
import IndexCard from '../components/Market/IndexCard';
import SectorSignals from '../components/Market/SectorSignals';
import ForeignTrading from '../components/Market/ForeignTrading';
import { SkeletonCard, Button } from '../components/UI';
import useVnStock from '../hooks/useVnStock';
import { getSectorData } from '../services/vnstockService';

// ===== HELPERS =====

const getPriceColorClass = (price, ceil, floor, ref) => {
  if (!ceil || !floor || !ref) return 'text-slate-200';
  if (price >= ceil) return 'text-fuchsia-400 font-bold';
  if (price <= floor) return 'text-cyan-400 font-bold';
  if (price === ref) return 'text-yellow-400 font-bold';
  if (price > ref) return 'text-green-400 font-bold';
  return 'text-red-400 font-bold';
};

// Sparkline SVG mini chart
const Sparkline = ({ open, high, low, price, ref: refPrice }) => {
  const pts = [open, low, high, price].filter(Boolean);
  if (pts.length < 2) return <span className="text-slate-600 text-[10px]">—</span>;
  const minV = Math.min(...pts);
  const maxV = Math.max(...pts);
  const range = maxV - minV || 1;
  const w = 48, h = 18, pad = 1.5;
  const xs = pts.map((_, i) => pad + (i / Math.max(pts.length - 1, 1)) * (w - pad * 2));
  const ys = pts.map(v => h - pad - ((v - minV) / range) * (h - pad * 2));
  const d = xs.map((x, i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${ys[i].toFixed(1)}`).join(' ');
  const isUp = price >= (refPrice || open);
  const color = isUp ? '#4ade80' : '#f87171';
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: 'block' }}>
      <defs>
        <linearGradient id={`sg-${isUp ? 'u' : 'd'}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d={`${d} L${xs[xs.length - 1].toFixed(1)},${h} L${xs[0].toFixed(1)},${h} Z`}
        fill={`url(#sg-${isUp ? 'u' : 'd'})`}
      />
      <path d={d} fill="none" stroke={color} strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={xs[xs.length - 1]} cy={ys[ys.length - 1]} r="1.5" fill={color} />
    </svg>
  );
};

// Nhóm ngành của 15 mã cổ phiếu theo dõi
const SECTOR_MAP = {
  'VCB': 'Ngân hàng', 'BID': 'Ngân hàng', 'CTG': 'Ngân hàng',
  'ACB': 'Ngân hàng', 'MBB': 'Ngân hàng', 'TCB': 'Ngân hàng',
  'HPG': 'Thép',
  'VIC': 'Bất động sản', 'VHM': 'Bất động sản', 'VRE': 'Bất động sản',
  'FPT': 'Công nghệ',
  'MWG': 'Bán lẻ',
  'GAS': 'Năng lượng',
  'SSI': 'Chứng khoán',
  'VNM': 'FMCG',
};

const SECTORS = ['Tất cả', 'Ngân hàng', 'Bất động sản', 'Thép', 'Công nghệ', 'Bán lẻ', 'Năng lượng', 'Chứng khoán', 'FMCG'];

const LS_KEY = 'vn_stock_pinned_tickers';

const loadPinned = () => {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]'); } catch { return []; }
};
const savePinned = (arr) => {
  try { localStorage.setItem(LS_KEY, JSON.stringify(arr)); } catch {}
};

const getTickSize = (price, exchange) => {
  const ex = (exchange || 'HOSE').toUpperCase();
  if (ex === 'HNX' || ex === 'UPCOM') {
    return 100;
  }
  // Quy tắc bước giá sàn HOSE
  if (price < 10000) return 10;
  if (price < 50000) return 50;
  return 100;
};

// ===== MAIN COMPONENT =====
const MarketPage = () => {
  const [marketData, setMarketData] = useState(null);
  const [pinnedTickers, setPinnedTickers] = useState(loadPinned);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSector, setSelectedSector] = useState('Tất cả');
  const { loading, fetchMarket, fetchQuickQuotes } = useVnStock();

  // ===== FALLBACK DATA =====
  const fallbackQuotes = [
    { ticker: 'VCB', exchange: 'HOSE', price: 85200, change: 400, pct: 0.47, vol: 2140, cap: '530.6T', ref: 84800, ceil: 90700, floor: 78900, high: 85500, low: 84500, open: 84800 },
    { ticker: 'BID', exchange: 'HOSE', price: 42500, change: -300, pct: -0.70, vol: 3560, cap: '245T', ref: 42800, ceil: 45750, floor: 39850, high: 43000, low: 42400, open: 42800 },
    { ticker: 'CTG', exchange: 'HOSE', price: 28700, change: 100, pct: 0.35, vol: 4210, cap: '185T', ref: 28600, ceil: 30600, floor: 26600, high: 28900, low: 28500, open: 28600 },
    { ticker: 'FPT', exchange: 'HOSE', price: 132000, change: 1500, pct: 1.15, vol: 1870, cap: '145T', ref: 130500, ceil: 139600, floor: 121400, high: 132500, low: 130000, open: 130500 },
    { ticker: 'HPG', exchange: 'HOSE', price: 24600, change: -500, pct: -1.99, vol: 8940, cap: '140T', ref: 25100, ceil: 26850, floor: 23350, high: 25200, low: 24500, open: 25100 },
    { ticker: 'VIC', exchange: 'HOSE', price: 38900, change: 200, pct: 0.52, vol: 1230, cap: '135T', ref: 38700, ceil: 41400, floor: 36000, high: 39100, low: 38600, open: 38700 },
    { ticker: 'VNM', exchange: 'HOSE', price: 68500, change: -200, pct: -0.29, vol: 980, cap: '125T', ref: 68700, ceil: 73500, floor: 63900, high: 69000, low: 68300, open: 68700 },
    { ticker: 'ACB', exchange: 'HOSE', price: 24800, change: 300, pct: 1.22, vol: 5670, cap: '95T', ref: 24500, ceil: 26200, floor: 22800, high: 24900, low: 24450, open: 24500 },
    { ticker: 'MBB', exchange: 'HOSE', price: 26500, change: 200, pct: 0.76, vol: 6120, cap: '115T', ref: 26300, ceil: 28100, floor: 24500, high: 26600, low: 26200, open: 26300 },
    { ticker: 'TCB', exchange: 'HOSE', price: 32100, change: -100, pct: -0.31, vol: 3450, cap: '175T', ref: 32200, ceil: 34450.0, floor: 30000.0, high: 32400.0, low: 32000.0, open: 32200.0 },
    { ticker: 'SSI', exchange: 'HOSE', price: 28500, change: -600, pct: -2.06, vol: 4300, cap: '43T', ref: 29100, ceil: 31100, floor: 27100, high: 29200, low: 28400, open: 29100 },
    { ticker: 'MWG', exchange: 'HOSE', price: 55000, change: 800, pct: 1.48, vol: 2200, cap: '80T', ref: 54200, ceil: 58000, floor: 50400, high: 55400, low: 54200, open: 54200 },
    { ticker: 'GAS', exchange: 'HOSE', price: 72000, change: 100, pct: 0.14, vol: 680, cap: '165T', ref: 71900, ceil: 76900, floor: 66900, high: 72300, low: 71800, open: 71900 },
    { ticker: 'VHM', exchange: 'HOSE', price: 39500, change: -400, pct: -1.00, vol: 2800, cap: '172T', ref: 39900, ceil: 42700, floor: 37100, high: 40100, low: 39400, open: 39900 },
    { ticker: 'VRE', exchange: 'HOSE', price: 22500, change: 300, pct: 1.35, vol: 1950, cap: '51T', ref: 22200, ceil: 23750, floor: 20650, high: 22700, low: 22150, open: 22200 },
  ];

  const [quotesState, setQuotesState] = useState(fallbackQuotes);
  const [flashStates, setFlashStates] = useState({});

  // Kiểm tra thời gian hoạt động của thị trường chứng khoán Việt Nam
  const checkMarket = useCallback(() => {
    const now = new Date();
    const day = now.getDay(); // 0=CN, 1=T2...6=T7
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const timeInMinutes = hours * 60 + minutes;
    
    // GTM+7:
    // - Thứ Hai đến thứ Sáu (day >= 1 && day <= 5)
    // - Phiên Sáng: 09:00 - 11:30 (540 phút đến 690 phút)
    // - Phiên Chiều: 13:00 - 15:15 (780 phút đến 915 phút)
    const isWeekday = day >= 1 && day <= 5;
    const isMorning = timeInMinutes >= 540 && timeInMinutes <= 690;
    const isAfternoon = timeInMinutes >= 780 && timeInMinutes <= 915;
    
    return isWeekday && (isMorning || isAfternoon);
  }, []);

  const loadData = useCallback(async () => {
    const data = await fetchMarket();
    if (data) setMarketData(data);
  }, [fetchMarket]);

  useEffect(() => {
    loadData(); // Tải lần đầu tiên khi mount
    
    const checkAndLoad = () => {
      if (checkMarket()) {
        loadData();
      }
    };
    
    const interval = setInterval(checkAndLoad, 40000); // Tải dữ liệu thật mỗi 40 giây (tối ưu hóa cực hạn)
    return () => clearInterval(interval);
  }, [loadData, checkMarket]);

  const togglePin = useCallback((ticker) => {
    setPinnedTickers(prev => {
      const next = prev.includes(ticker)
        ? prev.filter(t => t !== ticker)
        : [...prev, ticker];
      savePinned(next);
      return next;
    });
  }, []);

  // Lấy dữ liệu thực từ sàn cho toàn bộ 15 mã cổ phiếu mỗi 1.5 giây
  useEffect(() => {
    const updateQuotes = async (isInitial = false) => {
      // Nếu không phải lần đầu tiên và thị trường đóng cửa thì ngưng gửi request
      if (!isInitial && !checkMarket()) return;

      try {
        const liveData = await fetchQuickQuotes('VCB,BID,CTG,FPT,HPG,VIC,VNM,ACB,MBB,TCB,SSI,MWG,GAS,VHM,VRE');
        if (!liveData || !liveData.length) return;

        setQuotesState(prev => {
          if (!prev.length) return prev;
          
          const newFlashes = {};
          const nextQuotes = prev.map(row => {
            const liveRow = liveData.find(l => l.ticker === row.ticker);
            if (liveRow) {
              // Nếu dòng cũ đã là giá thật (is_live === true) nhưng dòng mới là mock (is_live === false)
              // thì giữ nguyên dòng cũ
              if (row.is_live && !liveRow.is_live) {
                return row;
              }

              // Chỉ nhấp nháy khi thị trường đang trong giờ giao dịch
              if (row.price !== liveRow.price && liveRow.is_live && checkMarket()) {
                newFlashes[row.ticker] = liveRow.price > row.price ? 'up' : 'down';
              }
              return {
                ...row,
                ...liveRow,
              };
            }
            return row;
          });

          if (Object.keys(newFlashes).length > 0) {
            setFlashStates(prevFlashes => ({ ...prevFlashes, ...newFlashes }));
            setTimeout(() => {
              setFlashStates(prevFlashes => {
                const next = { ...prevFlashes };
                Object.keys(newFlashes).forEach(t => delete next[t]);
                return next;
              });
            }, 1000);
          }

          return nextQuotes;
        });
      } catch (err) {
        console.error("Failed to fetch live quotes:", err);
      }
    };

    // Tải dữ liệu thực lần đầu ngay khi mount (kể cả ngoài giờ giao dịch để hiển thị giá đóng cửa phiên cuối)
    updateQuotes(true);

    const timer = setInterval(() => {
      if (checkMarket()) {
        updateQuotes(false);
      }
    }, 1500);
    return () => clearInterval(timer);
  }, [fetchQuickQuotes, checkMarket]);

  // 1. Lọc theo tìm kiếm + ngành trực tiếp từ quotesState
  let filtered = quotesState.filter(row => {
    const matchSearch = !searchQuery || row.ticker.toLowerCase().includes(searchQuery.toLowerCase());
    const matchSector = selectedSector === 'Tất cả' || SECTOR_MAP[row.ticker] === selectedSector;
    return matchSearch && matchSector;
  });

  // 2. Tách pinned vs unpinned, sort unpinned by pct
  const pinned = filtered.filter(r => pinnedTickers.includes(r.ticker));
  const unpinned = filtered.filter(r => !pinnedTickers.includes(r.ticker));
  unpinned.sort((a, b) => (b.pct || 0) - (a.pct || 0));
  const quotes = [...pinned, ...unpinned];

  const isMockData = quotesState.every(q => !q.is_live);
  const sectors = getSectorData(quotesState);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title="Thị trường tổng quan" />

      <div className="flex-1 overflow-y-auto p-4 xl:p-5 space-y-4">
        {/* Section: Chỉ số */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs font-semibold text-slate-300">📊 Chỉ số thị trường</h2>
            <Button variant="ghost" size="sm" onClick={loadData} loading={loading} icon={RefreshCw}>
              Làm mới
            </Button>
          </div>
          {loading && !marketData ? (
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
              {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : (
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
              {marketData?.indices?.map((index) => (
                <IndexCard key={index.name} index={index} />
              ))}
            </div>
          )}
        </div>

        {/* Section: Thân chính chia 2 cột */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          {/* Cột trái: Bảng giá nhanh (8/12 cột) */}
          <div className="lg:col-span-8 order-1 lg:order-1 glass-card p-4">
            {/* Header bảng */}
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <h3 className="text-xs font-semibold text-slate-200">
                🗺️ Bảng giá nhanh
                {isMockData && <span className="ml-2 text-[10px] text-yellow-500 font-normal">(Dữ liệu mẫu)</span>}
                {pinnedTickers.length > 0 && (
                  <span className="ml-2 text-[10px] text-amber-400 font-normal">
                    📌 {pinnedTickers.length} mã đã ghim
                  </span>
                )}
              </h3>
              {/* Ô tìm kiếm */}
              <div className="relative">
                <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  id="stock-search"
                  type="text"
                  placeholder="Tìm mã cổ phiếu..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-7 pr-7 py-1 text-[11px] rounded-lg bg-slate-800/80 border border-slate-700 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/60 w-36 transition-all"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                    <X size={11} />
                  </button>
                )}
              </div>
            </div>

            {/* Tabs lọc ngành */}
            <div className="flex gap-1 mb-3 flex-wrap">
              {SECTORS.map(sector => (
                <button
                  key={sector}
                  onClick={() => setSelectedSector(sector)}
                  className={`px-2.5 py-0.5 text-[11px] rounded-full font-medium transition-all duration-200 ${
                    selectedSector === sector
                      ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                      : 'bg-slate-800/50 text-slate-500 border border-slate-700/50 hover:text-slate-300 hover:border-slate-600'
                  }`}
                >
                  {sector}
                </button>
              ))}
            </div>

            {/* Bảng dữ liệu */}
            <div className="overflow-x-auto">
              <table className="w-full text-[11px]">
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(79,195,247,0.1)' }}>
                    {['', 'Mã', 'Sàn', 'Trần', 'Sàn', 'TC', 'Giá', 'Thay đổi', '%', 'Xu hướng', 'Mở', 'Cao', 'Thấp', 'KL (K)', 'Vốn hóa'].map((h, i) => (
                      <th key={i} className="text-left py-1.5 px-1.5 text-slate-500 font-medium whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {quotes.length === 0 ? (
                    <tr>
                      <td colSpan={15} className="py-6 text-center text-slate-500 text-[11px]">
                        Không tìm thấy mã nào phù hợp
                      </td>
                    </tr>
                  ) : (
                    quotes.map((row) => {
                      const isPinned = pinnedTickers.includes(row.ticker);
                      const priceColorClass = getPriceColorClass(row.price, row.ceil, row.floor, row.ref);
                      return (
                        <tr
                          key={row.ticker}
                          className="group"
                          style={{
                            borderBottom: '1px solid rgba(79,195,247,0.04)',
                            background: flashStates[row.ticker] === 'up'
                              ? 'rgba(74, 222, 128, 0.15)'
                              : flashStates[row.ticker] === 'down'
                              ? 'rgba(248, 113, 113, 0.15)'
                              : isPinned
                              ? 'rgba(251, 191, 36, 0.03)'
                              : 'transparent',
                            transition: 'background-color 0.4s ease-out',
                          }}
                          onMouseEnter={e => {
                            if (flashStates[row.ticker]) return;
                            e.currentTarget.style.background = isPinned ? 'rgba(251,191,36,0.06)' : 'rgba(79,195,247,0.04)';
                          }}
                          onMouseLeave={e => {
                            if (flashStates[row.ticker]) return;
                            e.currentTarget.style.background = isPinned ? 'rgba(251,191,36,0.03)' : 'transparent';
                          }}
                        >
                          {/* Pin Button */}
                          <td className="py-1 px-1.5 w-6">
                            <button
                              id={`pin-${row.ticker}`}
                              title={isPinned ? 'Bỏ ghim' : 'Ghim lên đầu'}
                              onClick={() => togglePin(row.ticker)}
                              className={`transition-all duration-200 rounded p-0.5 ${
                                isPinned
                                  ? 'text-amber-400 hover:text-amber-300'
                                  : 'text-slate-700 hover:text-amber-400 opacity-0 group-hover:opacity-100'
                              }`}
                            >
                              {isPinned ? <Pin size={10} fill="currentColor" /> : <Pin size={10} />}
                            </button>
                          </td>
                          {/* Mã */}
                          <td className="py-1 px-1.5 font-bold text-slate-200 whitespace-nowrap">
                            <div className="flex items-center gap-1">
                              {isPinned && <span className="text-amber-400 text-xs leading-none">│</span>}
                              {row.ticker}
                            </div>
                          </td>
                          <td className="py-1 px-1.5 text-slate-500">{row.exchange}</td>
                          <td className="py-1 px-1.5 font-num text-fuchsia-400">{row.ceil ? row.ceil.toLocaleString('vi-VN') : '-'}</td>
                          <td className="py-1 px-1.5 font-num text-cyan-400">{row.floor ? row.floor.toLocaleString('vi-VN') : '-'}</td>
                          <td className="py-1 px-1.5 font-num text-yellow-400">{row.ref ? row.ref.toLocaleString('vi-VN') : '-'}</td>
                          <td className={`py-1 px-1.5 font-num ${priceColorClass}`}>{row.price.toLocaleString('vi-VN')}</td>
                          <td className={`py-1 px-1.5 font-num ${row.change > 0 ? 'text-green-400' : row.change < 0 ? 'text-red-400' : 'text-slate-400'}`}>
                            {row.change > 0 ? '+' : ''}{row.change.toLocaleString('vi-VN')}
                          </td>
                          <td className={`py-1 px-1.5 font-num font-bold ${row.pct > 0 ? 'text-green-400' : row.pct < 0 ? 'text-red-400' : 'text-slate-400'}`}>
                            {row.pct > 0 ? '+' : ''}{row.pct}%
                          </td>
                          {/* Sparkline */}
                          <td className="py-1 px-1.5">
                            <Sparkline open={row.open} high={row.high} low={row.low} price={row.price} ref={row.ref} />
                          </td>
                          <td className={`py-1 px-1.5 font-num ${getPriceColorClass(row.open, row.ceil, row.floor, row.ref)}`}>
                            {row.open ? row.open.toLocaleString('vi-VN') : '-'}
                          </td>
                          <td className={`py-1 px-1.5 font-num ${getPriceColorClass(row.high, row.ceil, row.floor, row.ref)}`}>
                            {row.high ? row.high.toLocaleString('vi-VN') : '-'}
                          </td>
                          <td className={`py-1 px-1.5 font-num ${getPriceColorClass(row.low, row.ceil, row.floor, row.ref)}`}>
                            {row.low ? row.low.toLocaleString('vi-VN') : '-'}
                          </td>
                          <td className="py-1 px-1.5 font-num text-cyan-400">{row.vol.toLocaleString('vi-VN')}</td>
                          <td className="py-1 px-1.5 font-num text-slate-400">{row.cap}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Footer: Thông tin tóm tắt */}
            <div className="mt-2.5 pt-2.5 flex items-center justify-between text-[10px] text-slate-600" style={{ borderTop: '1px solid rgba(79,195,247,0.06)' }}>
              <span>{quotes.length} mã đang hiển thị</span>
              <span>Thời gian thực (1.5s) · Nguồn: VCI</span>
            </div>
          </div>

          {/* Cột phải: Phân ngành & Khối ngoại (4/12 cột) */}
          <div className="lg:col-span-4 order-2 lg:order-2 space-y-4">
            {loading && !marketData ? (
              <><SkeletonCard /><SkeletonCard /></>
            ) : (
              <>
                <SectorSignals sectors={sectors} />
                <ForeignTrading data={marketData?.foreign} />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MarketPage;




