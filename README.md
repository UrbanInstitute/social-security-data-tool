#ssa-di
Data scraping and organization tool for Social Security and Disability Insurance data

##To run the scrapers:
Instructions are written for Mac users, and should be similar for Linux users.

1. Install [virtualenvwrapper](https://virtualenvwrapper.readthedocs.org/en/latest/) for Python. Installation scripts will depend on location of virutalenvwrapper.sh, but will be similar to:

 ```bash
 $ pip install virtualenvwrapper
 ...
 $ export WORKON_HOME=~/Envs
 $ mkdir -p $WORKON_HOME
 $ source /usr/local/bin/virtualenvwrapper.sh
 ```
 
 I have the `export` and `source` commands in my bash profile (`~/.bash_profile`).
 
2. Create a new virtualenv with `mkvirtualenv ssa-di`
3. Install required packages by running:
 ```
 $ pip install -r requirements.txt
 ```
4. Run
```bash
python trustees_report_scraper.py
```
 
 This will:
 * Create a data folder 
 * Scrape all the links from this [table of contents](http://www.ssa.gov/OACT/TR/2014/X1_trLOT.html)
 * Find unique links (many tables are on the same page, links are just anchors) and scrape all html tables plus footnotes
 * For each page, create a folder at `data/trustees_report/YEAR/pageN`, which contains:
 	* a text file with the page URL
 	* folders for each table, that contain:
 		* the html table
 		* accompanying footnotes