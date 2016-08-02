from os.path import join, dirname, abspath
import xlrd
import re
import pprint
import json
import copy
import csv

STATES = {"Alabama": "AL", "Alaska": "AK", "American Samoa": "AS", "Arizona": "AZ", "Arkansas": "AR", "California": "CA", "Colorado": "CO", "Connecticut": "CT", "Delaware": "DE", "District Of Columbia": "DC","District of Columbia": "DC", "Federated States Of Micronesia": "FM", "Florida": "FL", "Georgia": "GA", "Guam": "GU", "Hawaii": "HI", "Idaho": "ID", "Illinois": "IL", "Indiana": "IN", "Iowa": "IA", "Kansas": "KS", "Kentucky": "KY", "Louisiana": "LA", "Maine": "ME", "Marshall Islands": "MH", "Maryland": "MD", "Massachusetts": "MA", "Michigan": "MI", "Minnesota": "MN", "Mississippi": "MS", "Missouri": "MO", "Montana": "MT", "Nebraska": "NE", "Nevada": "NV", "New Hampshire": "NH", "New Jersey": "NJ", "New Mexico": "NM", "New York": "NY", "North Carolina": "NC", "North Dakota": "ND", "Northern Mariana Islands": "MP", "Ohio": "OH", "Oklahoma": "OK", "Oregon": "OR", "Palau": "PW", "Pennsylvania": "PA", "Puerto Rico": "PR", "Rhode Island": "RI", "South Carolina": "SC", "South Dakota": "SD", "Tennessee": "TN", "Texas": "TX", "Utah": "UT", "Vermont": "VT", "Virgin Islands": "VI", "US Virgin Islands": "VI", "Virginia": "VA", "Washington": "WA", "West Virginia": "WV", "Wisconsin": "WI", "Wyoming": "WY"}
units = {}

def parseUnits():
	cr = csv.reader(open("supplement_units.csv","rU"))
	head = cr.next()
	for row in cr:
		u = units[row[0]] = []
		for c in range(1, len(row)):
			u.append(row[c])

def parseTitle(sheet, sheetType, multiSubtitle=False):
	title = {}
	if(multiSubtitle):
		fullTitle = sheet.row(1)[0].value + " :: Subtable : " +  multiSubtitle["value"]
		title["id"] = fullTitle.split(u'\u2014')[0].replace(".","_").replace("Table ","")+ "-" + str(multiSubtitle["index"])

	else:
		fullTitle = sheet.row(1)[0].value
		title["id"] = fullTitle	.split(u'\u2014')[0].replace(".","_").replace("Table ","")
	title["name"] = fullTitle.split(u'\u2014')[1]
	fullCat = sheet.row(0)[0].value.split(" ")
	catID = fullCat[0]
	cat = ""
	for i in range(1, len(fullCat)):
		cat += fullCat[i]
		if(i != len(fullCat)-1):
			cat += " "
	title["category"] = cat
	title["catID"] = catID
	return title

def parseFootnotes(sheet, lastRow):
	notes = []
	for i in range(lastRow, xl_sheet.nrows):
		row = xl_sheet.row(i)
		type0 = row[0].ctype
		type1 = row[1].ctype
		if(type0 == 6):
			type0 = 0
		if(type1 == 6):
			type1 = 0
		if(type0 == 0 and type1 ==0):
			continue
		elif(type0 != 0 and type1 == 0):
			if(isinstance(row[0].value, float)):
				notes.append({"type":"note", "content":row[0].value})
			else:
				notes.append({"type":"note", "content":row[0].value.replace("Annual Statistical Supplement, 2014", "<span class =\"suppTitle\">Annual Statistical Supplement, 2014</span>")})
		else:
			notes.append({"type":"footnote", "symbol":row[0].value, "content":row[1].value})
	return notes

def parseHeader(output, headRows, lastRow, sheet, sheetType, startRow=False, multi=False):
	headerString = "<thead>"
	rows = []
	data = {}
	for i in range(2,headRows):
		rows.append(sheet.row(i))
