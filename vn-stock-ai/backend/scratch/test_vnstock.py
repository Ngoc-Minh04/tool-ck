import sys
import io

class SafeStreamWrapper:
    def __init__(self, original_stream):
        self.original_stream = original_stream
    def write(self, data):
        try:
            self.original_stream.write(data)
        except:
            pass
    def flush(self):
        try:
            self.original_stream.flush()
        except:
            pass

sys.stdout = SafeStreamWrapper(sys.stdout)
sys.stderr = SafeStreamWrapper(sys.stderr)

import pandas as pd
from vnstock import Vnstock

try:
    stock = Vnstock().stock(symbol="FPT", source="VCI")
    df = stock.finance.income_statement(period="quarter")
    
    id_col = "item_id" if "item_id" in df.columns else "item"
    
    # Check rows using lowercase substring searches
    rev_row = df[df[id_col].str.lower().str.contains("revenue_net|net_sale|gross_revenue|net_revenue", na=False)]
    if rev_row.empty:
        rev_row = df[df["item"].str.lower().str.contains("doanh thu thuần|doanh thu bán hàng", na=False)]
        
    profit_row = df[df[id_col].str.lower().str.contains("profit_after_tax|net_profit_after_tax|net_profit_loss_after_tax|net_profit", na=False)]
    if profit_row.empty:
        profit_row = df[df["item"].str.lower().str.contains("lợi nhuận sau thuế", na=False)]
        
    print("REV ROW FOUND:", not rev_row.empty)
    if not rev_row.empty:
        print("REV ITEM ID:", rev_row[id_col].values[0])
        
    print("PROFIT ROW FOUND:", not profit_row.empty)
    if not profit_row.empty:
        print("PROFIT ITEM ID:", profit_row[id_col].values[0])
        
    if not rev_row.empty and not profit_row.empty:
        quarter_cols = [c for c in df.columns if c not in ("item", "item_en", "item_id")]
        quarter_cols = sorted(quarter_cols)
        
        rows = []
        for q in quarter_cols[-8:]:
            rev_val = float(rev_row[q].values[0]) if not pd.isna(rev_row[q].values[0]) else 0.0
            profit_val = float(profit_row[q].values[0]) if not pd.isna(profit_row[q].values[0]) else 0.0
            rows.append({
                "quarter": q,
                "revenue": int(rev_val / 1e9),
                "profit": int(profit_val / 1e9)
            })
        print("SUCCESSFULLY PARSED:")
        for r in rows:
            print(r)
            
except Exception as e:
    print("ERROR:", e)
