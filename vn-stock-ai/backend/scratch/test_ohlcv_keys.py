import requests
import json

if __name__ == '__main__':
    url = "http://127.0.0.1:8000/stock/ohlcv?ticker=FPT&period=3mo"
    print(f"Fetching from {url}...")
    try:
        r = requests.get(url)
        if r.status_code == 200:
            data = r.json()
            if data and len(data) > 0:
                print("SUCCESS! First item:")
                for k, v in data[0].items():
                    print(f"  {k}: {v} (type: {type(v).__name__})")
            else:
                print("SUCCESS but empty list")
        else:
            print("FAILED with status code:", r.status_code)
    except Exception as e:
        print("FAILED with error:", e)
