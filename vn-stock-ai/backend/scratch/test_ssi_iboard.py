import urllib.request
import traceback

try:
    url = "https://iboard.ssi.com.vn/dboard/api/dbIndexInfo"
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req) as response:
        raw = response.read().decode('utf-8')
        print("Raw response length:", len(raw))
        print("Raw response head:", raw[:500])
except Exception as e:
    print("Error:")
    traceback.print_exc()