#For these sheet types, the first two columns (e.g "Year") are mereged into 1 with the second column totally empty because shrug
#So just popping 2nd column out for simplicity (instead of preserving strange colspans in html table or data table)
	if((sheetType in TIME_TYPES or sheetType in SIMPLE_BARS) and (sheet.name not in col1_exceptions)):
		for row in rows:
			del(row[1])

	fixRows = copy.deepcopy(rows)
	for c in range(0, len(fixRows[0])):
		last = len(fixRows)
		if fixRows[last-1][c].ctype == 0 or fixRows[last-1][c].ctype == 6:
			counter = last-1
			while True:
				if  abs(counter) > len(rows):
					break
				elif fixRows[counter][c].ctype == 0 or fixRows[last-1][c].ctype == 6:
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
			if(rows[r-2][c].ctype != 0 and rows[r-2][c].ctype !=6):
				headerString += getTH(sheet, rows, r, c)
			if(fixRows[r-2][c].ctype != 0):
				if((r == headRows-1 and c != 0) or (c == 0 and r ==2)):
					if sheetType == "medBar":
						if(sheet.name == "5.A1.8" or sheet.name == "6.C1"):
							getData(data, fixRows, r, c, headRows, lastRow, sheet, sheetType, startRow, multi)
						elif (sheet.name == "5.H3" or sheet.name == "5.H4") and (c != 1 and c != 2):
							getData(data, fixRows, r, c, headRows, lastRow, sheet, sheetType, startRow, multi)
						elif (c != 1 and sheet.name != "5.H3" and sheet.name != "5.H4"):
							getData(data, fixRows, r, c, headRows, lastRow, sheet, sheetType, startRow, multi)

					else:
						if multi:
							getData(data, fixRows, r, c, headRows, lastRow, sheet, sheetType, startRow-1, multi)
						else:
							getData(data, fixRows, r, c, headRows, lastRow, sheet, sheetType, startRow, multi)
		headerString += "</tr>"
	headerString += "</thead>"
	bodyString = getTbody(sheet, sheetType, headRows, lastRow, startRow)
	chartType = ""
	if sheetType in TIME_TYPES:
		chartType = "timeSeries"
	elif sheetType == "medMap":
		chartType = "map"
	elif sheetType in SIMPLE_BARS or sheetType == "medBar":
		chartType = "barChart"
	return{ "headerString": headerString, "data": data, "bodyString": bodyString, "chartType": chartType}

def getTbody(sheet, sheetType, headR, lastRow, startRow):
	if(startRow):
		headRows = startRow
	else:
		headRows = headR
	tbody = "<tbody>"
	for r in range(headRows, lastRow):
		row = sheet.row(r)

		for c in range(0, len(row)):
			if (sheetType in TIME_TYPES or sheetType in SIMPLE_BARS) and c==1 and sheet.name not in col1_exceptions:
				continue
			if(c==0):
				tbody += "<tr class="
				if(sheetType == "monthsTime" or sheetType ==  "weirdTime"):
					monthly = True
				else:
					monthly = False
				if (sheetType == "weirdTime" and r == headRows):
					val = "Total"
					tbody += str(val)
				else:
					if sheetType in TIME_TYPES:
						val = getYear(sheet.cell_value(rowx=r, colx=c), monthly)
					else:
						val = sheet.cell_value(rowx=r, colx=c)
					if isinstance(val, basestring) and not monthly and sheetType not in SIMPLE_BARS and sheetType != "medBar":
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
						if isinstance(val, basestring):
							val = val.replace(u'\xe2', '').replace(u'\u2013','-').replace(u'\xa0', u' ')
						tbody += str(val)
				tbody += ">"
			if (sheetType == "weirdTime" and r == headRows and c==0):
				cell = "Total"
				runlist = sheet.rich_text_runlist_map.get((r, c))
			else:
				cell = sheet.cell_value(rowx=r, colx=c)
				runlist = sheet.rich_text_runlist_map.get((r, c))
			if runlist:
				for rl in runlist:
					offset = rl[0]
					font_index = rl[1]
					if book.font_list[font_index].escapement != 0 or font_index == 0:
						cell = cell.replace(u'\xa0', u' ')
						cs = cell.split(' ')
						if len(cs) == 2:
							if len(cs[0]) > len(cs[1]):
								cell = "%s<span class = \"top_footnote top_%s\">%s</span>"%(cs[0],cs[1],cs[1])
							else:
								cell = "<span class = \"top_footnote top_%s\">%s</span>%s"%(cs[0],cs[0],cs[1])
			else:
				single = re.compile("^[A-Z|a-z]$")
				if isinstance(cell, basestring):
					cell = cell.replace(u'\u2013','-')
					if(single.match(cell)):
						cell = "<span class = \"top_footnote top_%s\">%s</span>"%(cell, cell)

			tbody += "<td class=\"col%i\">%s</td>"%(c, cell)
			if(c==len(row)):
				tbody += "</tr>"
	tbody += "</tbody>"
	return tbody
		# if(sheetType in TIME_TYPES):
			# years = getYear()
def getTH(sheet, rows, rowNum, colNum):
	edge = True
	rowNum -= 2
	th = "<th"
	rowspan = 1
	colspan = 1
	# if sheet.name == "5.B4" or sheet.name == "5.D1":
	for r in range(rowNum+1, len(rows)):
		row = rows[r]

		if(row[colNum].ctype == 0 or row[colNum].ctype == 6):
			rowspan += 1
		else:
			break
	for i in range(colNum+1, len(rows[rowNum])):
		if(rows[rowNum][i].ctype == 0 or rows[rowNum][i].ctype == 6):
			if rowNum-1 >= 0:
				if(rows[rowNum-1][i].ctype == 0 or rows[rowNum-1][i].ctype == 6):
					colspan += 1
				else:
					break
			else:
				colspan += 1
		else:
			break
	# if sheet.name == "5.B4" and rows[rowNum][colNum].value == "Year of entitlement":
	# 	# print rows[rowNum][colNum].value, colspan
	# 	colspan = 1

