import urllib.request
req = urllib.request.Request("http://127.0.0.1:8000/health")
req.add_header("Origin", "http://localhost:5173")
req.add_header("Access-Control-Request-Method", "GET")

try:
    with urllib.request.urlopen(req) as response:
        print("Status:", response.status)
        print("Headers:")
        for k, v in response.getheaders():
            print(f"  {k}: {v}")
except Exception as e:
    print("Error:", e)
