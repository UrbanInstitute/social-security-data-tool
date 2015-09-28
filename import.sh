python scraper/supplement_xlsx_to_json.py
for f in data/json/*.json; do
    # do some stuff here with "$f"
    # remember to quote it or spaces may misbehave
    mongoimport --db test --collection tables --file "$f"
done