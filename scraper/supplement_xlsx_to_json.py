from os.path import join, dirname, abspath
import xlrd
import re

book = xlrd.open_workbook("../data/statistical_supplement/supplement14.xlsx")

sheets = book.sheet_names()
# print('Sheet Names', sheets)

simpleTimeSheets = ['2.A3','2.A4','2.A8','2.A9','2.A13','2.A27','2.A28','2.C1','2.F3','3.C4','3.C6.1','3.E1','4.A1','4.A2','4.A3','4.A4','4.A5','4.A6','4.B1','4.B2','4.B4','4.B11','4.C1','5.A17','5.C2','5.D3','5.E2','5.F6','5.F8','5.F12','5.G2','6.C7','6.D6','6.D8','6.D9','7.A9','7.E6','8.A1','8.A2','8.B10','9.B1','9.D1']
xl_sheet = book.sheet_by_name('2.A3')
# row = xl_sheet.row(0)
# print(row)
output = {}
# print xl_sheet.row(0)
# print xl_sheet.row(1)
# print xl_sheet.row(2)
# print xl_sheet.row(3)
# print xl_sheet.row(4)
# print xl_sheet.row(5)

headRows = 0
lastRow = 0
for i in range(0, xl_sheet.nrows):
	row = xl_sheet.row(i)
	testVal = xl_sheet.cell_value(rowx=i, colx=0)
	reg = re.compile(r'19|20', re.UNICODE)
	if(isinstance(testVal,float)):
		print ("yearVal: ", testVal)
		headRows = i-1
		break
	elif(re.match(reg, testVal.encode('utf8'))):
		print ("yearVal: ", testVal)
		headRows = i-1
		break
for i in range(headRows+1, xl_sheet.nrows):
	row = xl_sheet.row(i)
	testType = xl_sheet.cell_type(rowx=i, colx=0)
	if(testType == 0):
		print("lastRow: ", i)
		lastRow = i-1
		break

	# print type(testVal)
# print ("headrows: ", headRows)

# print len(xl_sheet.row(headRows))


	# fmt = book.xf_list[row[0].xf_index]
	# print fmt.dump()
	# print row[0]

# for crange in xl_sheet.merged_cells: 
#     rlo, rhi, clo, chi = crange 
#     print rlo, rhi, clo, chi 