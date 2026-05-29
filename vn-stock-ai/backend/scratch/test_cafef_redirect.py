import httpx

headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "application/json, text/javascript, */*; q=0.01",
    "Referer": "https://cafef.vn/",
    "X-Requested-With": "XMLHttpRequest"
}

client = httpx.Client(headers=headers)

def trace_url(url):
    print(f"\n--- Tracing: {url} ---")
    current_url = url
    for i in range(5):
        r = client.get(current_url, follow_redirects=False)
        print(f"Step {i}: {current_url} -> Status: {r.status_code}")
        if r.status_code in (301, 302, 303, 307, 308):
            loc = r.headers.get("Location")
            print(f"  Redirects to: {loc}")
            if not loc:
                break
            if loc.startswith("/"):
                current_url = "https://cafef.vn" + loc
            else:
                current_url = loc
        else:
            print("  Final Content Length:", len(r.text))
            print("  Content Preview:", r.text[:300])
            break

trace_url("https://cafef.vn/du-lieu/ajax/pagenew.ashx?symbol=FPT&tintuc=1")
