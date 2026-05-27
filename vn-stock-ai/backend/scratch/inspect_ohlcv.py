import requests

url = "http://localhost:8000/stock/FPT/ohlcv?period=1y"
try:
    response = requests.get(url)
    print("Status Code:", response.status_code)
    data = response.json()
    print("Total points:", len(data))
    for item in data:
        if "2026-03-28" in item.get("date") or "2026-05-12" in item.get("date"):
            print(item)
except Exception as e:
    print("Error:", e)
