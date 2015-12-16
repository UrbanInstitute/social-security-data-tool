###For each table, create a json file with the file name:

"trustees_report-\[UNIQUE\_ID\].json"

Where the unique id is the table id from the report, with all '.' replaced with '_'

Note that for "subtables", (e.g. in this example
https://www.ssa.gov/oact/tr/2015/lr4b2.html
"Historical", "Intermediate", "Low cost", and "High cost" are all subtables), we create separate json files for EACH subtable, with the table header information repeated in each json, and table id having an additional "-N" at the end of the id string, so in this example:

"trustees_report-IV_B2-0.json", "trustees_report-IV_B2-1.json" etc. corresponding to subtables "Historical", "Intermediate", etc.

###The JSON will contain the following fields:

- category: "timeSeries"

- title: an object with the following properties
 - "name": the full table name. For subtables, append two colons " :: " followed by "Subtable : [subtable name]", e.g. ["Components of Annual Income Rates,Calendar Years 1970-2090 :: Subtable : High-cost"](https://www.ssa.gov/oact/tr/2015/lr4b2.html#alt_3)
 - "id": the table id, as specified in the file name above (e.g. "IV_B2-1")

- footnotes: an array of objects, each object with the following properties
	- "content": the text of the footnote NOTE including the footnote symbol
	- "type": has the value "footnote" for footnotes which include footnote symbols, or "note" for those with no symbol (examples include "Source" or "Note" information below tables)
	- "symbol": for objects of typle "footnote", include the footnote symbol (do not include this key for objects of type "note"
	- __Note:__ for subtables, repeat the "footnotes" object for all tables

- "data": The keys in the data object are "years" (the leftmost column of years), "col1", "col2" etc. corresponding to the index, left to right, of the data columns (i.e. tbody columns), not taking the header into account. So in [our example table](https://www.ssa.gov/oact/tr/2015/lr4b2.html), the data in "years"  is \[1970, 1971,...\] "col1" contains \[7.49, 8.12...\] etc. Within a given object ("years", "col1", etc.) there are the following keys
	- "series": an array of the data values, in order (top to bottom), represented as floats (not strings). Non numeric values (e.g. "--" or "c") should be represented as `false`, and if there are numeric values with associated footnote symbols (e.g. "1.82c") the footnote symbol should be stripped, and the string ("1.82" in this case) should be converted to a float
	- "label": The column header. Note that for nested html headers, you must include all levels of nesting, separated by double colons (" :: "). So, back to [our example](https://www.ssa.gov/oact/tr/2015/lr4b2.html#alt_3), labels would be "Calendar year", "OASI :: Payroll tax rate", etc. In a more [deeply nested example](https://www.ssa.gov/oact/tr/2015/lr5a4.html), labels would be "Calendar year", "Intermediate :: At birth :: Male", etc.
	- "type": each column has a data type, which can have the following (string) values:
		- "percent", a percentage, 0-100
		- "dollar", a dollar amount
		- "number", a numeric amount with units other than dollar or percent
		- "numberThousand", for columns or tables where values are non percent/dollar, but 1 represents 1,000. An example table is [here](https://www.ssa.gov/oact/tr/2015/lr5c4.html)
		- "numberMillion", as above, but 1 represents 1 million
		- "numberBillion", as above, but 1 represents 1 billion
		- "dollarThousand", as above, but 1 represents 1 thousand dollars
		- "dollarMillion", as above, but 1 represents 1 million dollars
		- "dollarBillion", as above, but 1 represents 1 billion dollars. An example is [here](https://www.ssa.gov/oact/tr/2015/lr6g7.html)
		- "year", reserved for the "years" object
- "html" contains the following two properties:
	- "header", the full html of the table head, wrapped in a `<thead>` tag. Rowspans and colspans must be included to make the tables render correctly. Every `th` tag must have the following classes
		- "series"
		- "colN" (e.g col0, col1, col2), as described above. Don't worry about this class for th's higher in the nesting (so, in [this example](https://www.ssa.gov/oact/tr/2015/lr5a4.html) "Calendar year" has class "col0", "Male" -> "col1", "Female" -> "col2" etc. Don't worry about "Intermediate", "At birth", etc.
	- "body", the full html body of the table body (not including header or footnotes), with each `td` tag having the class "colN" ("col0", "col1", etc) as described above.
	- __NOTE__ _anywhere_ in the html table where a footnote symbol appears (either in the body or header), the footnote symbol must be wrapped in a `span` of the following form:
		- `<span class = \"top_footnote top_foo\">foo</span>` where "foo" is replaced with the footnote symbol (in most cases a,b,c,etc)