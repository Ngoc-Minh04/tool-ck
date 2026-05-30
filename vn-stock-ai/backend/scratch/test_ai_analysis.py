import httpx
import json

def rsi_label(v):
    if not v: return 'N/A'
    try:
        v = float(v)
        if v >= 70: return f"{v:.1f} -> Qua mua 🔴"
        if v <= 30: return f"{v:.1f} -> Qua ban 🟢"
        if v >= 60: return f"{v:.1f} -> Manh, tiem can qua mua"
        if v <= 40: return f"{v:.1f} -> Yeu, tiem can qua ban"
        return f"{v:.1f} -> Trung lap"
    except:
        return 'N/A'

def stoch_label(k, d):
    if not k or not d: return 'N/A'
    try:
        k, d = float(k), float(d)
        if k >= 80: return f"{k:.1f}/{d:.1f} -> Qua mua 🔴"
        if k <= 20: return f"{k:.1f}/{d:.1f} -> Qua ban 🟢"
        if k > d: return f"{k:.1f}/{d:.1f} -> K cat tren D, da tang ✅"
        return f"{k:.1f}/{d:.1f} -> K duoi D, da yeu ⚠️"
    except:
        return 'N/A'

def vol_label(ratio):
    if not ratio: return 'N/A'
    try:
        ratio = float(ratio)
        if ratio >= 2.0: return f"{ratio:.2f}x TB20 -> Bung no khoi luong 🔥"
        if ratio >= 1.5: return f"{ratio:.2f}x TB20 -> Khoi luong manh ✅"
        if ratio >= 1.0: return f"{ratio:.2f}x TB20 -> Binh thuong"
        return f"{ratio:.2f}x TB20 -> Khoi luong yeu ⚠️"
    except:
        return 'N/A'

def macd_hist_label(hist):
    if not hist: return 'N/A'
    try:
        hist = float(hist)
        if hist > 0: return f"+{hist:.2f} -> Da tang ✅"
        return f"{hist:.2f} -> Da giam ⚠️"
    except:
        return 'N/A'

def safe_int(v):
    if v is None: return 'N/A'
    try:
        return f"{int(float(v)):,}"
    except:
        return 'N/A'

def safe_float(v, fmt=".2f"):
    if v is None: return 'N/A'
    try:
        return f"{float(v):{fmt}}"
    except:
        return 'N/A'

def safe_mcap(v):
    if v is None: return 'N/A'
    try:
        return f"{float(v)/1e12:.1f}T VND"
    except:
        return 'N/A'

def safe_pct(v):
    if v is None: return 'N/A'
    try:
        return f"{float(v)*100:+.2f}%"
    except:
        return 'N/A'

