import urllib.request
import json
import traceback

try:
    url = "https://apipub.tcbs.com.vn/tcbs-api/default/market/index-detail"
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req) as response:
        data = json.loads(response.read().decode('utf-8'))
        print("Success fetching index detail from TCBS!")
        print("Data keys/type:", type(data))
        if isinstance(data, list):
            print("First item keys:", data[0].keys() if len(data) > 0 else "empty")
            for idx in data[:5]:
                print(f"Index: {idx.get('ticker') or idx.get('index') or idx.get('name')}")
                for k, v in idx.items():
                    print(f"  {k}: {v}")
        elif isinstance(data, dict):
            print("Dict keys:", data.keys())
            print(data)
except Exception as e:
    print("Error:")
    traceback.print_exc()
