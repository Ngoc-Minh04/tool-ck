from app.services.vnstock_service import Vnstock
try:
    stock = Vnstock().stock(symbol="FPT", source="VCI")
    ratio = stock.finance.ratio(period="quarter", lang="en")
    print(ratio[['item_id', 'item_en']].to_string())
except Exception as e:
    print("Error:", e)
