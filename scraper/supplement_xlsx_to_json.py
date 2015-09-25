from os.path import join, dirname, abspath
import xlrd
import re
import pprint
import json
import copy

def parseTitle(sheet, sheetType):
	title = {}
	fullTitle = sheet.row(1)[0].value
	title["id"] = fullTitle	.split(u'\u2014')[0].replace(".","").replace("Table ","")
	title["name"] = fullTitle.split(u'\u2014')[1]
	return title


def parseHeader(output, headRows, lastRow, sheet, sheetType):
	headerString = "<thead>"
	rows = []
	data = {}
	for i in range(2,headRows):
		rows.append(sheet.row(i))
#For these sheet types, the first two columns (e.g "Year") are mereged into 1 with the second column totally empty because shrug
#So just popping 2nd column out for simplicity (instead of preserving strange colspans in html table or data table)
	if(sheetType == "simpleTime" and (sheet.name not in col1_exceptions)):
		for row in rows:
			del(row[1])

	fixRows = copy.deepcopy(rows)
	for c in range(0, len(fixRows[0])):
		last = len(fixRows)
		if fixRows[last-1][c].ctype == 0:
			counter = last-1
			while True:
				if fixRows[counter][c].ctype == 0:
					counter -= 1
					continue
				elif counter < 0:
					break
				else:
					fixRows[last-1][c] = fixRows[counter][c]
					break

	for r in range(2,headRows):
		headerString += "<tr>"
		for c in range(0,len(rows[r-2])):
			if(rows[r-2][c].ctype != 0):
				headerString += getTH(rows, r, c)
			if(fixRows[r-2][c].ctype != 0):
				if((r == headRows-1 and c != 0) or (c == 0 and r ==2)):
					getData(data, fixRows, r, c, headRows, lastRow, sheet, sheetType)
		headerString += "</tr>"
	headerString += "</thead>"
	bodyString = getTbody(sheet, sheetType, headRows, lastRow)
	chartType = ""
	if(sheetType == "simpleTime"):
		chartType = "timeSeries"
	return{ "headerString": headerString, "data": data, "bodyString": bodyString, "chartType": chartType}

def getTbody(sheet, sheetType, headRows, lastRow):
	tbody = "<tbody>"
	for r in range(headRows, lastRow):
		row = sheet.row(r)
		for c in range(0, len(row)):
			if sheetType == "simpleTime" and c==1 and sheet.name not in col1_exceptions:
				continue
			if(c==0):
				tbody += "<tr class="
				val = getYear(sheet.cell_value(rowx=r, colx=c))
				if isinstance(val, basestring):
					if(val.find("-") != -1):
						y1 = int(val.split("-")[0])
						y2 = int(val.split("-")[1])
						for y in range(y1, y2+1):
							tbody += "\"" + str(y) + "\""
							space = " " if (y != y2) else ""
							tbody += space
					else:
						tbody += str(val)
				else:
					tbody += str(val)
				tbody += ">"
			cell = sheet.cell_value(rowx=r, colx=c)
			tbody += "<td class=\"col%i\">%s</td>"%(c, cell)
			if(c==len(row)):
				tbody += "</tr>"
	tbody += "</tbody>"
	return tbody
		# if(sheetType == "simpleTime"):
			# years = getYear()

def getTH(rows, rowNum, colNum):
	edge = True
	rowNum -= 2
	th = "<th"
	rowspan = 1
	colspan = 1
	for r in range(rowNum, len(rows)):
		row = rows[r]
		if(row[colNum].ctype == 0):
			rowspan += 1
	for i in range(colNum+1, len(rows[rowNum])):
		if(rows[rowNum][i].ctype == 0):
			if rowNum-1 >= 0:
				if(rows[rowNum-1][i].ctype == 0):
					colspan += 1
			else:
				colspan += 1
		else:
			break
	if (rowspan != 1):
		th += " rowspan=\"%i\" "%rowspan
	if (colspan != 1):
		th += " colspan=\"%i\" "%colspan
	if(rowNum == len(rows)-1):
		th += " class=\"series col%i\" "%colNum
	else:
		for r2 in range(rowNum+1, len(rows)):
			if(rows[r2][colNum] != ""):
				edge = False
	if not edge:
		th += " class=\"series col%i\" "%colNum




	th += ">"
	val = rows[rowNum][colNum].value
	if(isinstance(val, float)):
		val = str(val)
	th += val
	th += "</th>"
	return th

def getData(data, rows, rowNum, colNum, headRows, lastRow, sheet, sheetType):
	if (colNum == 0):
		if sheetType == "simpleTime":
			obj = data["years"] = {}
			obj["series"] = getXSeries(rowNum, 0, headRows, lastRow, sheet, sheetType)
			dType = obj["type"] = "year"
	else:
		obj = data["col%i"%colNum] = {}
		obj["series"] = getSeries(rowNum, colNum, lastRow, sheet, sheetType)
		label = obj["label"] = getLabel(rows, colNum)
		dType = obj["type"] = getType(label)

