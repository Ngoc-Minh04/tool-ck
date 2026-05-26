import urllib.request
import json
import traceback

try:
    url = "https://price.vndirect.com.vn/api/web/index/overview"
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req) as response:
        res_data = json.loads(response.read().decode('utf-8'))
        print("Success fetching from VNDIRECT index overview!")
        print("Data type:", type(res_data))
        if isinstance(res_data, list):
            for item in res_data[:5]:
                print(f"Code: {item.get('code')}")
                for k, v in item.items():
                    print(f"  {k}: {v}")
        elif isinstance(res_data, dict):
            print(res_data)
except Exception as e:
    print("Error:")
    traceback.print_exc()
