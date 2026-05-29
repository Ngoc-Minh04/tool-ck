import httpx

url = "http://127.0.0.1:8000/stock/news?ticker=FPT"
try:
    r = httpx.get(url, timeout=10)
    print("Status code:", r.status_code)
    print("Response JSON:")
    import json
    print(json.dumps(r.json()[:3], indent=2, ensure_ascii=False))
except Exception as e:
    print("Error calling endpoint:", e)
