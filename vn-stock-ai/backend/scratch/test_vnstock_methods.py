from app.services.vnstock_service import _get_vnstock

Vnstock_ = _get_vnstock()
if Vnstock_:
    stock = Vnstock_().stock(symbol="FPT", source="VCI")
    print("Stock object directories:")
    print(dir(stock))
    if hasattr(stock, 'finance'):
        print("\nstock.finance directories:")
        print(dir(stock.finance))
    if hasattr(stock, 'company'):
        print("\nstock.company directories:")
        print(dir(stock.company))
        try:
            print("\nTrying to call stock.company methods:")
            # List properties/methods in company
            for attr in dir(stock.company):
                if not attr.startswith('_'):
                    print(f"  {attr}")
        except Exception as e:
            print("Error inspecting stock.company:", e)
else:
    print("Vnstock class not found")
