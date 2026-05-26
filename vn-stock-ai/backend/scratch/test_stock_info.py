import sys
import os

# Add parent directory to path to import app modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services.vnstock_service import get_stock_info

if __name__ == '__main__':
    print("Testing get_stock_info for FPT...")
    try:
        data = get_stock_info("FPT")
        print("\nSUCCESS! Returned data:")
        for k, v in data.items():
            print(f"  {k}: {v} (type: {type(v).__name__})")
    except Exception as e:
        print("FAILED with error:", e)
