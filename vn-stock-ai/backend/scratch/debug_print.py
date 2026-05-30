import httpx

r_full = httpx.get("http://127.0.0.1:8000/stock/FPT/full", timeout=30.0)
full_data = r_full.json()
print("FULL INFO KEYS:", full_data.get("info", {}).keys())
print("FULL TECHNICALS KEYS:", full_data.get("technicals", {}).keys())
print("VNINDEX:", full_data.get("vnindex"))
print("OHLCV LENGTH:", len(full_data.get("ohlcv", [])))

r_pred = httpx.get("http://127.0.0.1:8000/stock/predict?ticker=FPT&periods=10", timeout=30.0)
prediction = r_pred.json()
print("PREDICTION KEYS:", prediction.keys())