#hacky nonsense for broken header scrapers
	if sheet.name == "3.C4" and colNum == 6:
		colspan = 1
	if (sheet.name == "8.A1" or sheet.name == "8.A2") and colNum == 12:
		colspan = 1
	if sheet.name == "9.B1" and colNum == 7:
		colspan = 1
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
	cell = sheet.cell(rowNum, colNum)

	if(not isinstance(val, float)):
		# val = val.replace()
		val = val.replace(unichr(160)," ").strip()
		vs = val.split(" ")
		last = vs[len(vs)-1].replace(u"\u2014","")
		if len(last) == 1:
			val = ""
			for i in range(0, len(vs)):
				if(i != len(vs) -1):
					val += vs[i]
					val += " "
				else:
					val += "<span class = \"top_footnote top_%s\">%s</span>"%(vs[i],vs[i])
	if(isinstance(val, float)):
		val = str(val)
	th += val
	th += "</th>"
	return th



def getData(data, rows, rowNum, colNum, headR, lastRow, sheet, sheetType, startRow, multi=False):
	if(startRow):
		headRows = startRow
	else:
		headRows = headR
	if (colNum == 0):
		if sheetType in TIME_TYPES:
			obj = data["years"] = {}
			obj["series"] = getXSeries(rowNum, 0, headRows, lastRow, sheet, sheetType, startRow)
			dType = obj["type"] = "year"
		elif sheetType in SIMPLE_BARS or sheetType == "medBar":
			obj = data["categories"] = {}
			obj["series"] = getBarSeries(rowNum, 0, headRows, lastRow, sheet, sheetType, startRow)
			dType = obj["type"] = "barLabel"
	else:
		obj = data["col%i"%colNum] = {}
		if (sheetType == "medMap"):
			obj["series"] = getMapSeries(rowNum, colNum, lastRow, sheet, sheetType, startRow)
		elif (sheetType == "weirdTime"):
			obj["series"] = getSeries(rowNum+1, colNum, lastRow, sheet, sheetType, startRow)
		else:
			obj["series"] = getSeries(rowNum, colNum, lastRow, sheet, sheetType, startRow)
		label = obj["label"] = getLabel(rows, colNum)
		addWords(words, label)
		if multi:
			name = sheet.name + "-M" + str(multi["index"])
			unit = " **** unknown ****"
			if name in units:
				unit = units[sheet.name + "-M" + str(multi["index"])][colNum]
			else:
				unit = units[sheet.name][colNum]
		else:
			unit = units[sheet.name][colNum]
		dType = obj["type"] = unit

def getXSeries(rowNum, colNum, headR, lastRow, sheet, sheetType, startRow):
	if(startRow):
		headRows = startRow
	else:
		headRows = headR
	series = []
	if(sheetType == "monthsTime" or sheetType == "weirdTime"):
		monthly = True
	else:
		monthly = False
	if sheetType in TIME_TYPES:
		for i in range(headRows, lastRow):
			val = sheet.cell_value(rowx=i, colx=colNum)
			val = getYear(val, monthly)
			if val:
				if not isinstance(val, float) and not isinstance(val, int):
					if val.find("Total") == -1:
						series.append(val)
				else:
					series.append(val)
		if sheet.name == "5.B4" or sheet.name == "5.D1":
			series.reverse()
		return series
def getBarSeries(rowNum, colNum, headR, lastRow, sheet, sheetType, startRow):
	if(startRow):
		headRows = startRow
	else:
		headRows = headR
	series = []
	for i in range(headRows, lastRow):
		val = sheet.cell_value(rowx=i, colx=colNum)
		val = val.replace(u'\xe2', '').replace(u'\u2013','-')
		ctype = sheet.cell_type(rowx=i, colx=colNum)
		if sheetType == "medBar":
			if ctype == 0 or ctype == 6 or val.upper().find("AVERAGE") >= 0:
				continue
			else:
				series.append(val)
		else:
			series.append(val)
	return series

def getYear(val, monthly=False):
	if isinstance(val, basestring):
		if val == "":
			return False
##allow for year ranges (strings) and decimal points
		non_decimal = re.compile(r'[^\d.-]+')
		float_test = re.compile(r'[^\d.]+')
		val = val.replace(u'\xe2', '').replace(u'\u2013','-')
		if  not monthly:
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

def getSeries(rowN, colNum, lastRow, sheet, sheetType, startRow):
	if(startRow):
		rowNum = startRow
	else:
		rowNum = rowN
	series = []
	if (sheetType in TIME_TYPES or sheetType in SIMPLE_BARS) and sheet.name not in col1_exceptions:
		colNum += 1
	for i in range(rowNum+1, lastRow):
		val = sheet.cell_value(rowx=i, colx=colNum)
		if(val == ". . ."):
			val = False
		elif (val == "Discontinued"):
			val = False
#strip footnotes markers and space from numeric values, then parse to float
#Should hold for any sheetType where all data is expected to be numeric
		elif((sheetType in TIME_TYPES or sheetType in SIMPLE_BARS or sheetType == "medBar") and isinstance(val, basestring)):
##allow for negative numbers and decimal points
			non_decimal = re.compile(r'[^\d.-]+')
			decimal = re.compile(r'\d')
#If cell ONLY contains footnote (no digits), don't try to cast it to float
			if(decimal.search(val)):
				val = non_decimal.sub('', val)
				val = float(val)
			else:
				val = False
		if sheetType == "medBar":
			if sheet.name !="5.F7" and sheet.name != "5.A1.8":
				if i == lastRow-1:
					break
			if sheet.name == "5.H3" or sheet.name == "5.H4":
