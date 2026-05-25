from app.services.vnstock_service import Vnstock
try:
    stock = Vnstock().stock(symbol="FPT", source="VCI")
    ratio = stock.finance.ratio(period="quarter", lang="en")
    print("Ratio columns:", ratio.columns if hasattr(ratio, 'columns') else "No columns")
    print("Ratio empty:", ratio.empty if hasattr(ratio, 'empty') else "No empty")
    print("Ratio head:")
    print(ratio.head(2))
except Exception as e:
    print("Error:", e)
