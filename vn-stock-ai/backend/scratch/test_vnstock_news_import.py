import sys
sys.path.append('.')
from app.services.vnstock_service import get_company_news

try:
    res = get_company_news("FPT")
    print("Result size:", len(res))
    if res:
        print("First item:")
        import json
        print(json.dumps(res[0], indent=2, ensure_ascii=False))
except Exception as e:
    print("Error calling get_company_news:", e)
