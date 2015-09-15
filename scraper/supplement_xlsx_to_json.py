from os.path import join, dirname, abspath
import xlrd
import re
import pprint

def parseHeader(output, headRows, lastRow, sheet, sheetType):
	headerString = "<thead>"
	rows = []
	data = {}
	for i in range(2,headRows):
		rows.append(sheet.row(i))
#For these sheet types, the first two columns (e.g "Year") are mereged into 1 with the second column totally empty because shrug
#So just popping 2nd column out for simplicity (instead of preserving strange colspans in html table or data table)
	if(sheetType == "simpleTime"):
		for row in rows:
			del(row[1])

	for r in range(2,headRows):
		headerString += "<tr>"
		for c in range(0,len(rows[r-2])):
			if(rows[r-2][c].ctype != 0):
				headerString += getTH(rows, r, c)
				if((r == headRows-1 and c != 0) or (c == 0 and r ==2)):
					getData(data, rows, r, c, lastRow, sheet, sheetType)
		headerString += "</tr>"
	headerString += "</thead>"

	return{ "headerString": headerString, "data": data}

def getTH(rows, rowNum, colNum):
	rowNum -= 2
	th = "<th"
	rowspan = 1
	colspan = 1
	for row in rows:
		if(row[colNum].ctype == 0):
			rowspan += 1
	for i in range(colNum+1, len(rows[rowNum])):
		if(rows[rowNum][i].ctype == 0):
			colspan += 1
		else:
			break
	if (rowspan != 1):
		th += " rowspan=\\\"%i\\\" "%rowspan
	if (colspan != 1):
		th += " colspan=\\\"%i\\\" "%colspan
	if(rowNum == len(rows)-1):
		th += " class=\\\"series col%i\\\" "%colNum
	th += ">"
	th += rows[rowNum][colNum].value
	th += "</th>"
	return th

def getData(data, rows, rowNum, colNum, lastRow, sheet, sheetType):
	if (colNum == 0):
		data["years"] = {}
	else:
		obj = data["col%i"%colNum] = {}
		obj["series"] = getSeries(rowNum, colNum, lastRow, sheet, sheetType)
		label = obj["label"] = getLabel(rows, colNum)
		dType = obj["type"] = getType(label)

def getSeries(rowNum, colNum, lastRow, sheet, sheetType):
	series = []
	if sheetType == "simpleTime":
		colNum += 1
	for i in range(rowNum+1, lastRow):
		val = sheet.cell_value(rowx=i, colx=colNum)
		if(val == ". . ."):
			val = False
#strip footnotes markers and space from numeric values, then parse to float
#Should hold for any sheetType where all data is expected to be numeric
		elif(sheetType == "simpleTime" and isinstance(val, basestring)):
			non_decimal = re.compile(r'[^\d.]+')
			decimal = re.compile(r'\d')
#If cell ONLY contains footnote (no digits), don't try to cast it to float
			if(decimal.search(val)):
				val = non_decimal.sub('', val)
				val = float(val)
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
			label += row[c].value
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
# print('Sheet Names', sheets)

simpleTimeSheets = ['2.A3','2.A4','2.A8','2.A9','2.A13','2.A27','2.A28','2.C1','2.F3','3.C4','3.C6.1','3.E1','4.A1','4.A2','4.A3','4.A4','4.A5','4.A6','4.B1','4.B2','4.B4','4.B11','4.C1','5.A17','5.C2','5.D3','5.E2','5.F6','5.F8','5.F12','5.G2','6.C7','6.D6','6.D8','6.D9','7.A9','7.E6','8.A1','8.A2','8.B10','9.B1','9.D1']

xl_sheet = book.sheet_by_name('2.A3')
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
output["html"]["header"] = values["headerString"]
output["data"] = values["data"]
pprint.pprint(output)


	# print type(testVal)
# print ("headrows: ", headRows)

# print len(xl_sheet.row(headRows))


	# fmt = book.xf_list[row[0].xf_index]
	# print fmt.dump()
	# print row[0]

# for crange in xl_sheet.merged_cells: 
#     rlo, rhi, clo, chi = crange 
#     print rlo, rhi, clo, chi 