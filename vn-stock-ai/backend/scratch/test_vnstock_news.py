import sys
sys.path.append('.')
from app.services.vnstock_service import _get_vnstock

Vnstock_ = _get_vnstock()
if Vnstock_:
    for symbol in ["VIC", "HPG", "MWG"]:
        print(f"\n--- Checking news for {symbol} ---")
        stock = Vnstock_().stock(symbol=symbol, source="VCI")
        try:
            df = stock.company.news()
            if df is not None and not df.empty:
                print("Columns:", list(df.columns))
                non_null_links = df[df['news_source_link'].notna()]
                print(f"Total news: {len(df)}, news with source link: {len(non_null_links)}")
                if len(non_null_links) > 0:
                    print("Sample source links:")
                    print(non_null_links['news_source_link'].head().tolist())
                else:
                    print("Sample rows:")
                    print(df[['news_title', 'public_date']].head(2).to_dict(orient='records'))
            else:
                print("No news returned or empty DataFrame")
        except Exception as e:
            print("Error:", e)
else:
    print("Vnstock class not found")
