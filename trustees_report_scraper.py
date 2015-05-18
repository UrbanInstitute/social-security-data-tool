from bs4 import BeautifulSoup
import urllib2
import csv
import os
from validator import *
from scraper import *

#Get list of all table URLs from table of contents
#Since many of these links point to anchors on the same page, we remove the hashes and look for unique URL's
#Then we'll scrape those unique url's for all tables
baseURL = "http://www.ssa.gov/OACT/TR/2014/"

url = baseURL + "X1_trLOT.html"
page = urllib2.urlopen(url)
soup = BeautifulSoup(page.read())

tables = soup.find_all('div',class_='TableTitleLOT')
links = []

for table in tables:
	link = table.find('a')
	clean = link["href"].split("#")[0]
	links.append(baseURL + clean)

#get unique elements by casting to set
links = list(set(links))
data = {}

def getTablesFromPage(link):
	data[link] = []
	page = urllib2.urlopen(link)
	soup = BeautifulSoup(page.read())
	tables = soup.find_all("table")
	for table in tables:
		#ignore non data tables (meta tags in header, for example)
		if validator.isDataTable(table):
			footnotes = []
			nextTable = table.find_next("table")
			tag = table
			while True:
				#look for footnotes
				if tag:
					tag = tag.find_next("div","TableFootnote")
					if tag:
						#We want footnotes between table N and table N+1,
						#if table after footnote is N+1 (it's N+2), we have all the footnotes, so break
						if(tag.find_next("table") != nextTable):
							break
						else:
							footnotes.append(tag)
					else:
						#if no more footnotes, break
						break
				else:
					#if no more tables, break
					break
			data[link].append({"table": table, "footnotes": footnotes})

#Scrape all the data
for link in links:
	getTablesFromPage(link)

#Write all the data to html files
page = 0
for link in data:
	#for each page, create a directory
	if not os.path.exists("data/trustees_report/page%i"%page):
		os.makedirs("data/trustees_report/page%i"%page)
		os.makedirs("data/trustees_report/page%i/tables"%page)
	with open("data/trustees_report/page%i/page%iurl"%(page,page), "w") as urlFile:
		urlFile.write(link.encode('utf8'))
	tableNum = 0
	for obj in data[link]:
		#for each table on the page, create a directory
		if not os.path.exists("data/trustees_report/page%i/tables/table%i"%(page,tableNum)):
			 os.makedirs("data/trustees_report/page%i/tables/table%i"%(page,tableNum))
		table = obj["table"]
		footnotes = obj["footnotes"]
		title = table.find_next("div", class_="TableTitle").text
		#write html table to file
		with open("data/trustees_report/page%i/tables/table%i/%s.html"%(page,tableNum,title), "w") as tableFile:
			tableFile.write(table.prettify().encode('utf8'))
		#write footnotes to file
		with open("data/trustees_report/page%i/tables/table%i/footnotes.html"%(page,tableNum), "w") as footnoteFile:
			for footnote in footnotes:
				footnoteFile.write(footnote.prettify().encode('utf8'))
				footnoteFile.write("\n\n")
		tableNum += 1
	page += 1