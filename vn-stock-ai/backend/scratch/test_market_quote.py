import traceback
import sys

try:
    from vnstock import Market
    m = Market()
    res = m.quote(symbol="VNINDEX")
    print("Type quote('VNINDEX'):", type(res))
    if hasattr(res, "head"):
        print("Head:\n", res.head())
        # Print dictionary records
        print("Records:\n", res.to_dict('records')[0] if not res.empty else "empty")
    else:
        print("Value:", res)
except Exception as e:
    print("Error:")
    traceback.print_exc()
