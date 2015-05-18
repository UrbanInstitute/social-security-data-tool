from bs4 import BeautifulSoup

def isDataTable(table):
	if(table.find_all("div", class_="TableTitle")):
		return True
	else:
		return False