#Ignore first 3 rows, which are totals
				if i > rowNum + 3:
					series.append(val)
				else:
					continue
			else:
#Ignore first 1 row, which is a total
				if i > rowNum + 1:
					series.append(val)
				else:
					continue

		else:
			series.append(val)
	if sheet.name == "5.B4" or sheet.name == "5.D1":
		series.reverse()
	return series

def getMapSeries(rowN, colNum, lastRow, sheet, sheetType, startRow):
	if(startRow):
		rowNum = startRow
	else:
		rowNum = rowN
	series = []
	for i in range(rowNum+1, lastRow):
		val = sheet.cell_value(rowx=i, colx=colNum)
		type0 = sheet.cell_type(rowx=i, colx=0)
		type1 = sheet.cell_type(rowx=i, colx=1)
		type2 = sheet.cell_type(rowx=i, colx=2)
		if(type0 == 6):
			type0 = 0
		if(type1 == 6):
			type1 = 0
		if(type2 == 6):
			type2 = 0
#row blank, blank, "All areas"
		if(type0 == 0 and type1==0):
			continue
		elif(type0==0):
#Indented row, eg blank, Puerto Rico
			state = [sheet.cell_value(rowx=i, colx=1).replace("\n","").replace("  "," ")]
		else:
			state = [sheet.cell_value(rowx=i, colx=0).replace("\n","").replace("  "," ")]
		if(state[0] == "Outlying areas" or state[0] == "Foreign countries" or state[0] == "All areas" or state[0] == "Unknown"):
			continue
#"Other" Includes American Samoa, Guam, Northern Mariana Islands, U.S. Virgin Islands, and foreign countries.
		elif(state[0].find("Other") >= 0):
			state = ["American Samoa","Guam","Northern Mariana Islands","US Virgin Islands"]
		for s in state:
			obj = {}
#hacky workaround for 2.C2
			print sheet.name
			s = s.replace(" f","").replace(" g","").replace(" c","").replace(" d","").replace(".","")
			abbrev = STATES[s].lower()
			if(abbrev == "gu"):
				obj["hc-key"] = "gu-3605"
				obj["value"] = val
				series.append(obj)
			elif(abbrev == "mp"):
				for abbr in ["ti","sa","ro"]:
					obj["hc-key"] = "mp-" + abbr
					obj["value"] = val
					series.append(obj)
			elif(abbrev == "as"):
				for abbr in ["6515","6514"]:
					obj["hc-key"] = "as-" + abbr
					obj["value"] = val
					series.append(obj)
			elif(abbrev == "vi"):
				for abbr in ["3617","6398","6399"]:
					obj["hc-key"] = "vi-" + abbr
					obj["value"] = val
					series.append(obj)
			elif(abbrev == "pr"):
				obj["hc-key"] = "pr-3614"
				obj["value"] = val
				series.append(obj)
			else:
				obj["hc-key"] = "us-" + abbrev
				obj["value"] = val
				series.append(obj)
	return series

def getLabel(rows, colNum):

	label = []
	tmp = copy.copy(rows)
	tmp.reverse()
	flag = 0
	for i in range(0, len(tmp)):
		if flag != 0:
			i -= flag
		row = tmp[i]
		if(row[colNum].ctype != 0 and row[colNum].ctype != 6):
			flag = 0
			val = row[colNum].value
			if(isinstance(val, float)):
				val = str(val)
			if val != "":
				label.append((val,colNum))
			del tmp[i]
			break
		else:
			del tmp[i]
			flag += 1
	for r in range(0, len(tmp)):
		row = tmp[r]
		c = colNum
		while((row[c].ctype == 0 or row[c].ctype == 6) and c > 0):
			c -= 1

		val = row[c].value
		if(isinstance(val, float)):
			val = str(val)
		if val != "":
			label.append((val,c))

	label.reverse()
	ret = ""
	for l in range(0, len(label)):
		if l != 0:
			if label[l-1][1] > label[l][1]:
				continue
		ret += label[l][0]
		if(l != len(label)-1 and label[l][0] != ""):
			ret += " :: "
	return ret

def getType(label):
	labels = ["dollar","percent"]
	for l in labels:
		if label.upper().find(l.upper()) != -1:
			return l
			break
	return "********** unknown *******"

def addWords(words, string):
	string = re.sub(r'[^\w\s]+', ' ', string)
	words.extend(string.split())

parseUnits()

book = xlrd.open_workbook("../data/statistical_supplement/supplement15.xls", formatting_info=True)
sheets = book.sheet_names()

#Years in 1st column (or year ranges), blank 2nd column, data
simpleTimeSheets = ["7.A9","7.E6","6.D9","6.D6","5.F12","5.G2","5.C2","4.B11","4.B4","4.B2",'2.A8',"3.E1","3.C6.1",'2.A9','2.A13','2.A27',"2.A28",'2.A3','2.A4',"2.F3","3.C4",'4.A1','4.A2','4.A3','4.A4','4.A5','4.A6','4.B1','4.C1','5.A17','5.D3','5.E2','5.F6','5.F8','6.C7','6.D8',"8.A1","8.A2","8.B10","9.B1","9.D1"]

