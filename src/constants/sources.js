// ===== CONSTANTS: DANH SÁCH NGUỒN DỮ LIỆU =====

export const DATA_SOURCES = [
  {
    id: 'fireant',
    name: 'FireAnt',
    shortName: 'FA',
    url: 'https://fireant.vn/thi-truong',
    color: '#ff6b35',
    description: 'Mạng xã hội đầu tư hàng đầu Việt Nam',
    enabled: true,
  },
  {
    id: 'ssi',
    name: 'SSI iBoard',
    shortName: 'SSI',
    url: 'https://iboard.ssi.com.vn/?noticeTab=recommendations',
    color: '#1e88e5',
    description: 'Khuyến nghị từ SSI Research',
    enabled: true,
  },
  {
    id: 'vietstock',
    name: 'VietStock',
    shortName: 'VS',
    url: 'https://finance.vietstock.vn/',
    color: '#43a047',
    description: 'Phân tích kỹ thuật VietStock Finance',
    enabled: true,
  },
  {
    id: 'cafef',
    name: 'CafeF',
    shortName: 'CF',
    url: 'https://cafef.vn/thi-truong-chung-khoan.chn',
    color: '#e53935',
    description: 'Tin tức tài chính CafeF',
    enabled: true,
  },
  {
    id: 'tcbs',
    name: 'TCBS',
    shortName: 'TC',
    url: 'https://www.tcbs.com.vn/thi-truong',
    color: '#8e24aa',
    description: 'Dữ liệu thị trường TCBS',
    enabled: false,
  },
  {
    id: 'vcsc',
    name: 'VCSC',
    shortName: 'VC',
    url: 'https://www.vcsc.com.vn/research',
    color: '#00897b',
    description: 'Báo cáo phân tích VCSC',
    enabled: false,
  },
];

export const EXCHANGES = [
  { value: 'HOSE', label: 'HOSE', description: 'Sàn TP.HCM' },
  { value: 'HNX', label: 'HNX', description: 'Sàn Hà Nội' },
  { value: 'UPCOM', label: 'UPCOM', description: 'Sàn UPCOM' },
];

export const TIMEFRAMES = [
  { value: 'T1', label: 'T+1', description: 'Ngắn hạn 1 ngày' },
  { value: 'T3', label: 'T+3', description: 'Ngắn hạn 3 ngày' },
  { value: 'T10', label: 'T+10', description: 'Ngắn hạn 10 ngày' },
  { value: 'medium', label: 'Trung hạn', description: '1-3 tháng' },
  { value: 'long', label: 'Dài hạn', description: '6-12 tháng' },
];

export const MODELS = [
  { value: 'claude-sonnet-4-5', label: 'Claude Sonnet 4.5', description: 'Cân bằng tốc độ & chất lượng' },
  { value: 'claude-opus-4-5', label: 'Claude Opus 4.5', description: 'Chất lượng cao nhất' },
  { value: 'claude-haiku-3-5', label: 'Claude Haiku 3.5', description: 'Nhanh & tiết kiệm' },
];

export const SECTORS = [
  { id: 'bank', name: 'Ngân hàng', icon: '🏦', tickers: ['VCB', 'BID', 'CTG', 'ACB', 'MBB', 'TCB', 'STB', 'VPB', 'HDB', 'LPB'] },
  { id: 'realestate', name: 'Bất động sản', icon: '🏗️', tickers: ['VIC', 'VHM', 'NVL', 'PDR', 'KDH', 'DXG', 'SCR', 'NLG', 'HDC', 'BCG'] },
  { id: 'steel', name: 'Thép', icon: '⚙️', tickers: ['HPG', 'HSG', 'NKG', 'TVN', 'VIS', 'POM', 'SMC', 'TIS', 'DNY', 'VGS'] },
  { id: 'securities', name: 'Chứng khoán', icon: '📊', tickers: ['SSI', 'VCI', 'HCM', 'MBS', 'VDS', 'VIX', 'AGR', 'BSI', 'SHS', 'TVS'] },
  { id: 'oil_gas', name: 'Dầu khí', icon: '⛽', tickers: ['GAS', 'PLX', 'PVD', 'PVS', 'PVT', 'PXL', 'BSR', 'OIL', 'PVC', 'PSH'] },
  { id: 'tech', name: 'Công nghệ', icon: '💻', tickers: ['FPT', 'CMG', 'ELC', 'VGI', 'ITD', 'KST', 'SGT', 'FOX', 'SFI', 'CMC'] },
];

export const POPULAR_TICKERS = [
  'ACB', 'VCB', 'BID', 'CTG', 'MBB', 'TCB', 'STB', 'VPB',
  'HPG', 'HSG', 'VIC', 'VHM', 'VNM', 'VRE', 'FPT', 'SSI',
  'HCM', 'PLX', 'GAS', 'MSN', 'MWG', 'PNJ', 'DGC', 'BCM',
];
