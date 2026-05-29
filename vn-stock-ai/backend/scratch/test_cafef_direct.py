import httpx

url = "https://cafef.vn/Ajax/PageNew.ashx?symbol=FPT&tintuc=1"
headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "application/json, text/javascript, */*; q=0.01",
    "Referer": "https://cafef.vn/",
    "X-Requested-With": "XMLHttpRequest"
}

r = httpx.get(url, headers=headers, follow_redirects=False)
print("Status code:", r.status_code)
if r.status_code in (301, 302):
    print("Redirect Location:", r.headers.get("Location"))
else:
    print("Text length:", len(r.text))
    print("Preview:", r.text[:300])
