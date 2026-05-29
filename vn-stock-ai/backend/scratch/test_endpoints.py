import httpx

try:
    print("Testing /health ...")
    r = httpx.get("http://127.0.0.1:8000/health", timeout=30.0)
    print("Status:", r.status_code, "Body:", r.text)

    print("\nTesting /stock/FPT/full ...")
    r = httpx.get("http://127.0.0.1:8000/stock/FPT/full", timeout=30.0)
    print("Status:", r.status_code)
    if r.status_code == 500:
        print("Body:", r.text)
    else:
        try:
            print("Keys in response:", list(r.json().keys()))
        except Exception as je:
            print("Response text is not JSON:", r.text[:200])

    print("\nTesting /stock/FPT/technicals ...")
    r = httpx.get("http://127.0.0.1:8000/stock/FPT/technicals", timeout=30.0)
    print("Status:", r.status_code)
    if r.status_code == 500:
        print("Body:", r.text)
    else:
        try:
            print("Keys in response:", list(r.json().keys()))
        except Exception as je:
            print("Response text is not JSON:", r.text[:200])

except Exception as e:
    print("Error during request:", e)