def getXSeries(rowNum, colNum, headRows, lastRow, sheet, sheetType):
	series = []
	if sheetType == "simpleTime":
		for i in range(headRows, lastRow):
			val = sheet.cell_value(rowx=i, colx=colNum)
			val = getYear(val)
			series.append(val)
		return series

def getYear(val):
	if isinstance(val, basestring):
##allow for year ranges (strings) and decimal points
		non_decimal = re.compile(r'[^\d.-]+')
		float_test = re.compile(r'[^\d.]+')
		val = val.replace(u'\xe2', '').replace(u'\u2013','-')
		val = non_decimal.sub('',val)
##should just be ranges, no negative years
		if(val.find("-") == -1):
			val = val
##Once footnotes have been replaced, cast straight up numbers to float (e.g. "e 2012")
		if float_test.search(val) == None:
			val = int(float(val))
	else:
		val = int(float(val))
	return val

def getSeries(rowNum, colNum, lastRow, sheet, sheetType):
	series = []
	if sheetType == "simpleTime" and sheet.name not in col1_exceptions:
		colNum += 1
	for i in range(rowNum+1, lastRow):
		val = sheet.cell_value(rowx=i, colx=colNum)
		if(val == ". . ."):
			val = False
#strip footnotes markers and space from numeric values, then parse to float
#Should hold for any sheetType where all data is expected to be numeric
		elif(sheetType == "simpleTime" and isinstance(val, basestring)):
##allow for negative numbers and decimal points
			non_decimal = re.compile(r'[^\d.-]+')
			decimal = re.compile(r'\d')
#If cell ONLY contains footnote (no digits), don't try to cast it to float
			if(decimal.search(val)):
				val = non_decimal.sub('', val)
				val = float(val)
			else:
				val = False
		series.append(val)
	return series

def getLabel(rows, colNum):
	label = ""
	for r in range(0, len(rows)):
		row = rows[r]
		c = colNum
		while(row[c].ctype == 0 and c > 0):
			c -= 1
		if(row[c].ctype != 0):
			val = row[c].value
			if(isinstance(val, float)):
				val = str(val)
			label += val
			sep = "" if (r==len(rows)-1) else " :: "
			label += sep
	return label

def getType(label):
	labels = ["dollar","percent"]
	for l in labels:
		if label.upper().find(l.upper()) != -1:
			return l
			break
	return "********** unknown *******"

book = xlrd.open_workbook("../data/statistical_supplement/supplement14.xlsx")

sheets = book.sheet_names()

simpleTimeSheets = ['2.A3','2.A4','2.A8','2.A9','2.A13','2.A27','2.A28','2.C1','2.F3','3.C4','3.C6.1','3.E1','4.A1','4.A2','4.A3','4.A4','4.A5','4.A6','4.B1','4.B2','4.B4','4.B11','4.C1','5.A17','5.C2','5.D3','5.E2','5.F6','5.F8','5.F12','5.G2','6.C7','6.D6','6.D8','6.D9','7.A9','7.E6','8.A1','8.A2','8.B10','9.B1','9.D1']
col1_exceptions = ['6.C7','5.F8','5E.2','5.D3','5.C2','5.A17']
# simpleTimeSheets = ['2.A9']


for sheet_id in simpleTimeSheets:
	xl_sheet = book.sheet_by_name(sheet_id)
	output = {}
	headRows = 0
	lastRow = 0
	for i in range(0, xl_sheet.nrows):
		row = xl_sheet.row(i)
		testVal = xl_sheet.cell_value(rowx=i, colx=0)
		reg = re.compile(r'19|20', re.UNICODE)
		if(isinstance(testVal,float)):
			headRows = i
			break
		elif(re.match(reg, testVal.encode('utf8'))):
			headRows = i
			break
	for i in range(headRows+1, xl_sheet.nrows):
		row = xl_sheet.row(i)
		testType = xl_sheet.cell_type(rowx=i, colx=0)
		if(testType == 0):
			lastRow = i
			break

	output["html"] = {}
	values = parseHeader(output, headRows, lastRow, xl_sheet, "simpleTime")
	titles = parseTitle(xl_sheet, "simpleTime")
	output["html"]["header"] = values["headerString"]
	output["html"]["body"] = values["bodyString"]
	output["data"] = values["data"]
	output["title"] = titles
	output["category"] = values["chartType"]

	with open('../data/json/stat_supplement_table-%s.json'%titles["id"], 'w') as fp:
	    json.dump(output, fp, indent=4, sort_keys=True)