#time series without blank 2nd column
col1_exceptions = ['5.B8','5.A4','5.F4','6.D4','6.C7','5.F8','5.E2','5.D3','5.C2','5.A17','4.C1', '5.B4',"7.A4","7.A5","7.E6"]

#multiple nested time series tables, with merged cells in mostly blank rows serving as table divider/header
timeMulti = ["7.A5","7.A4","6.D1","5.B8","5.B5","4.C2","4.B3","4.B5","4.B6","4.B7","4.B8","4.B9",'5.A4','5.A14','5.F1','5.F4','5.H1','6.B5','6.B5.1','6.C2','6.D4','5.D4',"8.B11","8.C1","8.E1","8.E2"]

#time series with month names in 1st column
monthsTime = ['2.A30', '6.A2',"3.E8"]

# 1st 2, 1st data row is "total" and last data row is "before 1975"
# 2nd 2, 1st data row is "total" 
weirdTime = ['5.B4','5.D1','6.A1','6.F1','5.F9','5.F10']

#Map of US states and territories
medMap = ["2.C2",'5.J1','5.J2','5.J4','5.J8','5.J10','5.J14','6.A6']

#Small bar graphs, no stacking
simpleBar = ['2.F4','2.F5','2.F6','2.F8','2.F11']

#Do not graph 1st row(s) (total) or last if it includes "average", 5.H3/H4 have 3 total rows
#no stacking
medBar = ['5.D2','5.E1','5.F7','5.H3','5.H4','6.C1','5.A1.8']




#Some but not all divider headers are on 2 rows

policy = ['2.A20', '2.A21']

weirdBar = ['5.B6','5.B7','6.B3']

#"Total" 
nestedBar = ['2.F9','3.C6','5.A1','5.A1.1','5.A1.2','5.A1.4','5.A1.6','5.A1.7','5.A5','5.A7','6.F2','6.F3']
nestedBarMulti = ['2.F7','3.C3','5.A1.3','5.A3','5.A6','5.A8','5.A10','5.A15','5.A16','5.H2','6.A3','6.A4','6.A5','6.D7']


edgeTimeMulti = ['4.C2']
medBarMulti = ['6.D5']
timeBarEdge = ['5.M1']
mapPlusTime = ['3.C5']


# #top priority
mustHaves = ['2.A3','2.A4','2.A20','2.A21','2.A30','2.F4','2.F5','2.F6','2.F7','2.F8','2.F9','2.F11','3.C3','3.C5','3.C6','4.A2','4.A3','4.A4','4.A6','4.C1','4.C2','5.A1','5.A1.2','5.A1.3','5.A1.4','5.A3','5.A4','5.A5','5.A6','5.A7','5.A8','5.A10','5.A17','5.D1','5.D2','5.D3','5.D4','5.E1','5.E2','5.F1','5.F4','5.F6','5.F7','5.F8','5.H1','5.H2','5.H3','5.H4','5.J1','5.J2','5.J4','5.J8','5.J10','5.J14','5.M1','6.A1','6.A2','6.A3','6.A4','6.A5','6.A6','6.C1','6.C2','6.C7','6.D4','6.D5','6.D7','6.D8','6.F1','6.F2','6.F3']
# #high priority
shouldHaves = ['3.C4','3.C6.1','3.C7a','3.C7b','3.C8','4.A1','4.A5','4.B3','4.B10','5.A1.1','5.A1.5','5.A1.6','5.A1.7','5.A1.8','5.A14','5.A15','5.A16','5.B1','5.B2','5.B4','5.B6','5.B7','6.B3','6.B5','6.B5.1']

#top + high priority not in simpletimesheets
needs = ['2.A20','2.A21','2.A30','2.F4','2.F5','2.F6','2.F7','2.F8','2.F9','2.F11','3.C3','3.C5','3.C6','4.C2','5.A1','5.A1.1','5.A1.2','5.A1.3','5.A1.4','5.A1.5','5.A1.6','5.A1.7','5.A1.8','5.A3','5.A4','5.A5','5.A6','5.A7','5.A8','5.A10','5.A14','5.A15','5.A16','5.B4','5.B6','5.B7','5.D1','5.D2','5.E1','5.F1','5.F4','5.F7','5.H1','5.H2','5.H3','5.H4','5.J1','5.J2','5.J4','5.J8','5.J10','5.J14','5.M1','6.A1','6.A2','6.A3','6.A4','6.A5','6.A6','6.B3','6.B5','6.B5.1','6.C1','6.C2','6.D4','6.D5','6.D7','6.F1','6.F2','6.F3']

#in simple time sheets but broken
fix = ['4.C1','5.D4','5.E2','5A14-M0','5H1-M0','6B5-M0','6B51-M0']



TIME_TYPES = ["simpleTime", "multiTime", "monthsTime","weirdTime"]
SIMPLE_BARS = ["simpleBar"]
wordList = {}
titleList = {}

