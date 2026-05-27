import requests

url = "http://localhost:8000/stock/FPT/ohlcv?period=1y"
try:
    response = requests.get(url)
    data = response.json()
    prices = [74600, 77700, 85100, 89100, 87190]
    for p in prices:
        print(f"Searching close price around {p}:")
        found = []
        for item in data:
            if abs(item["close"] - p) < 500:
                found.append(f"  {item['date']}: {item['close']}")
        for f in found[:3]:
            print(f)
except Exception as e:
    print(e)
