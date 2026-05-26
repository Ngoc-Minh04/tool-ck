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

// Danh sách mở rộng dùng cho autocomplete (ticker + tên công ty)
export const TICKER_DIRECTORY = [
  // Ngân hàng
  { ticker: 'VCB',  name: 'Vietcombank',              sector: 'Ngân hàng',    exchange: 'HOSE' },
  { ticker: 'BID',  name: 'BIDV',                     sector: 'Ngân hàng',    exchange: 'HOSE' },
  { ticker: 'CTG',  name: 'VietinBank',               sector: 'Ngân hàng',    exchange: 'HOSE' },
  { ticker: 'ACB',  name: 'Ngân hàng ACB',            sector: 'Ngân hàng',    exchange: 'HOSE' },
  { ticker: 'MBB',  name: 'MB Bank',                  sector: 'Ngân hàng',    exchange: 'HOSE' },
  { ticker: 'TCB',  name: 'Techcombank',              sector: 'Ngân hàng',    exchange: 'HOSE' },
  { ticker: 'STB',  name: 'Sacombank',                sector: 'Ngân hàng',    exchange: 'HOSE' },
  { ticker: 'VPB',  name: 'VPBank',                   sector: 'Ngân hàng',    exchange: 'HOSE' },
  { ticker: 'HDB',  name: 'HDBank',                   sector: 'Ngân hàng',    exchange: 'HOSE' },
  { ticker: 'LPB',  name: 'LienVietPostBank',         sector: 'Ngân hàng',    exchange: 'HOSE' },
  { ticker: 'OCB',  name: 'Ngân hàng OCB',            sector: 'Ngân hàng',    exchange: 'HOSE' },
  { ticker: 'SHB',  name: 'SHBank',                   sector: 'Ngân hàng',    exchange: 'HNX'  },
  { ticker: 'NAB',  name: 'Nam A Bank',               sector: 'Ngân hàng',    exchange: 'HOSE' },
  // Bất động sản
  { ticker: 'VIC',  name: 'Vingroup',                 sector: 'Bất động sản', exchange: 'HOSE' },
  { ticker: 'VHM',  name: 'Vinhomes',                 sector: 'Bất động sản', exchange: 'HOSE' },
  { ticker: 'NVL',  name: 'Novaland',                 sector: 'Bất động sản', exchange: 'HOSE' },
  { ticker: 'PDR',  name: 'Phát Đạt',                sector: 'Bất động sản', exchange: 'HOSE' },
  { ticker: 'KDH',  name: 'Khang Điền',              sector: 'Bất động sản', exchange: 'HOSE' },
  { ticker: 'DXG',  name: 'Đất Xanh Group',          sector: 'Bất động sản', exchange: 'HOSE' },
  { ticker: 'NLG',  name: 'Nam Long',                 sector: 'Bất động sản', exchange: 'HOSE' },
  { ticker: 'DIG',  name: 'DIC Corp',                 sector: 'Bất động sản', exchange: 'HOSE' },
  // Thép
  { ticker: 'HPG',  name: 'Hòa Phát Group',          sector: 'Thép',         exchange: 'HOSE' },
  { ticker: 'HSG',  name: 'Hoa Sen Group',            sector: 'Thép',         exchange: 'HOSE' },
  { ticker: 'NKG',  name: 'Nam Kim Steel',            sector: 'Thép',         exchange: 'HOSE' },
  // Chứng khoán
  { ticker: 'SSI',  name: 'SSI Securities',           sector: 'Chứng khoán',  exchange: 'HOSE' },
  { ticker: 'VCI',  name: 'Vietcap',                  sector: 'Chứng khoán',  exchange: 'HOSE' },
  { ticker: 'HCM',  name: 'HSC Securities',           sector: 'Chứng khoán',  exchange: 'HOSE' },
  { ticker: 'MBS',  name: 'MB Securities',            sector: 'Chứng khoán',  exchange: 'HNX'  },
  { ticker: 'VIX',  name: 'VIX Securities',           sector: 'Chứng khoán',  exchange: 'HOSE' },
  // Dầu khí
  { ticker: 'GAS',  name: 'PVGas',                    sector: 'Dầu khí',      exchange: 'HOSE' },
  { ticker: 'PLX',  name: 'Petrolimex',               sector: 'Dầu khí',      exchange: 'HOSE' },
  { ticker: 'PVD',  name: 'PV Drilling',              sector: 'Dầu khí',      exchange: 'HOSE' },
  { ticker: 'PVS',  name: 'PV Technical Services',   sector: 'Dầu khí',      exchange: 'HNX'  },
  { ticker: 'BSR',  name: 'Bình Sơn Refinery',       sector: 'Dầu khí',      exchange: 'UPCOM'},
  // Công nghệ
  { ticker: 'FPT',  name: 'FPT Corporation',          sector: 'Công nghệ',    exchange: 'HOSE' },
  { ticker: 'CMG',  name: 'CMC Technology',           sector: 'Công nghệ',    exchange: 'HOSE' },
  { ticker: 'ELC',  name: 'Elcom',                    sector: 'Công nghệ',    exchange: 'HNX'  },
  // Tiêu dùng
  { ticker: 'VNM',  name: 'Vinamilk',                 sector: 'Tiêu dùng',   exchange: 'HOSE' },
  { ticker: 'MSN',  name: 'Masan Group',              sector: 'Tiêu dùng',   exchange: 'HOSE' },
  { ticker: 'MWG',  name: 'Mobile World (Thế Giới Di Động)', sector: 'Tiêu dùng', exchange: 'HOSE' },
  { ticker: 'PNJ',  name: 'Phú Nhuận Jewelry',       sector: 'Tiêu dùng',   exchange: 'HOSE' },
  { ticker: 'SAB',  name: 'Sabeco',                   sector: 'Tiêu dùng',   exchange: 'HOSE' },
  { ticker: 'BHN',  name: 'Habeco',                   sector: 'Tiêu dùng',   exchange: 'HOSE' },
  // Logistics / Vận tải
  { ticker: 'GMD',  name: 'Gemadept',                 sector: 'Vận tải',      exchange: 'HOSE' },
  { ticker: 'PVT',  name: 'PV Trans',                 sector: 'Vận tải',      exchange: 'HOSE' },
  { ticker: 'HAH',  name: 'Hải An Shipping',          sector: 'Vận tải',      exchange: 'HOSE' },
  { ticker: 'VOS',  name: 'VietNam Ocean Shipping',   sector: 'Vận tải',      exchange: 'HOSE' },
  // Phân bón / Hóa chất
  { ticker: 'DGC',  name: 'Ducpho Chemical',          sector: 'Hóa chất',     exchange: 'HOSE' },
  { ticker: 'DCM',  name: 'Cà Mau Fertilizer',       sector: 'Hóa chất',     exchange: 'HOSE' },
  { ticker: 'DPM',  name: 'PetroVietnam Fertilizer',  sector: 'Hóa chất',     exchange: 'HOSE' },
  // Điện
  { ticker: 'POW',  name: 'PV Power',                 sector: 'Điện lực',     exchange: 'HOSE' },
  { ticker: 'NT2',  name: 'Nhơn Trạch 2 Power',       sector: 'Điện lực',     exchange: 'HOSE' },
  { ticker: 'PC1',  name: 'Power Construction 1',     sector: 'Điện lực',     exchange: 'HOSE' },
  // Bảo hiểm
  { ticker: 'BVH',  name: 'BaoViet Holdings',         sector: 'Bảo hiểm',     exchange: 'HOSE' },
  { ticker: 'PVI',  name: 'PVI Insurance',            sector: 'Bảo hiểm',     exchange: 'HNX'  },
  // Index
  { ticker: 'VRE',  name: 'Vincom Retail',            sector: 'Bán lẻ',       exchange: 'HOSE' },
  { ticker: 'BCM',  name: 'Becamex IDC',              sector: 'KCN',          exchange: 'HOSE' },
  { ticker: 'PHR',  name: 'Phước Hòa Rubber',        sector: 'Cao su',       exchange: 'HOSE' },
];