for sheet_id in simpleBar:
	words = wordList[sheet_id.replace(".","_")] = []
	xl_sheet = book.sheet_by_name(sheet_id)
	output = {}
	headRows = 0
	lastRow = 0
	for i in range(0, xl_sheet.nrows):
		row = xl_sheet.row(i)
		testVal = xl_sheet.cell_value(rowx=i, colx=2)
#1st column isn't predictable, but 2nd column (A/B merged into 1st column) is always a number
		if(isinstance(testVal,float)):
			headRows = i
			break
	for i in range(headRows+1, xl_sheet.nrows):
		row = xl_sheet.row(i)
		testType = xl_sheet.cell_type(rowx=i, colx=0)
		if(testType == 0 or testType == 6):
			lastRow = i
			break

	output["html"] = {}
	values = parseHeader(output, headRows, lastRow, xl_sheet, "simpleBar")
	footnotes = parseFootnotes(xl_sheet, lastRow)
	titles = parseTitle(xl_sheet, "simpleBar")
	output["html"]["header"] = values["headerString"]
	output["html"]["body"] = values["bodyString"]
	output["data"] = values["data"]
	output["title"] = titles
	output["footnotes"] = footnotes
	addWords(words, titles["name"])
	titleList[titles["id"].replace(".","_")] = titles["name"] + " (" + titles["id"].replace("_",".") + ")" 
	output["category"] = values["chartType"]

	with open('../data/json/stat_supplement_table-%s.json'%titles["id"], 'w') as fp:
		json.dump(output, fp, indent=4, sort_keys=True)


for sheet_id in medBar:
	words = wordList[sheet_id.replace(".","_")] = []
	xl_sheet = book.sheet_by_name(sheet_id)
	output = {}
	headRows = 0
	lastRow = 0
	for i in range(0, xl_sheet.nrows):
		row = xl_sheet.row(i)
		testType1 = xl_sheet.cell_type(rowx=i, colx=0)
		testType2 = xl_sheet.cell_type(rowx=i, colx=1)
		if testType1 == 6:
			testType1 = 0
		if testType2 == 6:
			testType2 = 0
		testVal = xl_sheet.cell_value(rowx=i, colx=2)
		if (isinstance(testVal,float) and testType1 == 0 and testType2 != 0) or xl_sheet.cell_value(rowx=i, colx=0).upper().find("TOTAL") >= 0 or xl_sheet.cell_value(rowx=i, colx=0).upper().find("ALL DISABLED") >= 0 or (xl_sheet.cell_value(rowx=i, colx=1).upper().find("TOTAL") >= 0 and testType1 == 0):
			headRows = i
			break
	for i in range(headRows+1, xl_sheet.nrows):
		row = xl_sheet.row(i)
		testType1 = xl_sheet.cell_type(rowx=i, colx=0)
		testType2 = xl_sheet.cell_type(rowx=i, colx=1)
		testType3 = xl_sheet.cell_type(rowx=i, colx=2)
		if testType1 == 6:
			testType1 = 0
		if testType2 == 6:
			testType2 = 0
		if testType3 == 6:
			testType3 = 0

		if(testType1 == 0 and testType2 == 0 and testType3 == 0):
			lastRow = i
			break

	output["html"] = {}
	values = parseHeader(output, headRows, lastRow, xl_sheet, "medBar")
	footnotes = parseFootnotes(xl_sheet, lastRow)
	titles = parseTitle(xl_sheet, "medBar")
	output["html"]["header"] = values["headerString"]
	output["html"]["body"] = values["bodyString"]
	output["data"] = values["data"]
	output["title"] = titles
	output["footnotes"] = footnotes
	addWords(words, titles["name"])
	titleList[titles["id"].replace(".","_")] = titles["name"] + " (" + titles["id"].replace("_",".") + ")" 
	output["category"] = values["chartType"]
	if(sheet_id == "5.H3" or sheet_id == "5.H4"):
		output["default"] = "col3"
	else:
		output["default"] = "col2"

	with open('../data/json/stat_supplement_table-%s.json'%titles["id"], 'w') as fp:
		json.dump(output, fp, indent=4, sort_keys=True)



for sheet_id in medMap:
	words = wordList[sheet_id.replace(".","_")] = []
	xl_sheet = book.sheet_by_name(sheet_id)
	output = {}
	headRows = 0
	lastRow = 0
	for i in range(0, xl_sheet.nrows):
		row = xl_sheet.row(i)
		testVal = xl_sheet.cell_value(rowx=i, colx=0)
		if(testVal.find("Alabama") >= 0):
			if(sheet_id == "2.C2"):
				headRows = i
			else:
				headRows = i-1
			break
	for i in range(headRows+1, xl_sheet.nrows):
		row = xl_sheet.row(i)
		testType1 = xl_sheet.cell_type(rowx=i, colx=0)
		testType2 = xl_sheet.cell_type(rowx=i, colx=1)
		testType3 = xl_sheet.cell_type(rowx=i, colx=2)
		if testType1 == 6:
			testType1 = 0
		if testType2 == 6:
			testType2 = 0
		if testType3 == 6:
			testType3 = 0

		if(testType1 == 0 and testType2 == 0 and testType3 == 0):
			lastRow = i
			break

	output["html"] = {}
	values = parseHeader(output, headRows, lastRow, xl_sheet, "medMap")
	footnotes = parseFootnotes(xl_sheet, lastRow)
	titles = parseTitle(xl_sheet, "medMap")
	output["html"]["header"] = values["headerString"]
	output["html"]["body"] = values["bodyString"]
	output["data"] = values["data"]
	output["title"] = titles
	output["footnotes"] = footnotes
	addWords(words, titles["name"])
	titleList[titles["id"].replace(".","_")] = titles["name"] + " (" + titles["id"].replace("_",".") + ")" 
	output["category"] = values["chartType"]


	with open('../data/json/stat_supplement_table-%s.json'%titles["id"], 'w') as fp:
		json.dump(output, fp, indent=4, sort_keys=True)


