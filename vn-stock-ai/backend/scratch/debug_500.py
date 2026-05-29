import json
import math
from app.services.vnstock_service import get_ohlcv
from app.services.indicator_service import compute_indicators

def check_nan(val):
    if isinstance(val, float) and (math.isnan(val) or math.isinf(val)):
        return True
    return False

try:
    print("Fetching OHLCV for FPT...")
    ohlcv_data = get_ohlcv("FPT", "3mo")
    print(f"Fetched {len(ohlcv_data)} records.")
    
    print("Computing indicators...")
    indicators = compute_indicators(ohlcv_data)
    print("Indicators computed successfully.")
    
    # Check for NaN or inf values in indicators
    has_error_val = False
    for k, v in indicators.items():
        if check_nan(v):
            print(f"WARNING: Key '{k}' is NaN or Inf: {v}")
            has_error_val = True
        else:
            print(f"{k}: {v} (type: {type(v).__name__})")
            
    print("Trying to serialize indicators to JSON...")
    json_str = json.dumps(indicators)
    print("Serialized successfully!")
except Exception as e:
    print("FAILED with exception:", e)
    import traceback
    traceback.print_exc()
