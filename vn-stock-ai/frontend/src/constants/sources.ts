export const SOURCES = [
  { id: 'fireant', name: 'FireAnt', url: 'https://fireant.vn/thi-truong', color: '#ff6b35', defaultOn: true },
  { id: 'ssi', name: 'SSI iBoard', url: 'https://iboard.ssi.com.vn', color: '#1e88e5', defaultOn: true },
  { id: 'vietstock', name: 'VietStock', url: 'https://finance.vietstock.vn/', color: '#43a047', defaultOn: true },
  { id: 'cafef', name: 'CafeF', url: 'https://cafef.vn/thi-truong-chung-khoan.chn', color: '#e53935', defaultOn: true },
  { id: 'tcbs', name: 'TCBS', url: 'https://www.tcbs.com.vn/thi-truong', color: '#8e24aa', defaultOn: true },
  { id: 'vndirect', name: 'VNDIRECT', url: 'https://www.vndirect.com.vn', color: '#00897b', defaultOn: false },
  { id: 'bsc', name: 'BSC', url: 'https://www.bsc.com.vn/thi-truong', color: '#fb8c00', defaultOn: false },
]

export const EXCHANGES = ['HOSE', 'HNX', 'UPCOM'] as const
export const TIMEFRAMES = [
  { value: 'T1', label: 'T+1' }, { value: 'T3', label: 'T+3' },
  { value: 'T10', label: 'T+10' }, { value: 'medium', label: 'Trung hạn' }, { value: 'long', label: 'Dài hạn' },
]
export const PERIODS = [
  { value: '1mo', label: '1T' }, { value: '3mo', label: '3T' },
  { value: '6mo', label: '6T' }, { value: '1y', label: '1N' }, { value: '3y', label: '3N' },
]
export const MODELS = [
  { value: 'claude-sonnet-4-5', label: 'Claude Sonnet 4.5' },
  { value: 'claude-opus-4-5', label: 'Claude Opus 4.5' },
  { value: 'claude-haiku-3-5', label: 'Claude Haiku 3.5' },
]
export const POPULAR_TICKERS = ['VCB','BID','CTG','ACB','MBB','TCB','HPG','FPT','VIC','VNM','SSI','HCM','GAS','PLX','MSN','VHM']