for sheet_id in timeMulti:
	multiSubtitles = []
	xl_sheet = book.sheet_by_name(sheet_id)
	output = {}
	headRows = 0
	lastRow = 0
	subHead = []
	startRow = 0
	start = True
	rowBreaks = []
	for i in range(0, xl_sheet.nrows):
		testVal = xl_sheet.cell_value(rowx=i, colx=0)
		reg = re.compile(r'19|20', re.UNICODE)
		if(isinstance(testVal,float)):
			headRows = i-1
			subHead = xl_sheet.row(i-1)
			startRow = i
			rowBreaks.append(startRow-1)
			break
		elif(re.match(reg, testVal.encode('utf8'))):
			headRows = i-1
			subHead = xl_sheet.row(i-1)
			startRow = i
			rowBreaks.append(startRow-1)
			break

	end = True
	loopcount = 0
	empty = False
	while True:
		if(empty):
			break
		if start:
			start = False
			pass
		else:
			for j in range(startRow+1, xl_sheet.nrows):
				testVal = xl_sheet.row(j)[0]
				if(testVal.ctype == 0 or testVal.ctype == 6):
					subHead = xl_sheet.row(j)
					startRow = j
					rowBreaks.append(startRow)
					break

		empty = True
		multiSubtitle = ""
		for s in subHead:
			if(s.ctype != 0 and s.ctype != 6):
				empty  = False
				multiSubtitle = s.value
				multiSubtitles.append(multiSubtitle)
		for i in range(0, len(rowBreaks)-1):
			output["html"] = {}
			values = parseHeader(output, headRows, rowBreaks[i+1], xl_sheet, "multiTime", rowBreaks[i]+1, {"value" : multiSubtitles[i], "index":i})
			titles = parseTitle(xl_sheet, "multiTime", {"value" : multiSubtitles[i], "index":i})
			footnotes = parseFootnotes(xl_sheet, rowBreaks[len(rowBreaks)-1])
			output["html"]["header"] = values["headerString"]
			output["html"]["body"] = values["bodyString"]
			output["data"] = values["data"]
			output["title"] = titles
			output["footnotes"] = footnotes
			words = wordList[titles["id"].replace(".","_")] = []
			addWords(words, titles["name"])
			titleList[titles["id"].replace(".","_")] = titles["name"] + " (" + titles["id"].replace("_",".") + ")" 
			output["category"] = values["chartType"]

			with open('../data/json/stat_supplement_table-%s.json'%titles["id"], 'w') as fp:
				json.dump(output, fp, indent=4, sort_keys=True)


		# for i in range(headRows+2, xl_sheet.nrows):
		# 	testType = xl_sheet.cell_type(rowx=i, colx=0)
		# 	if(testType == 0):
		# 		lastRow = i
		# 		break


for sheet_id in weirdTime:
	words = wordList[sheet_id.replace(".","_")] = []
	xl_sheet = book.sheet_by_name(sheet_id)
	output = {}
	headRows = 0
	lastRow = 0
	for i in range(0, xl_sheet.nrows):
		row = xl_sheet.row(i)
		firstType = xl_sheet.cell_type(rowx=i, colx=0) 
		if firstType == 6:
			firstType = 0
		firstVal = xl_sheet.cell_value(rowx=i, colx=0)
		if not isinstance(firstVal, float):
			firstVal = firstVal.replace(u'\u2014',"").replace(u'\xa0', u' ').replace(u'\u2013', u' ')
		secondVal = xl_sheet.cell_value(rowx=i, colx=1)
		if not isinstance(secondVal, float):
			secondVal = secondVal.replace(u'\u2014',"").replace(u'\xa0', u' ').replace(u'\u2013', u' ')
		# reg = re.compile(r'19|20', re.UNICODE)
		if(str(firstVal).find("Total") != -1):
			headRows = i
			break
		if(str(secondVal).find("Total") != -1 and firstType == 0):
			headRows = i
			break
		# elif(re.match(reg, testVal.encode('utf8'))):
		# 	headRows = i
		# 	break
	for i in range(headRows+1, xl_sheet.nrows):
		row = xl_sheet.row(i)
		testType = xl_sheet.cell_type(rowx=i, colx=0)
		if(testType == 0 or testType == 6):
			lastRow = i
			break

	output["html"] = {}
	values = parseHeader(output, headRows, lastRow, xl_sheet, "weirdTime")
	footnotes = parseFootnotes(xl_sheet, lastRow)
	titles = parseTitle(xl_sheet, "weirdTime")
	output["html"]["header"] = values["headerString"]
	output["html"]["body"] = values["bodyString"]
	output["data"] = values["data"]
	output["title"] = titles
	output["footnotes"] = footnotes
	addWords(words, titles["name"])
	titleList[titles["id"].replace(".","_")] = titles["name"] + " (" + titles["id"].replace("_",".") + ")" 
	output["category"] = values["chartType"]

	with open('../data/json/stat_supplement_table-%s.json'%titles["id"], 'w') as fp:
		json.dump(output, fp, indent=4, sort_keys=True)


