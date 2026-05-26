import traceback
import sys

try:
    from vnstock import Market
    m = Market()
    idx_market = m.index()
    print("IndexMarket attributes:", dir(idx_market))
    
    # Check common methods
    for attr in dir(idx_market):
        if not attr.startswith("_"):
            val = getattr(idx_market, attr)
            print(f"Attribute {attr} type:", type(val))
            # If callable, try to see what it is
            if callable(val):
                try:
                    # Let's inspect signature or just print it
                    print(f"Callable: {attr}")
                except Exception as e:
                    pass
except Exception as e:
    print("Error:")
    traceback.print_exc()