try:
    print("Step 1: Fetching full stock data for FPT...")
    r_full = httpx.get("http://127.0.0.1:8000/stock/FPT/full", timeout=30.0)
    full_data = r_full.json()
    raw_info = full_data.get("info", {})
    technicals = full_data.get("technicals", {})
    vnindex = full_data.get("vnindex", {})
    ohlcv = full_data.get("ohlcv", [])

    # Tính toán các biến giá giống hệt Frontend
    currentPrice = None
    change = None
    volume = None
    if ohlcv:
        last_bar = ohlcv[-1]
        prev_bar = ohlcv[-2] if len(ohlcv) > 1 else last_bar
        currentPrice = last_bar.get("close")
        prevPrice = prev_bar.get("close")
        change = (float(currentPrice) - float(prevPrice)) / float(prevPrice) if prevPrice else 0
        volume = last_bar.get("volume")

    print("Step 2: Fetching ML predictions (Prophet + XGBoost)...")
    r_pred = httpx.get("http://127.0.0.1:8000/stock/predict?ticker=FPT&periods=10", timeout=30.0)
    prediction = r_pred.json()

    print("Step 3: Building Prompt (Frontend buildAnalysisPrompt logic in Python)...")
    
    # Format ML forecasts
    ml_forecast_text = 'N/A'
    ml_accuracy_label = 'N/A'
    if prediction and prediction.get("success") and prediction.get("forecast"):
        f_list = prediction["forecast"]
        indices = [0, 2, 4, 9] # +1, +3, +5, +10
        ml_forecast_text = ", ".join([
            f"Phien +{idx+1}: {safe_int(f_list[idx]['predicted'])} VND ({'+' if f_list[idx]['change_pct_from_now'] >= 0 else ''}{f_list[idx]['change_pct_from_now']}%)"
            for idx in indices if idx < len(f_list)
        ])
        if prediction.get("accuracy_pct"):
            ml_accuracy_label = f"{prediction['accuracy_pct']}%"

    s1 = technicals.get("bb_lower")
    r1 = technicals.get("bb_upper")
    s1_label = safe_int(s1) + " VND" if s1 else 'N/A'
    r1_label = safe_int(r1) + " VND" if r1 else 'N/A'
    
    atr_stop = technicals.get("atr_stop")
    atr_stop_label = safe_int(atr_stop) + " VND" if atr_stop else 'N/A'
    atr_val = technicals.get("atr")
    atr_val_label = safe_int(atr_val) + " VND" if atr_val else 'N/A'

    live_data_prompt = f"""
DU LIEU THUC TE HIEN TAI (Bat buoc su dung chinh xac cac so lieu nay - TUYET DOI KHONG tu bia so):

GIA & KHOI LUONG:
- Gia hien tai: {safe_int(currentPrice)} VND | Thay doi hom nay: {safe_pct(change)}
- Volume hom nay: {safe_float(float(volume)/1e6 if volume else None, fmt=".1f")}M co phieu | {vol_label(technicals.get('volume_ratio'))}

CHI BAO KY THUAT:
- Xu huong MA: {str(technicals.get('trend', 'sideways')).upper()}
- MA20: {safe_int(technicals.get('ma20'))} | MA50: {safe_int(technicals.get('ma50'))} | MA200: {safe_int(technicals.get('ma200'))} VND
- RSI(14): {rsi_label(technicals.get('rsi'))}
- Stochastic K/D: {stoch_label(technicals.get('stoch_k'), technicals.get('stoch_d'))}
- MACD: {safe_float(technicals.get('macd'))} | Signal: {safe_float(technicals.get('macd_signal'))} | Histogram: {macd_hist_label(technicals.get('macd_hist'))}
- Bollinger Bands: Tren {safe_int(technicals.get('bb_upper'))} | Giua {safe_int(technicals.get('bb_mid'))} | Duoi {safe_int(technicals.get('bb_lower'))} VND
- ATR(14): {atr_val_label} | Stop-loss ATRx1.5: {atr_stop_label}
- Khang cu gan nhat: {r1_label} | Ho tro gan nhat: {s1_label}

CO BAN:
- P/E: {safe_float(raw_info.get('pe'))}x | P/B: {safe_float(raw_info.get('pb'))}x
- ROE: {safe_float(raw_info.get('roe'))}% | ROA: {safe_float(raw_info.get('roa'))}%
- EPS: {safe_int(raw_info.get('eps'))} VND | Von hoa: {safe_mcap(raw_info.get('market_cap'))}
- Khoi ngoai (DTNN): Mua rong {safe_int(raw_info.get('foreign_net'))} VND

BOI CANH THI TRUONG:
- Chi so VNINDEX: {safe_float(vnindex.get('close'))} | Thay doi: {safe_float(vnindex.get('change'), fmt="+.2f")} ({safe_float(vnindex.get('change_pct'), fmt="+.2f")}%)

DU BAO DINH LUONG CUA MOHINH ML (Prophet + XGBoost):
- Duong di gia du kien: {ml_forecast_text}
- Do chinh xac lich su (accuracy): {ml_accuracy_label}
"""

    system_prompt = "Bạn là chuyên gia phân tích và dự báo giá chứng khoán Việt Nam với 15 năm kinh nghiệm."

    user_prompt = f"""Ban la chuyen gia phan tich va du bao gia chung khoan Viet Nam voi 15 nam kinh nghiem.
Phan tich toan dien FPT (HOSE) khung 3 ngay toi (T+3).

Nguon tham chieu uu tien: SSI iBoard, FireAnt
{live_data_prompt}

YEU CAU PHAN TICH (cau truc chuan, toi da 450 tu):

### 📊 TONG QUAN
2-3 cau ve vi the hien tai va boi canh thi truong chung VNINDEX.

### 📈 KY THUAT
- **Xu huong chinh** + diem vao lenh toi uu
- **RSI & Stochastic**: trang thai qua mua/ban va tin hieu giao cat
- **MACD**: momentum dang tang hay giam, tin hieu giao cat gan nhat
- **Volume** - xac nhan hay phan ky voi gia?
- **Vung ho tro/khang cu** quan trong nhat can theo doi

### 📋 CO BAN
- Dinh gia so voi nganh (re/dat/hop ly) + ly do ngan gon
- Nhan xet dong thai giao dich cua khoi ngoai và anh huong dong tien

### 🎯 KE HOACH GIAO DICH & DU BAO GIATHANH (T+3)
AI hay tinh toan cac kich ban Tang/Giam bang cach cong/tru gia tri ATR = {atr_val_label} vao gia tri kich ban Co so cua mo hinh ML o tren.

| Phien | Kich ban Tang (Cai thien + 1.0 ATR) | Kich ban Co so (Theo Mo hinh ML) | Kich ban Giam (Cai thien - 1.0 ATR) |
|-------|---------------------------------|---------------------------------|---------------------------------|
| +1    | ___ VND                         | ___ VND                         | ___ VND                         |
| +3    | ___ VND                         | ___ VND                         | ___ VND                         |
| +5    | ___ VND                         | ___ VND                         | ___ VND                         |
| +10   | ___ VND                         | ___ VND                         | ___ VND                         |

- **Xac suat kich ban**: Tang: ?% | Di ngang: ?% | Giam: ?% (Tong bang 100%)
- **Vung mua toi uu**: ___ VND
- **Stop-loss**: ___ (ATRx1.5 = {atr_stop_label} tinh tu gia vao)
- **Take-profit 1**: ___ | **Take-profit 2**: ___
- **Ti le Risk/Reward**: ___ | **Ti trong goi y**: ___% von | **Nam giu du kien**: ___ ngay

### 📐 MO HÌNH FIBONACCI PROJECTION (Tinh tu day S1: {s1_label} len dinh R1: {r1_label}):
- 61.8%: ___ VND
- 100%: ___ VND
- 161.8%: ___ VND

### ⚡ KHUYEN NGHI & DIEU KIEN HUY DU BAO
- **KHUYEN NGHI CHINH**: BUY 🟢 / HOLD 🟡 / SELL 🔴 — [ly do 1 cau] — Do tin cay: ___%
- **Dieu khien huy du bao**: Du bao nay se mat hieu luc neu xay ra 1 trong cac dieu kien: (VD: gia dong cua duoi stop-loss, hoac VNINDEX gay ho tro...)

### ⚠️ RUI RO CHINH (top 3)
1. ___ 2. ___ 3. ___

---
Phan tich tham khao, khong phai loi khuyen dau tu. Quyet dinh la trach nhiem cua nha dau tu."""

    print("Step 4: Requesting AI analysis from /claude/analyze (Gemini proxy)...")
    payload = {
        "model": "gemini-2.0-flash",
        "system": system_prompt,
        "messages": [{"role": "user", "content": user_prompt}],
        "bypass_cache": True
    }
    
    r_ai = httpx.post("http://127.0.0.1:8000/claude/analyze", json=payload, timeout=60.0)
    print("Status code from AI:", r_ai.status_code)
    if r_ai.status_code == 200:
        response_text = r_ai.json()
        content = response_text.get("content", str(response_text))
        with open("scratch/ai_output.md", "w", encoding="utf-8") as f:
            f.write(content)
        print("\n=== AI RESPONSE SUCCESS (Saved to scratch/ai_output.md) ===\n")
        print("First 200 chars of output:")
        print(content[:200].encode('ascii', errors='ignore').decode('ascii'))
    else:
        print("Error content (safe print):")
        print(r_ai.text.encode('ascii', errors='ignore').decode('ascii'))

except Exception as e:
    print("Execution failed:", e)
    import traceback
    traceback.print_exc()