for sheet_id in simpleTimeSheets:
	words = wordList[sheet_id.replace(".","_")] = []
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
		if(testType == 0 or testType == 6):
			lastRow = i
			break

	output["html"] = {}
	values = parseHeader(output, headRows, lastRow, xl_sheet, "simpleTime")
	titles = parseTitle(xl_sheet, "simpleTime")
	footnotes = parseFootnotes(xl_sheet, lastRow)
	output["html"]["header"] = values["headerString"]
	output["html"]["body"] = values["bodyString"]
	output["data"] = values["data"]
	output["title"] = titles
	output["footnotes"] = footnotes
	addWords(words, titles["name"])
	titleList[titles["id"].replace(".","_")] = titles["name"] + " (" + titles["id"].replace("_",".") + ")" 
	output["category"] = values["chartType"]


	with open('../data/json/stat_supplement_table-%s.json'%titles["id"], 'w') as fp:
		json.dump(output, fp, indent=4, sort_keys=True)

for sheet_id in monthsTime:
	words = wordList[sheet_id.replace(".","_")] = []
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
#2nd conditional is hacky hack to handle 3.E8
		elif(re.match(reg, testVal.encode('utf8')) or testVal == "December 1965"):
			headRows = i
			break
	for i in range(headRows+1, xl_sheet.nrows):
		row = xl_sheet.row(i)
		testType = xl_sheet.cell_type(rowx=i, colx=0)
		if(testType == 0 or testType == 6):
			lastRow = i
			break

	output["html"] = {}
	values = parseHeader(output, headRows, lastRow, xl_sheet, "monthsTime")
	titles = parseTitle(xl_sheet, "monthsTime")
	footnotes = parseFootnotes(xl_sheet, lastRow)
	output["html"]["header"] = values["headerString"]
	output["html"]["body"] = values["bodyString"]
	output["data"] = values["data"]
	output["title"] = titles
	output["footnotes"] = footnotes
	addWords(words, titles["name"])
	# titleList[titles["id"].replace(".","_")] = titles["id"] + " :: " + titles["name"]
	titleList[titles["id"].replace(".","_")] = titles["name"] + " (" + titles["id"].replace("_",".") + ")" 
	output["category"] = values["chartType"]


	with open('../data/json/stat_supplement_table-%s.json'%titles["id"], 'w') as fp:
		json.dump(output, fp, indent=4, sort_keys=True)



trusteesTitles = ["IV_B1-0","IV_B1-1","IV_B1-2","IV_B1-3","IV_B2-0","IV_B2-1","IV_B2-2","IV_B2-3","IV_B3-0","IV_B3-1","IV_B3-2","IV_B3-3","IV_B4-0","IV_B4-1","VI_G10-0","VI_G10-1","VI_G10-2","VI_G10-3","VI_G2-0","VI_G2-1","VI_G2-2","VI_G2-3","VI_G4-0","VI_G4-1","VI_G4-2","VI_G4-3","VI_G5-0","VI_G5-1","VI_G6-0","VI_G6-1","VI_G6-2","VI_G6-3","VI_G7-0","VI_G7-1","VI_G7-2","VI_G8-0","VI_G8-1","VI_G8-2","VI_G8-3","VI_G9-0","VI_G9-1","VI_G9-2","VI_G9-3","V_A1-0","V_A1-1","V_A1-2","V_A1-3","V_A2-0","V_A2-1","V_A2-2","V_A2-3","V_A3-0","V_A3-1","V_A4","V_B1-0","V_B1-1","V_B1-2","V_B1-3","V_B2-0","V_B2-1","V_B2-2","V_B2-3","V_C4-0","V_C4-1","V_C4-2","V_C4-3","V_C5-0","V_C5-1","V_C5-2","V_C5-3","V_C7-0","V_C7-1"]


for title in trusteesTitles:
	with open('../data/json/trustees/trustees_report-%s.json'%title) as df:
		data = json.load(df)
		titleList[title] = data["title"]["name"] + " (" + title + ")"
		wordList[title] = data["title"]["name"].split(" ")
		for key in data["data"]:
			wordList[title] += data["data"][key]["label"].split(" ")


idList = {}
# print wordList
for key in wordList:
	wordList[key] = list(set(wordList[key]))
	for word in wordList[key]:
		word = word.upper()
		if word not in idList:
			idList[word] = [key]
		else:
			idList[word].append(key)






with open('../data/words.json', 'w') as fp:
	json.dump(idList, fp, indent=4, sort_keys=True)

with open('../data/titles.json', 'w') as fp:
	json.dump(titleList, fp, indent=4, sort_keys=True)




