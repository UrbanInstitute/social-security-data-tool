#ssa-di
Data scraping and organization tool for Social Security and Disability Insurance data

##To run the scrapers:
###Statistical Supplement
Data are stored in .xls file in `data/statistical_supplement/supplement14_new.xls`

Run `python scraper/supplement_xlsx_to_json` to generate JSON's from xls file.

Column type (percent, dollar, etc) is determined manually, and stored in `scraper/supplement_units`
