import traceback
import sys

try:
    from vnstock import Market
    m = Market()
    print("Market attributes:", dir(m))
    
    # Try calling common index/market methods if they exist
    for method_name in ("index_board", "index_stats", "overview", "board", "quote", "indices"):
        if hasattr(m, method_name):
            print(f"\n--- Calling m.{method_name}() ---")
            try:
                res = getattr(m, method_name)()
                print("Type:", type(res))
                if hasattr(res, "head"):
                    print("Head:\n", res.head())
                else:
                    print("Value:", res)
            except Exception as method_err:
                print(f"Error calling {method_name}:", method_err)
except Exception as e:
    print("Error:")
    traceback.print_exc()
