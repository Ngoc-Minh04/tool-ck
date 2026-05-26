import urllib.request
import json
import traceback

try:
    url = "https://finfo-api.vndirect.com.vn/v2/index/overview"
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req) as response:
        res_data = json.loads(response.read().decode('utf-8'))
        print("Success!")
        print("Keys:", res_data.keys() if isinstance(res_data, dict) else "list")
        if isinstance(res_data, dict) and "data" in res_data:
            data = res_data["data"]
        else:
            data = res_data
        
        if isinstance(data, list):
            for item in data[:6]:
                print(f"Code: {item.get('code')}")
                for k, v in item.items():
                    print(f"  {k}: {v}")
except Exception as e:
    print("Error:")
    traceback.print_exc()
