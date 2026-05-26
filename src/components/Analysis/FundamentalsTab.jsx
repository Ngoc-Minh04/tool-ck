// ===== FUNDAMENTALS TAB =====
// Hiển thị bảng chỉ số tài chính chi tiết

const FundamentalsTab = ({ info, ticker }) => {
  const { fundamentals, currentPrice, change, volume, company_name, industry } = info || {};
  const f = fundamentals || {};

  const isUp = change >= 0;
  const changeColor = isUp ? '#4ade80' : '#f87171';

  const Metric = ({ label, value, sub, color }) => (
    <div
      className="rounded-xl p-3 flex flex-col gap-1"
      style={{ background: 'rgba(13,27,42,0.7)', border: '1px solid rgba(79,195,247,0.08)' }}
    >
      <div className="text-xs text-slate-500">{label}</div>
      <div className="text-base font-bold font-num" style={{ color: color || '#e2e8f0' }}>
        {value ?? <span className="text-slate-600 text-sm">N/A</span>}
      </div>
      {sub && <div className="text-xs text-slate-600">{sub}</div>}
    </div>
  );

  const fmtPrice = (v) => v ? v.toLocaleString('vi-VN') : null;
  const fmtPct = (v) => v != null ? `${v.toFixed(2)}%` : null;
  const fmtMul = (v) => v != null ? `${Number(v).toFixed(2)}x` : null;
  const fmtCap = (v) => {
    if (!v) return null;
    if (v >= 1e12) return `${(v / 1e12).toFixed(1)} nghìn tỷ`;
    if (v >= 1e9) return `${(v / 1e9).toFixed(1)} tỷ`;
    return v.toLocaleString('vi-VN');
  };

  return (
    <div className="space-y-4">
      {/* Thông tin công ty */}
      {company_name && (
        <div className="flex items-start gap-3 pb-3" style={{ borderBottom: '1px solid rgba(79,195,247,0.08)' }}>
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0"
            style={{ background: 'rgba(79,195,247,0.15)', color: '#4fc3f7' }}
          >
            {ticker?.slice(0, 2)}
          </div>
          <div>
            <div className="font-semibold text-slate-200 text-sm">{company_name}</div>
            <div className="text-xs text-slate-500 mt-0.5">{industry || 'N/A'}</div>
          </div>
        </div>
      )}

      {/* Giá & biến động */}
      <div className="grid grid-cols-2 gap-2">
        <Metric
          label="Giá hiện tại"
          value={<span style={{ color: changeColor }}>{fmtPrice(currentPrice)}</span>}
          sub={`${isUp ? '+' : ''}${(change * 100).toFixed(2)}% hôm nay`}
        />
        <Metric
          label="Khối lượng KL"
          value={<span className="text-cyan-400">{volume ? `${(volume / 1e6).toFixed(2)}M` : null}</span>}
          sub="cổ phiếu"
        />
      </div>

      {/* Định giá */}
      <div>
        <div className="text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">📐 Định giá</div>
        <div className="grid grid-cols-3 gap-2">
          <Metric label="P/E" value={fmtMul(f.pe)} sub="Giá / Lợi nhuận" />
          <Metric label="P/B" value={fmtMul(f.pb)} sub="Giá / Sổ sách" />
          <Metric label="EPS" value={f.eps ? fmtPrice(f.eps) : null} sub="đ / cổ phiếu" />
        </div>
      </div>

      {/* Hiệu quả */}
      <div>
        <div className="text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">📊 Hiệu quả hoạt động</div>
        <div className="grid grid-cols-2 gap-2">
          <Metric
            label="ROE"
            value={fmtPct(f.roe)}
            sub="Lợi nhuận / Vốn CSH"
            color={f.roe > 15 ? '#4ade80' : f.roe > 8 ? '#facc15' : '#f87171'}
          />
          <Metric
            label="ROA"
            value={fmtPct(f.roa)}
            sub="Lợi nhuận / Tổng TS"
            color={f.roa > 5 ? '#4ade80' : f.roa > 2 ? '#facc15' : '#f87171'}
          />
        </div>
      </div>

      {/* Vốn hóa */}
      {f.marketCap && (
        <div>
          <div className="text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">💰 Quy mô</div>
          <Metric
            label="Vốn hóa thị trường"
            value={<span className="text-amber-400">{fmtCap(f.marketCap)}</span>}
            sub="VNĐ"
          />
        </div>
      )}

      {/* Hướng dẫn chỉ số */}
      <div
        className="rounded-lg p-3 text-xs text-slate-500 leading-relaxed"
        style={{ background: 'rgba(13,27,42,0.5)', border: '1px solid rgba(79,195,247,0.06)' }}
      >
        💡 <b className="text-slate-400">Đọc chỉ số:</b> ROE &gt; 15% = tốt · P/E thấp hơn ngành = định giá hấp dẫn · P/B &lt; 1 = dưới sổ sách
      </div>
    </div>
  );
};

export default FundamentalsTab;
