import traceback
import sys

try:
    from vnstock import Market
    m = Market()
    print("Has index?", hasattr(m, "index"))
    if hasattr(m, "index"):
        print("m.index dir:", dir(m.index))
        try:
            res = m.index()
            print("Type index():", type(res))
            print("Value index():", res)
        except Exception as e:
            print("Error calling index():", e)
            traceback.print_exc()
except Exception as e:
    print("Error:")
    traceback.print_exc()
