function getQueryVariable(variable) {
    var query = window.location.search.substring(1);
    var vars = query.split('&');
    for (var i = 0; i < vars.length; i++) {
        var pair = vars[i].split('=');
        if (decodeURIComponent(pair[0]) == variable) {
            return decodeURIComponent(pair[1]);
        }
    }
}

function getHashParams() {

    var hashParams = {};
    var e,
        a = /\+/g,  // Regex for replacing addition symbol with a space
        r = /([^&;=]+)=?([^&;]*)/g,
        d = function (s) { return decodeURIComponent(s.replace(a, " ")); },
        q = window.location.hash.substring(1);

    while (e = r.exec(q))
       hashParams[d(e[1])] = d(e[2]);

    return hashParams;
}


var yearBarCache;
var MONTHNAMES = ["January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
    ]
var MONTHABBREVS = ["Jan", "Feb", "Mar", "Apr", "May", "June",
  "Jul", "Aug", "Sept", "Oct", "Nov", "Dec"
    ]

var IE = false;
var exportParams = {tableID:"",columns:[],chartType:""}


function init(){
	var hashID = window.location.hash.substring(1)
	if(hashID != ""){
		hashID = hashID.replace(/\./g,"_")
		tableIndex = sheets.indexOf(hashID)
		if(tableIndex == -1){
			tableIndex = 0;
		}
	}
	// $.get( getDocURL("2A3"), function(resp) {
	setLayout();

	setTimeout(function(){
		$.getJSON( getJSONPath(sheets[tableIndex].replace(/\./g,"_")), function(resp){
		  // var data = resp.results[0];
		  exportParams.tableID = sheets[tableIndex].replace(/\./g,"_")
		  var data = resp;
		  var category = data.category;
		  switch(category){
		  	case "timeSeries":
		  		var years = data.data.years.series;
		  		drawScrubber(getYear(years[0]), getYear(years[years.length-1]));
		  	  	exportParams.chartType = "lineChart"
		  	  	exportParams.columns=["col1"]
		  		drawLineChart(data);
	  			drawSingleYearBarChart(data);
		  		drawTable(data);
		  		multiYear();
		  		showScrubber();
		  		break;
		  	case "map":
		  	  	exportParams.chartType = "map"
		  	  	exportParams.columns=["col3"]
		  		drawTable(data);
		  		drawMap(data,"col3")
		  		hideScrubber();
		  		break;
		  	case "barChart":
		  		exportParams.chartType = "barChart";
	  			var col = (typeof(data.default) != "undefined") ? data.default : "col1"
		  	  	exportParams.columns=[col];
		  		drawTable(data);
		  		drawBar(data,col);
		  		hideScrubber();
		  		break;
		  }
		});
		setTheme();
		filterSheets(0)
		yearBarCache = {};
	}, 1000);
}

function getYear(year){
	if(typeof(year) == "number"){
		return year;
	}
	else if(year.indexOf("-") != -1){
		var ys = year.split("-")
		if(ys[0].search(/\d/g) != -1){
			return parseFloat(ys[0].replace(/[^\d]/g,""))
		} else{ return parseFloat(ys[1].replace(/[^\d]/g,""))}
	} else{ return parseFloat(year.replace(/[^\d]/g,""))}
}

function newTable(index){
	tableIndex = index;
	var id = sheets[index]
	if(id){
		var hash = "#" + id.replace(/\_/g,".")
		window.history.pushState('index.html', 'Title', hash);
	}
	exportParams.tableID = id;
	$.getJSON( getJSONPath(id), function(resp){
		  // var data = resp.results[0];
		  var data = resp;
		  var category = data.category;
		  // drawScrubber(1901,2003)
		  switch(category){
		  	case "timeSeries":
		  		var years = data.data.years.series
		  		drawScrubber(getYear(years[0]), getYear(years[years.length-1]))
		  	  	exportParams.chartType = "lineChart"
		  	  	exportParams.columns=["col1"]
		  		drawLineChart(data);
	  			drawSingleYearBarChart(data);
		  		drawTable(data);
		  		multiYear();
		  		showScrubber();
		  		break;
		  	case "map":
		  	  	exportParams.chartType = "map"
		  	  	exportParams.columns=["col3"]
		  		drawTable(data);
		  		drawMap(data, "col3");
		  		hideScrubber();
		  		break;
		  	case "barChart":
		  		exportParams.chartType = "barChart";
	  			var col = (typeof(data.default) != "undefined") ? data.default : "col1"
		  	  	exportParams.columns=[col];
		  		drawTable(data);
		  		drawBar(data,col);
		  		hideScrubber();
		  		break;
		  }
		});
		// drawScrubber(1927,2014);
		yearBarCache = {};

}

function setLayout(){
	d3.selectAll(".initial_hide")
		.transition()
		.duration(0)
		.style("opacity",1)
	var height = $(window).height();
	var width = $(window).width();
	d3.select("#controls")
		.transition().duration(0)
		.style("width", 400)
		.style("height", 360)
		.style("background-color","#e0e0e0")
	d3.select("#innerControls")
		.transition()
		.duration(0)
		.style("margin-top","20px")

}
function drawTable(input){
	d3.select("#testTable table").remove()
	d3.select("#tableTitle")
		.html("<div class =\"titleCategory\">" + input.title.category +  " (" + input.title.catID + ")</div>" + input.title.name + " (" + input.title.id.replace(/\_/g,".") + ")")

	d3.select("#testTable")
		.append("table")
		.attr("class", "pure-table tablesorter")
		.attr("id", function(){
			return getId(input)
		})
	.html(function(){
		return "<div>" + input.html.header +  input.html.body + "</div>"
	})
	d3.selectAll("#testTable th")
		.on("click", function(){
			var th = d3.select(this)
			var colspan = th.attr("colspan")
			if(colspan > 1 || th.classed("col0")){
				return false;
			}
			if(d3.selectAll("th.selected")[0].length == 1 && th.classed("selected")){
				return false;
			}
			var selected = th.classed("selected")
			var re = /col\d*/g
			var series = th.attr("class").match(re)
			var lineChart = $('#lineChart').highcharts();
			var singleYearBarChart = $('#singleYearBarChart').highcharts();
			var barChart = $('#barChart').highcharts();
			var map = $("#map").highcharts();
			//th -> tr -> thead -> table
			var table = th.node().parentNode.parentNode.parentNode
			var tableID = d3.select(table).attr("id")
			// $.get( getDocURL(tableID) , function(resp) {
			$.getJSON( getJSONPath(tableID), function(resp){
		  		// var data = resp.results[0];
		  		var data = resp;
		  		var category = data.category;
		  		cat = category
		  		var seriesID = data["data"][series]["label"]
		  		if(category == "timeSeries"){
			  		if( !selected ){
						singleYearBarChart.series[0].addPoint(generateBarFromYear(data.data.years.series, data["data"][series]["series"], $("#rightValue").text()))

						$.each(singleYearBarChart.series[0].data, function(k,v){
							v.update({
								x: k
							});
						});

						var categories = singleYearBarChart.xAxis[0].categories
						categories.push(seriesID)
						singleYearBarChart.xAxis[0].setCategories(categories)

						singleYearBarChart.redraw();
						var options = lineChart.options;
    					options.tooltip.enabled = false;
    					// lineChart = new Highcharts.Chart(options);

						lineChart.addSeries({
							id: series[0],
			            	name: seriesID,
			            	data: generateTimeSeries(data.data.years.series, data["data"][series]["series"])
						});


						// barChart.addSeries({
						// 	id: series[0],
			   //          	name: seriesID,
      //               	data: input["data"][series]["series"]

						// })


						// lineChart.tooltip
						// singleYearBarChart.addSeries({
						// 	id: seriesID,
	     //                	name: seriesID,
	     //                	data: [generateBarFromYear(data.data.years.series, data["data"][series]["series"], $("#rightValue").text())]
	     //                	}
						// )

						yearBarCache[seriesID] = [data.data.years.series, data["data"][series]["series"]]
						yearBarCache["id"] = series[0]
						checkUnitCompatibility(data["data"][series]["type"], input, [lineChart, singleYearBarChart])
						th.classed("selected", true)
						if(d3.select("#singleYearCheck circle").classed("checked")){
							th.classed("singleSelected", true)
						}
			  			exportParams.columns.push(series)
						for(var i = 0; i < lineChart.series.length; i++){
							if(lineChart.series[i].userOptions.id == series[0]){
								th.style("background-color", lineChart.series[i].color)
							}
						}

					} else{
						var tmp = exportParams.columns.indexOf(series);
						exportParams.columns.splice(tmp, 1)

						removeSeries(lineChart, seriesID)
						removeSeries(singleYearBarChart, seriesID)
						th.classed("selected", false)
						th.classed("singleSelected", false)
						th.style("background-color", "#e0e0e0")

					}
				}
				else if (category == "map"){
			  		if( !selected ){
			  			exportParams.columns = [series]
						drawMap(data, series[0])

						// checkUnitCompatibility(data["data"][series]["type"], input, [lineChart, singleYearBarChart])
						d3.selectAll("th").classed("selected",false)
						th.classed("selected", true)
					}
				}
				else if (category == "barChart"){
			  		if( !selected ){
			  			exportParams.columns = [series]
			  			barChart.addSeries({
							id: series[0],
			            	name: seriesID,
                    		data: input["data"][series]["series"]
						})

						// drawBar(data, series[0])

						// 						barChart.addSeries({
						// 	id: series[0],
			   //          	name: seriesID,
      //               	data: input["data"][series]["series"]

						// })

						// checkUnitCompatibility(data["data"][series]["type"], input, [lineChart, singleYearBarChart])
						// d3.selectAll("th").classed("selected",false)
						checkUnitCompatibility(data["data"][series]["type"], input, [barChart])
						th.classed("selected", true)

						for(var i = 0; i < barChart.series.length; i++){
							if(barChart.series[i].userOptions.id == series[0]){
								th.style("background-color", barChart.series[i].color)
							}
						}
					}
					else{
						th.classed("selected", false)
						removeSeries(barChart, seriesID)
						th.style("background-color", "#e0e0e0")

					}
				}

			});
		});
	formatTable("testTable")
	if(input.category == "timeSeries" || input.category == "barChart"){
		var col = (typeof(input.default) != "undefined") ? input.default : "col1"
		d3.selectAll("th." + col).classed("selected",function(){
			if(d3.select(this).attr("colspan") > 0){
				return false;
			}else{ return true;}
		})
	}
	else if(input.category == "map"){
		d3.selectAll("th.col3").classed("selected",function(){
			if(d3.select(this).attr("colspan") > 0){
				return false;
			}else{ return true;}
		})
	}
	if(input.category == "timeSeries"){
		d3.selectAll("td.col0")
			.html(function(){
				return d3.select(this).html().replace(/\.0/g,"")
			})
	}
	d3.selectAll(".footnotes").remove()
	var fn = d3.select("#testTable")
		.append("div")
		.attr("class", "footnotes")
	fn.append("div")
	.html("<div class = \"tableSource\"><a href = \"https://www.ssa.gov/policy/docs/statcomps/supplement/\">The data in this table are from the Social Security Administration’s Annual Statistical Supplement, 2014. The parenthetical numbers with the titles are retained from the supplement for reference.</a></div>")
	var tWidth = d3.select("thead").node().getBoundingClientRect().width;
	for(var i = 0; i<input.footnotes.length; i++){
		var note = input.footnotes[i]
		var footnote = d3.select(".footnotes")
			.append("div")
			.attr("class",note.type + " footer")
			.html(function(){
				if(note.type == "footnote"){
					return "<span id = symbol_" + note.symbol.replace(".","") + ">" + note.symbol + "</span>" + note.content
				}else{ return note.content}
			})
			.style("width", (tWidth)  + "px")

		footnote.append("div")
			.attr("class","things")
			.html('<br>')
			.style("width", (tWidth + 70)  + "px")

	}
	d3.selectAll(".top_footnote")
		.on("click", function(){
			var symbol = d3.select(this).attr("class").replace("top_footnote","").split("_")[1]
			var diff = $("#symbol_" + symbol).offset().top
			$('html, body').animate({
//diff minus height of controls minus thead minus title height				
        		scrollTop: diff - 420 - d3.select("thead").node().getBoundingClientRect().height - 100
    		}, 1000);

		})
		if(d3.select("#testTable thead").node().getBoundingClientRect().width - $(window).width() + 74 <= 0){
			d3.select(".rightFader").style("opacity", 0)
		}else{ d3.select(".rightFader").style("opacity",1)}


	if(d3.select("#testTable thead").node().getBoundingClientRect().width - $(window).width() + 74 <= 0){
		d3.select(".rightFader").style("opacity", 0)
       	d3.select("#panRight").style("display","none")
       	d3.select("#panLeft").style("display","none")

	}else{
	   	d3.select("#panRight").style("display","block")
	   	d3.select("#panLeft").style("display","block")
		d3.select(".rightFader").style("opacity",1)
	}

}
function resizeHeader(header, bodyCells){
// 	var oldWidth = parseFloat(d3.select(header).style("width").replace("px",""));
// 	var headerRemainder = parseFloat(header.getBoundingClientRect().width) - oldWidth;
// 	var bodyWidth = 0;
// 	for(var i = 0; i < bodyCells.length; i++){
// 		bodyWidth += parseFloat(bodyCells[i].getBoundingClientRect().width);
// 	}
//  	var w =  bodyWidth - headerRemainder;
// //If header is longer than body cell, resize bodycell's width.
//  	if(oldWidth > w && bodyCells.length == 1){
//  		d3.select(bodyCells[0]).style("width", oldWidth)
//  		d3.select(header).style("width", oldWidth)

//  	}
//  //otherwise, resize header to width of bodycell(s)
// 	else{
// 		d3.select(header).style("width", w)
// 		d3.select(header).select("div").style("width", w)

// 	}
	// return false
}
function formatTable(tableID){
//draw sortArrows
// 	d3.selectAll("#" + tableID + " thead th")
// 		.append("i")
// 		.attr("class","sortArrow")

// //Make table sortable using mottie's jquery tablesorter, bind click events to sort arrows
// 	$(function(){
// 	  $("#" + tableID + " table").tablesorter({
// 	  		selectorSort: "i"
// 	  });
// 	});

//Determine which columns fall under which headers, and resize width to width of child columns
	// var rows = d3.selectAll("thead tr")[0]
	// var bodyRow = d3.select("tbody tr").selectAll("td")
	// var holder = Array.apply(null, Array(rows.length)).map(function(){return bodyRow[0].slice()});
	// for(var i = 0; i < rows.length; i++){
	// 	var headers = d3.select(rows[i]).selectAll("th")
	// 	headers[0].forEach(function(h){
	// 		var colspan = (d3.select(h).attr("colspan") == null) ? 1 : parseInt(d3.select(h).attr("colspan"));
	// 		var rowspan = (d3.select(h).attr("rowspan") == null) ? 1 : parseInt(d3.select(h).attr("rowspan"));
	// 		resizeHeader(h, holder[i].splice(0,colspan))
	// 		if(rowspan != 1 && i != rows.length-1){
	// 			for(j = i+1; j + i < rowspan; j++ ){
	// 				holder[j].splice(0,colspan)
	// 			}
	// 		}
	// 	})			
	// }


//Determine height of thead, and set initial position of tbody to be just under thead

//unbind charting to sort arrows (clicking arrow does not add/remove series)
	d3.selectAll(".sortArrow").on("click", function(){
			d3.event.stopPropagation()
	})

	d3.selectAll("th")
		.style("width", function(){
			var cs = d3.select(this).attr("colspan")
			var w;
			if(d3.select(this).classed("col0") && cs > 1){
				w = (cs == null || cs == 1) ? 100 : 120*cs-20 + 2	
			}else{
				w = (cs == null || cs == 1) ? 100 : 120*cs-20
			}
			return w;
		})
		.style("max-width", function(){
			var cs = d3.select(this).attr("colspan")
			var w;
			if(d3.select(this).classed("col0") && cs > 1){
				w = (cs == null || cs == 1) ? 100 : 120*cs-20 + 2	
			}else{
				w = (cs == null || cs == 1) ? 100 : 120*cs-20
			}
			return w;
		})
		.style("min-width", function(){
			var cs = d3.select(this).attr("colspan")
			var w;
			if(d3.select(this).classed("col0") && cs > 1){
				w = (cs == null || cs == 1) ? 100 : 120*cs-20 + 2	
			}else{
				w = (cs == null || cs == 1) ? 100 : 120*cs-20
			}
			return w;
		})
	// d3.selectAll("th")
	d3.selectAll("td")
		.style("width", function(){
			var cs = d3.select(this).attr("colspan")
			var w = (cs == null || cs == 1) ? 100 : 120*cs-20
			return w
		})
		.style("max-width", function(){
			var cs = d3.select(this).attr("colspan")
			var w = (cs == null || cs == 1) ? 100 : 120*cs-20
			return w;
		})
		.style("min-width", function(){
			var cs = d3.select(this).attr("colspan")
			var w = (cs == null || cs == 1) ? 100 : 120*cs-20
			return w;
		})


//center table in window
	var tWidth = $("thead").width()
	var wWidth = $(window).width()
	var margin = (wWidth - tWidth) / 2.0
	d3.select("table")
		.style("margin-left",70)
	var headHeight = d3.select("thead").node().getBoundingClientRect().height
	var bodyHeight = d3.select("tbody").node().getBoundingClientRect().height
	var tablePos = parseInt(d3.select("#tableContainer").style("margin-top").replace("px",""))
	d3.select("tbody").style("top", (headHeight + tablePos) + "px")

	d3.select("table").style("height", (headHeight + bodyHeight) + "px")
	var comma = d3.format(",")
	var dec = d3.format(".2,")
	d3.selectAll("td")
		.html(function(){
			var td = d3.select(this)
			var val = td.html()
			if(td.classed("col0")){
				return val;
			}
			else if(!isNaN(parseFloat(val))){
				return comma(d3.select(this).html())
			}
			else{ return val}
		})

}
function checkUnitCompatibility(unit, input, charts){
	d3.selectAll("th.selected")
		.classed("selected", function(th){
			var re = /col\d*/g
			var series = d3.select(this).attr("class").match(re)
			if(input["data"][series]["type"] == unit){
				return true
			} else{
				for(var i = 0; i<charts.length; i++){
				 	removeSeries(charts[i], input["data"][series]["label"]) 
		 			var tmp = exportParams.columns.indexOf(series);
					exportParams.columns.splice(tmp, 1)

				}
				d3.select("#interactionInstructions .warning")
					.transition()
					.duration(100)
					.style("color","#ec008b")
					.transition()
					.delay(3000)
					.duration(500)
					.style("color","#000000	")
				return false
			}
		})

	d3.selectAll("th.singleSelected:not(.selected)")
		.classed("singleSelected",false)

}
function generateTimeSeries(year, column){
	var series = [];
	for(var i = 0; i< year.length; i++){
		var y = (column[i] == false || isNaN(column[i])) ? null : column[i];
//ignore "Total" row in tables such as 5.B4
		if(year[i] == false){
			continue
		}
		else if(typeof(year[i]) == "number"){
//simple case, like "2014"
			series.push([Date.UTC(year[i], 0, 2), y]);
		}
		else if(year[i].indexOf("Before 1975") != -1){
			series.push([Date.UTC(1957, 0, 2), y]);
		}
//cases like 1950 (Jan.–Aug.) or 1995 (Dec.)
		else if(year[i].indexOf("(") != -1){
			series.push([getDate(year[i], false, true), y]);
		}
//cases like 1993-1997 or July 1968–1973
		else if(year[i].indexOf("-") != -1){
			var years = year[i].split("-")
			// var years = year[i].replace(/[A-Za-z ]/g,"").split("-");
			series.push([getDate(years[0], years[1]), y]);
			series.push([getDate(years[1], years[0]), y]);
		}
//cases like January 2005	
		else{
			series.push([getDate(year[i], false), y]);
		}
	}
	return series;
}

function getDate(y1, y2, parenthetical){
	// y2 = y2 || false;
	var year, year2, mYear;
	var m = false;
	if(parenthetical){
//cases like 1950 (Jan.–Aug.) or 1995 (Dec.)

		year = y1.replace(/[^\d]/g,"")
		var month = y1.match(/\(([^()]+)\)/g)
		month = String(month).split("-")[0]
		for (var i = 0; i< MONTHABBREVS.length; i++){
			if(y1.indexOf(MONTHABBREVS[i]) != -1){
				m = i;
				break;
			}
		}
		return Date.UTC(parseInt(year),m,2)

	}else{
		for (var i = 0; i< MONTHNAMES.length; i++){
			if(y1.indexOf(MONTHNAMES[i]) != -1){
				m = i;
				break;
			}
		}
		if(!y2){
//cases like January 2005	
			mYear = y1.replace(/[A-Za-z ]/g,"")
			return Date.UTC(parseInt(mYear),m,2)
		}
		else if(typeof(m)== "number" && !isNaN(m)){
			year = y1.replace(/[A-Za-z ]/g,"")
			if(year == ""){
//cases like January–June 1999	
				year2 = y2.replace(/[A-Za-z ]/g,"")
				return Date.UTC(parseInt(year2),m,2)
			}else{
//cases like July 1968–1973
				return Date.UTC(parseInt(year),m,2)
			}
		}else{
//cases like 1968-June 1999
			return Date.UTC(parseInt(y1), 0, 2)
		}
	}
}
function drawBar(input, col){
	// var col = (typeof(input.default) != "undefined") ? input.default : "col1"
	var labels = (input["data"]["categories"]["series"].length > 6) ? false : true;
	var marginBottom = (labels) ? 80 : 110;
	var marginLeft = (labels) ? 60 : 80;
	var initId = input["data"][col]["label"]
        $('#barChart').highcharts({
            chart: {
                marginTop: 150,
                marginBottom: marginBottom,
                marginLeft: marginLeft,
                type: 'column'

            },
            plotOptions: {
                series: {
                    marker: {
                        enabled: true
                    },

                    dataLabels: {
                        enabled: labels,
                        align: 'center',
                        formatter: function (){
                        	if(this.y == false || this.y==null){
                        		return null
                        	}else{
                        		return formatLabel(this.x, this.y, input, col, "tooltipBar")
                            }
                        }
                    }
                }
            },
            title: {
                text: "<div class = \"chartSubtitle\">" + input.title.category + "</div>" + "<div class = \"chartTitle\">" + input.title.name + "</div>"
            },
            xAxis: {
                gridLineWidth: '0',
                lineWidth: 2,
                tickInterval: 0,
                categories: input["data"]["categories"]["series"],
                plotLines: [{
                    value: 0,
                    width: 0
                        }],
                labels: {
                    step: 0,
                    x: 0,
                    y: 20
                }
            },
            yAxis: {
                title: {
                    text: ''
                },
                labels: {
                	formatter: function(){
                		return formatLabel(this, null, input, this.chart.series[0].userOptions.id, "label")
                	}
                    // format: '${value:.0f}'
                }
            },
            tooltip: {
            	enabled: !labels,
                formatter: function () {
                	if(this.y == false || this.y==null){
                        return null
                    }else{
                    	return formatLabel(this.x, this.y, input, this.series.userOptions.id, "tooltipBar")
                    }
                }
            },
            credits: {
                enabled: true,
                text: "<a href = \"https://www.ssa.gov/policy/docs/statcomps/supplement/\">Social Security Administration, Annual Statistical Supplement, 2014</a>",
                href: "https://www.ssa.gov/policy/docs/statcomps/supplement/"
            },
            legend: {
                enabled: true,
                floating: 'true',
                align: 'left',
                verticalAlign: 'left',
                layout: 'horizontal',
                borderWidth: 0,
                itemDistance: 9,
                y: 40
            },
            series: [{
            			id: col,
                    	name: initId,
                    	data: input["data"][col]["series"]
                    }
                  ]

        });
	d3.select("#lineChart")
		.transition()
		.style("left",-3000)
	d3.select("#singleYearBarChart")
		.transition()
		.style("left",3000)
	d3.select("#map")
		.transition()
		.style("left",3000)
	d3.select("#barChart")
		.transition()
		.style("left","400px")
}

function drawMap(input, col){
	var initId = input["data"][col]["label"]
	$('#map').highcharts('Map', {
        title: {
                text: "<div class = \"chartSubtitle\">" + input.title.category + "</div>" + "<div class = \"chartTitle\">" + input.title.name + "</div>"
            },
        mapNavigation: {
        	enableMouseWheelZoom: false,
            enabled: true,
            buttonOptions: {
                verticalAlign: 'bottom',
                symbolFill: "#333333",
                symbolStroke: "#333333"
            }
        },
        chart:{
        	marginTop: 80,
        	marginBottom: 70
        },
        colorAxis: {
            // min: 0,
            // max: 100000,
            minColor: "#f0f0f0",
            maxColor: "#1696d2",
            labels:{
            	formatter: function(){
            		return formatLabel(this, null, input, col, "labelMap")
            	}
            }

        },
        legend:{
        	title: {
        		text: initId
        	}        	// ,
        },
        tooltip: {
                formatter: function () {
                	// if(this.y == false || this.y==null){
                        // return null
                    // }else{
                    	return formatLabel(this.key, this.point.value, input, col, "tooltipMap")
                    // }
                }
        },
        credits: {
            enabled: true,
            text: "<a href = \"https://www.ssa.gov/policy/docs/statcomps/supplement/\">Social Security Administration, Annual Statistical Supplement, 2014</a>",
            href: "https://www.ssa.gov/policy/docs/statcomps/supplement/"
        },
        series : [{
            data : input["data"][col]["series"],
            mapData: Highcharts.maps['countries/us/custom/us-all-territories'],
            joinBy: 'hc-key',
            name: initId,
            borderColor: "white",
            states: {

                hover: {
                    color: '#fdbf11'
                },
                normal: {
                	animation: false
                }

            },
            dataLabels: {
                enabled: false,
                format: '{point.name}'
            }
        }, {
            name: 'Separators',
            type: 'mapline',
            data: Highcharts.geojson(Highcharts.maps['countries/us/custom/us-all-territories'], 'mapline'),
            color: 'none',
            showInLegend: false,
            enableMouseTracking: false
        }]
    });
	d3.select("#lineChart")
		.transition()
		.style("left",-3000)
	d3.select("#singleYearBarChart")
		.transition()
		.style("left",3000)
	d3.select("#barChart")
		.transition()
		.style("left",3000)
	d3.select("#map")
		.transition()
		.style("left","400px")
}


function drawLineChart(input){
	var initId = input["data"]["col1"]["label"]
    $('#lineChart').highcharts({
            chart: {
                marginTop: 150,
                marginBottom: 100
            },
            plotOptions: {
                series: {
                    marker: {
                        enabled: true
                    },
                }
            },

            title: {
                text: "<div class = \"chartSubtitle\">" + input.title.category + "</div>" + "<div class = \"chartTitle\">" + input.title.name + "</div>"
            },
            // subtitle: {
            //     text: "<div class = \"chartSubtitle\">" + input.title.name + "</div>"
            //     // x: 0,
            //     // y: 35
            // },
            subtitle: {
                text: '',
                x: 0,
                y: 0
            },
            xAxis: {
                gridLineWidth: '0',
                lineWidth: 2,
                plotLines: [{
                    value: 0,
                    width: 0
                        }],
                type: "datetime",
                minRange: 1
            },

            yAxis: {
                title: {
                    text: ''
                },
                labels: {
                	formatter: function(){
                		return formatLabel(this, null, input, this.chart.series[0].userOptions.id, "label")
                	}
                    // format: '${value:.0f}'
                }
            },
            tooltip: {
			    crosshairs: {
			        color: 'rgb(159,159,159)',
			        dashStyle: 'solid'
			    },
                shared: false,
                valueDecimals: 0,
                formatter: function () {
                	if(this.y == false || this.y==null){
                        return null
                    }else{
                    	var arrayOfSeries = this;
                    	return formatLabel(this.x, this.y, input, this.series.userOptions.id, "tooltipLine")

                    }
                }
            },
            credits: {
                enabled: true,
                text: "<a href = \"https://www.ssa.gov/policy/docs/statcomps/supplement/\">Social Security Administration, Annual Statistical Supplement, 2014</a>",
                href: "https://www.ssa.gov/policy/docs/statcomps/supplement/"
            },
            legend: {
            align: 'top',
            verticalAlign: 'top',
            layout: 'vertical',
            // width: 140,
            // useHTML: true,
            x: 0,
            y: 40,
                borderWidth: 0,
                itemDistance: 9,
            },

        series: [{
        	id: "col1",
            name: initId,
            data: generateTimeSeries(input.data.years.series, input.data.col1.series)
        }
        ]
    });
}
function generateBarFromYear(years, column, year){
	console.log(years,column,year)
	var series = [];
	for(var i = 0; i< years.length; i++){
//ignore "Total" row in tables such as 5.B4
		var y = years[i]
		if(typeof(y) == "string"){
			y = y.replace(/\s/g,"").replace(/[A-Z|a-z]/g,"")
		}
		if(y == false){
			return null;
		}
		else if(typeof(y) == "number" || y.search("-") == -1){
			series.push([Date.UTC(y, 0, 2), column[i]]);
		}else{
			var range = y.split("-");
			var start = parseInt(range[0]);
			var end = parseInt(range[1]);
			for(var c=start; c<=end; c++){
				series.push([Date.UTC(c, 0, 2), column[i]]);	
			}
		}
	}
	for(var j = 0; j < series.length; j++){
		if(series[j][0] == Date.UTC(parseInt(year), 0, 2)){
			return series[j][1]
		}
	}
	return "not found";
}
function drawSingleYearBarChart(input){
	var initId = input["data"]["col1"]["label"]
        $('#singleYearBarChart').highcharts({
            chart: {
                marginTop: 90,
                marginBottom: 80,
                type: 'column'

            },
            plotOptions: {
                series: {
                    marker: {
                        enabled: true
                    },

                    dataLabels: {
                        enabled: true,
                        align: 'center',
                        formatter: function (){
                        	if(this.y == false || this.y==null){
                        		return null
                        	}else{
                            	return formatLabel(this.x, this.y, input, this.series.userOptions.id, "tooltipBar")
                            }
                        }
                    }
                }
            },
			title: {
                text: "<div class = \"chartSubtitle\">" + input.title.category + "</div>" + "<div class = \"chartTitle\">" + input.title.name + "</div>"
            },
            xAxis: {
                gridLineWidth: '0',
                lineWidth: 2,
                tickInterval: 0,
                categories: [initId],
                plotLines: [{
                    value: 0,
                    width: 0
                        }],
                labels: {
                    step: 0,
                    x: 0,
                    y: 20
                }
            },
            yAxis: {
                title: {
                    text: ''
                },
                labels: {
                	formatter: function(){
                		return formatLabel(this, null, input, $('#lineChart').highcharts().series[0].userOptions.id, "label")
                	}
                    // format: '${value:.0f}'
                }
            },
            tooltip: {
            	enabled: false
                // formatter: function () {
                	// if(this.y == false || this.y==null){
                        // return null
                    // }else{
                    	// return formatLabel(this.x, this.y, input, this.series.userOptions.id, "tooltipBar")
// 
                    // }
                // }
            },
            credits: {
                enabled: true,
                text: "<a href = \"https://www.ssa.gov/policy/docs/statcomps/supplement/\">Social Security Administration, Annual Statistical Supplement, 2014</a>",
                href: "https://www.ssa.gov/policy/docs/statcomps/supplement/"
            },
            legend: {
                enabled: false,
                floating: 'true',
                align: 'left',
                verticalAlign: 'left',
                layout: 'horizontal',
                borderWidth: 0,
                itemDistance: 9,
                y: 40
            },
            series: [{
            			id: "col1",
                    	name: initId,
                    	data: [generateBarFromYear(input.data.years.series, input.data.col1.series, String(input.data.years.series[input.data.years.series.length-1]))]
                    }
                  ]

        });
		yearBarCache[initId] = [input.data.years.series, input.data.col1.series]
		// yearBarCache[initId] = generateTimeSeries(input.data.years.series, input.data.col1.series)
		yearBarCache["id"] = "col1"
}
function removeSeries(chart, id){
	if(chart.renderTo.id == "singleYearBarChart"){

		var index = chart.xAxis[0].categories.indexOf(id)
		chart.series[0].removePoint(index)

		$.each(chart.series[0].data, function(k,v){
			v.update({
				x: k
			});
		});

		var categories = chart.xAxis[0].categories
		categories.splice(index, 1)
		chart.xAxis[0].setCategories(categories)
		chart.redraw();
	}
	else{
		for(var i = 0; i<chart.series.length; i++){
			var ser = chart.series[i];
			if(ser.options.name == id){
				ser.remove();
			}
		}
	}
}
function getId(doc){
	return doc.title.id.replace(/\./g,"_")
}
function getDocURL(id){
	return "http://localhost:27080/test/tables/_find?criteria=" + encodeURIComponent('{"title.id":"' + id + '"}')
}
function getJSONPath(id){
	if (id == "words"){
		return "../data/words.json"
	}
	else if (id == "titles"){
		return "../data/titles.json"
	}else{
		return "../data/json/stat_supplement_table-" + id + ".json"
	}
}
function singleYear(){
	d3.selectAll("th.selected")
		.classed("singleSelected",true)

// 	#singleYearBarChart{
//     left: 2000px;
// }
// #valueScrubber{
//     top: 393px;
//     left: 455px;
//     z-index: 300;
//     position: fixed;
// }
	d3.select("#valueScrubber")
		.transition()
		.style("top","450px")
	d3.select("#singleYearCheck")
		.transition()
		.style("top","460px")

	exportParams.chartType = "timeBar";

	d3.select("#lineChart")
		.transition()
		.style("left",-3000)
	d3.select("#singleYearBarChart")
		.transition()
		.style("left","400px")
	d3.select("#valueScrubber .left.thumb")
		.style("display","none")
	d3.select("#leftValue")
		.style("opacity",0)
	d3.select("#valueScrubber .right.thumb")
		.classed("singleYear", true)
	d3.select("#sliderHighlight")
		.transition()
		.attr("x",0)
		.attr("width", function(){
			return d3.select(".right.thumb").attr("cx")
		})
}
function multiYear(){
	d3.selectAll("th.selected")
		.classed("singleSelected",false)

	d3.select("#valueScrubber")
		.transition()
		.style("top","393px")
	d3.select("#singleYearCheck")
		.transition()
		.style("top","403px")

	exportParams.chartType = "lineChart";

	d3.select("#lineChart")
		.transition()
		.style("left","400px")
	d3.select("#singleYearBarChart")
		.transition()
		.style("left",3000)
	d3.select("#map")
		.transition()
		.style("left",3000)
	d3.select("#barChart")
		.transition()
		.style("left",3000)
	d3.select("#valueScrubber .left.thumb")
		.style("display","block")
	d3.select("#leftValue")
		.style("opacity",1)
	d3.select("#valueScrubber .right.thumb")
		.classed("singleYear", false)

	if(parseFloat(d3.select(".right.thumb").attr("cx")) < parseFloat(d3.select(".left.thumb").attr("cx"))){
		d3.select(".right.thumb")
			.attr("cx", function(d){
				d.x=d3.select(".left.thumb").datum().x
				return parseFloat(d3.select(".left.thumb").attr("cx"))
			});
		d3.select("#rightValue").text(d3.select("#leftValue").text())
	}
	d3.select("#sliderHighlight")
		.transition()
		.attr("x", function(){
			return d3.select(".left.thumb").attr("cx")
		})
		.attr("width", function(){
			return parseInt(d3.select(".right.thumb").attr("cx")) - parseInt(d3.select(".left.thumb").attr("cx"))
		})

}
function changeYears(start, end){

	var lineChart = $('#lineChart').highcharts();
    lineChart.xAxis[0].setExtremes(
            Date.UTC(parseInt(start), 0, 2),
            Date.UTC(parseInt(end), 0, 2)
    );
    var singleYearBarChart = $('#singleYearBarChart').highcharts();
		$.each(singleYearBarChart.series[0].data, function(k,v){
			var barData = yearBarCache[v.category]
			var realEnd;
			if(generateBarFromYear(barData[0], barData[1], end) != "not found"){
				v.update({
					y: generateBarFromYear(barData[0], barData[1], end)
				});
				realEnd = end;
			}
		});

}
function drawScrubber(lower, upper){
	d3.select("#singleYearCheck svg").remove();
	d3.selectAll("#valueScrubber div").remove();
	var width = 240,
	    height = 45,
	    radius = 7,
		lowerBound = lower,
		upperBound = upper,
		margin = {top: 0, right: 4, bottom: 0, left: 4};
	
	d3.select("#singleYearCheck")
		.append("svg")
		.attr("class", "unchecked")
		.attr("width", 2*radius)
		.attr("height", 2*radius)
		.append("g")
		.append("circle")
		.attr("class","outer")
		.attr("cx",radius)
		.attr("cy",radius)
		.attr("r",radius)

	d3.select("#singleYearCheck svg")
		.on("mousedown", function(){
			d3.select(this).classed("pressed", true)
		})
		.on("mouseup", function(){
			if(d3.select(this).classed("checked")){
				d3.select(this).attr("class", "unchecked");
				multiYear();
			}else{
				d3.select(this).attr("class", "checked");
				singleYear();
			}
		})
		.append("circle")
		.attr("cx",radius)
		.attr("cy",radius)
		.attr("r",radius/2)
		.attr("class","inner")

	var scale = d3.scale.linear()
		.domain([radius+margin.left, width-radius-margin.right])
		.range([lowerBound, upperBound]);

	var drag = d3.behavior.drag()
	    .origin(function(d) { return d; })
	    .on("drag", dragmove);

	var leftValue = d3.select("#valueScrubber")
		.append("div")
		.attr("id", "leftValue")
		.text(String(lower))

	var svg = d3.select("#valueScrubber").append("div")
	  	.append("svg")
	    .attr("width", width)
	    .attr("height", height);
	    
	var rightValue = d3.select("#valueScrubber")
		.append("div")
		.attr("id", "rightValue")
		.text(String(upper))

	svg.append("rect")
		.attr("id", "sliderTrack")
		.attr("x", margin.left)
		.attr("y", height/2 - 2)
		.attr("height", 4)
		.attr("width", width-margin.right-margin.left)
		.attr("rx", 2)
		.attr("ry", 2)

	svg.append("rect")
		.attr("id", "sliderHighlight")
		.attr("x", margin.left)
		.attr("y", height/2 - 2)
		.attr("height", 4)
		.attr("width", width-margin.right-margin.left)
		.attr("rx", 2)
		.attr("ry", 2)

	svg.selectAll(".left")
		.data(d3.range(1).map(function() { return {x: radius+margin.left, y: height / 2}; }))
		.enter()
		.append("circle")
		.attr("class","thumb left")
	    .attr("r", radius)
	    .attr("cx", function(d) { return d.x; })
	    .attr("cy", function(d) { return d.y; })
	    .call(drag);

	svg.selectAll(".right")
		.data(d3.range(1).map(function() { return {x: width - radius-margin.right, y: height / 2}; }))
		.enter()
		.append("circle")
		.attr("class","thumb right")
	    .attr("r", radius)
	    .attr("cx", function(d) { return d.x; })
	    .attr("cy", function(d) { return d.y; })
	    .call(drag);

	function dragmove(d) {
	  var dragged = d3.select(this)
	  var isLeft = dragged.classed("left")
	  var isSingleYear = dragged.classed("singleYear")
	  var other = (isLeft) ? d3.select("circle.right") : d3.select("circle.left")
	  if(!isLeft){
	  	var pos = (isSingleYear) ? Math.min(width-radius-margin.right, Math.max(radius+2, d3.event.x)) : Math.min(width-radius-margin.right, Math.max(other.data()[0].x, d3.event.x));
		var value = Math.round(scale(pos));
		rightValue.text(value);
		changeYears(leftValue.text(), value);
		d3.select("#sliderHighlight")
			.attr("width", function(){
				return pos - d3.select(this).attr("x")
			})
	  	dragged
	    	.attr("cx", d.x = pos);
	  } else{
	  	var pos = Math.min(other.data()[0].x, Math.max(radius+margin.left, d3.event.x));
		var value = Math.round(scale(pos));
		leftValue.text(value);
		changeYears(value, rightValue.text());
		d3.select("#sliderHighlight")
			.attr("x", function(){
				return pos;
			})
			.attr("width", function(){
				return d3.select("circle.right").attr("cx") - pos
			})
	  	dragged
	  		.attr("cx", d.x = pos);
	  }
	}

}
function hideScrubber(){
	// d3.select("#hideScrubber")
		// .style("display","block")
	// d3.select("#valueScrubber").classed("hidden",true)
	// d3.select("#singleYearCheck").classed("hidden",true)	
	d3.select("#valueScrubber")
		.transition()
		.style("left",-3000)
	d3.select("#singleYearCheck")
		.transition()
		.style("left", -3000)

}
function showScrubber(){
	// d3.select("#hideScrubber")
	// 	.style("display","none")
	// d3.select("#valueScrubber").classed("hidden",false)
	// d3.select("#singleYearCheck").classed("hidden",false)	
	d3.select("#valueScrubber")
		.transition()
		.style("left",455)
		.style("top","393px")
	d3.select("#singleYearCheck")
		.transition()
		.style("left", 803)
		.style("top","403px")

}
function setTheme(){
	Highcharts.createElement('link', {
	    href: 'http://fonts.googleapis.com/css?family=Lato:400,600',
	    rel: 'stylesheet',
	    type: 'text/css'
	}, null, document.getElementsByTagName('head')[0]);

	var embed = {
            text: 'Get embeddable chart',
                onclick: function () {
                	d3.select("#dialog-message textarea")
                		.html(function(){
                			var url = "http://localhost:8081/data-tool/embed.html?"
                			url += "tableID=" + exportParams.tableID + "&"
                			url += "chartType=" + exportParams.chartType + "&"
                			url += "columns="
                			for(var i=0; i< exportParams.columns.length; i++){
                				url += exportParams.columns[i]
                				if(i != exportParams.columns.length-1){
                					url += ","
                				}
                			}
                			return "&lt;iframe frameborder=\"0\" height=\"400px\" marginheight=\"0\" scrolling=\"no\" src=\"" + url + "\" width=\"100%\"&gt;&lt;/iframe&gt"
                		})
                		// &lt;iframe frameborder="0" height="450px" marginheight="0" scrolling="no" src="http://webapp.urban.org/reducing-mass-incarceration/embed_child.html" width="100%"&gt;&lt;/iframe&gt;
                	$( "#dialog-message" ).dialog({
					      modal: true,
					      minWidth: 400,
      					  buttons: {
        				  	Ok: function() {
          				  		$( this ).dialog( "close" );
        				  	}
      					  }
    				});
            	}
	}
	var oldMenu = Highcharts.getOptions().exporting.buttons.contextButton.menuItems
	oldMenu.unshift(embed)

	Highcharts.theme = {
	    colors: ["#0096d2", "#00578b", "#fcb918", "#f47d20", "#ec008c",
	      "#55BF3B", "#DF5353"],
	    chart: {
	        backgroundColor: "#ffffff",
	        style: {
	            fontFamily: "Lato, sans-serif"
	        },
	        marginTop: 0,
	        marginBottom: 40
	    },
	    title: {
	        style: {
	            fontSize: '18px',
	            color: '#5a5a5a'
	        },
	        align: 'left',
	        margin: 50,
	        useHTML: true,
	        floating: false
	    },
    subtitle: {
        text: '* Footnote',
        align: 'right',
        x: -50,
        y: 305
    },
	    tooltip: {
	        backgroundColor: '#000000',
	        borderWidth: 0,
	        shape: 'square',
	        style: {
	            color: '#ffffff',
	            fontWeight: 'bold'
	        }
	    },
	    subtitle: {
	        align: 'left'
	    },
	    legend: {
	        itemStyle: {
	            fontWeight: 'bold',
	            fontSize: '13px'
	        }
	    },
        exporting: {
            buttons: {
                contextButton: {
                	symbol: false,

	            	text: "<span>Download</span>",
                    menuItems: oldMenu,
                    theme: {
                	// width: 200,
                	// height: 100,
                    'stroke-width': 10,
                    stroke: '#333',
                    r: 0,
                    fill: "#333",
                    color: "#fff",
                    font: "Lato",
                    states: {
                        hover: {
                            fill: '#1696d2',
                            stroke: '#1696d2'
                        },
                        select: {
                            fill: '#1696d2',
                            stroke: '#1696d2'
                        }
                    }
                }
                }
            }
        },
	    credits: {
	        enabled: false
	    },
	    xAxis: {
	        gridLineWidth: 0,
	        gridLineColor: 'rgba(219,219,216,0.5)',
	        labels: {
	            style: {
	                fontSize: '12px'
	            }
	        },
	        tickmarkPlacement: 'on'
	    },
	    yAxis: {
	        minorTickInterval: 'none',
	        gridLineColor: 'rgba(219,219,216,0.5)',

	        title: {

	        },
	        labels: {
	            style: {
	                fontSize: '12px'
	            }
	        }
	    },
	    plotOptions: {
	        candlestick: {
	            lineColor: '#404048'
	        },
	        area: {
	            fillOpacity: 0.5
	        },
	        series: {
	            marker: {
	                enabled: true,
	                radius: 3,
	                lineWidth: 2,
	                symbol: 'circle',
	                fillColor: '#ffffff',
	                lineColor: null
	            },
	            connectNulls: true

	        }

	    },
	};

	// Apply the theme
	Highcharts.setOptions(Highcharts.theme);
}
// var tempAllSheets = ['2.A3','2.A4','2.A20','2.A21','2.A30','2.F4','2.F5','2.F6','2.F7','2.F8','2.F9','2.F11','3.C3','3.C5','3.C6','4.A2','4.A3','4.A4','4.A6','4.C1','4.C2','5.A1','5.A1.2','5.A1.3','5.A1.4','5.A3','5.A4','5.A5','5.A6','5.A7','5.A8','5.A10','5.A17','5.D1','5.D2','5.D3','5.D4','5.E1','5.E2','5.F1','5.F4','5.F6','5.F7','5.F8','5.H1','5.H2','5.H3','5.H4','5.J1','5.J2','5.J4','5.J8','5.J10','5.J14','5.M1','6.A1','6.A2','6.A3','6.A4','6.A5','6.A6','6.C1','6.C2','6.C7','6.D4','6.D5','6.D7','6.D8','6.F1','6.F2','6.F3']


// var tempAllSheets = ['2.A3','2.A4','2.A30','2.F4','2.F5','2.F6','2.F8','2.F11','4.A2','4.A3','4.A4','4.A6','4.C1','5.A1.3','5.A7','5.A17','5.D1','5.D2','5.D3','5.D4','5.E1','5.E2','5.F1','5.F4','5.F6','5.F7','5.F8','5.H1','5.H3','5.H4','5.J1','5.J2','5.J4','5.J8','5.J10','5.J14','6.A1','6.A2','6.A3','6.A6','6.C1','6.C2','6.C7','6.D4','6.D8','6.F1']


var tempAllSheets = ["2_A3","2_A30","2_A4","2_F11","2_F4","2_F5","2_F6","2_F8","4_A1","4_A2","4_A3","4_A4","4_A5","4_A6","4_C1","5_A14-0","5_A14-1","5_A17","5_A1_8","5_A4-0","5_A4-1","5_B4","5_D1","5_D2","5_D3","5_E1","5_E2","5_F1-0","5_F1-1","5_F4-0","5_F4-1","5_F4-2","5_F4-3","5_F6","5_F7","5_F8","5_H1-0","5_H1-1","5_H3","5_H4","5_J1","5_J10","5_J14","5_J2","5_J4","5_J8","6_A1","6_A2","6_A6","6_B5-0","6_B5-1","6_B5_1-0","6_B5_1-1","6_C1","6_C2-0","6_C2-1","6_C7","6_D4-0","6_D4-1","6_D4-2","6_D4-3","6_D8","6_F1"]


var allSheets = tempAllSheets;
var sheets = tempAllSheets;
var TOTAL_TABLES = sheets.length
var tableIndex = 0;
// init("2A9");
// init("4C1");
init();
window.onresize = function(){
	if(d3.select("#testTable thead").node().getBoundingClientRect().width - $(window).width() + 74 <= 0){
		d3.select(".rightFader").style("opacity", 0)
       	d3.select("#panRight").style("display","none")
       	d3.select("#panLeft").style("display","none")

	}else{
	   	d3.select("#panRight").style("display","block")
	   	d3.select("#panLeft").style("display","block")
		d3.select(".rightFader").style("opacity",1)
	}
}



function searchTables(val){
	var checked = d3.selectAll("#checkBoxes input").filter(function(d){return this.checked})
	var results, tmp;
	if(checked.node() != null){
		var tmp = keywords[d3.select(checked.node()).attr("id")]
	}else{ tmp = null}
	if (val.value == "Enter keywords" && checked.node() == null){
		reset();
		return false;
	}
	if (val.value == "Enter keywords"){
		sheets = _.intersection.apply(this, [tmp, allSheets])
		filterSheets(sheets[tableIndex], "")
		return false;
	}
	else if (tmp == null){
		// results.push(tmp)
		results = [];

	}else{
		results = [tmp]
	}
	// checked[0].map(function(c){
	// 	tmp.push(keywords[d3.select(c).attr("id")])
	// })
	// if(tmp.length != 0){
	// 	results = _.intersection.apply(this, tmp)
	// }
	var words = val.value
	words = words.toUpperCase().replace(/\s+/g," ").split(" ")	
	
	current = sheets[tableIndex]
	words.map(function(word){
		$.getJSON(getJSONPath("words"), function(allWords){
			if(typeof(allWords[word]) != "undefined"){
				results.push(allWords[word])
				if(results.length == words.length || (tmp != null && results.length == words.length +1)){
					results.push(allSheets)
					sheets = _.intersection.apply(this, results)
					filterSheets(current, val.value)	
				}
			}else{
				noResults(val.value)
			}
		})

	})
}

function noResults(val){
	var checked = d3.selectAll("#checkBoxes input").filter(function(d){return this.checked})
	if(checked.node() == null){
		d3.select("#searchText")
	  		.html("No tables found matching \"" + val + "\"")
	}else{
		var filter = d3.select(checked.node().parentNode).text().replace(/\s/g,"")
		if(filter == "EarningsTest"){ filter = "Earnings Test"}
		if(filter == "Trustfund"){ filter = "Trust fund"}
		d3.select("#searchText")
	  		.html("No tables found matching \"" + val + "\" and \"" + filter + "\"")
	}

}

function filterSheets(current, val){
	if(d3.select("table").node() == null){
		// return false;
	}else{
		var tID = d3.select("table").attr("id")
		// cleanSheets = sheets.map(function(t){ t = t.replace(/\./g,"_")})
		if(sheets.length == 0){
			noResults(val)
		  	return false;
		}
		if(sheets.indexOf(tID) != -1){
			tableIndex = sheets.indexOf(tID);
		}else{
			tableIndex = 0;
			newTable(0);
		}
	}

	var select = document.getElementById("tableMenu"); 
	d3.selectAll("#tableMenu option").remove()

	$.getJSON(getJSONPath("titles"), function(titles){
		for(var i = 0; i < sheets.length; i++){
		    var opt = sheets[i];
		    var el = document.createElement("option");
		    var content = titles[opt];
		    el.textContent = titles[opt];
		    el.value = opt;
		    if(typeof(content) != "undefined"){
		    	select.appendChild(el);
		    }
		  d3.select("#searchText")
		  	.html("Displaying " + sheets.length + " of " + TOTAL_TABLES + " tables")
		}
	$("#tableMenu").html($("#tableMenu option").sort(function (a, b) {
		// var catA, catB,
		aV = a.value.split("_")[0];
		bV = b.value.split("_")[0]; 
		// aD = a.value.split("_")[1].replace()
		if(aV != bV){
	    	return aV < bV ? -1 : 1
	    }else{
	    	aV = a.value.split("_")[1].split("-")[0]
	    	bV = b.value.split("_")[1].split("-")[0]
	    	aW = aV.replace(/\d/g,"")
	    	bW = bV.replace(/\d/g,"")
	    	aD = parseInt(aV.replace(/[^\d]/g,""))
	    	bD = parseInt(bV.replace(/[^\d]/g,""))
	    	if(aW != bW){
	    		return aW < bW ? -1 : 1
	    	}else{
	    		if(aD != bD){
	    			return aD < bD ? -1 : 1	
	    		}else{
	    			return a.value < b.value ? -1 : 1
	    		}
	    	}

	    }
	}))
	sheets = sheets.sort(function (a, b) {
	    aV = a.split("_")[0];
		bV = b.split("_")[0]; 
		if(aV != bV){
	    	return aV < bV ? -1 : 1
	    }else{
	    	aV = a.split("_")[1].split("-")[0]
	    	bV = b.split("_")[1].split("-")[0]
	    	aW = aV.replace(/\d/g,"")
	    	bW = bV.replace(/\d/g,"")
	    	aD = parseInt(aV.replace(/[^\d]/g,""))
	    	bD = parseInt(bV.replace(/[^\d]/g,""))
	    	if(aW != bW){
	    		return aW < bW ? -1 : 1
	    	}else{
	    		if(aD != bD){
	    			return aD < bD ? -1 : 1	
	    		}else{
	    			return a < b ? -1 : 1
	    		}
	    	}

	    }
	})
	d3.select("#tableMenu")
		.insert("option", "option")
		.text("Select a table")
	});

}
function formatLabel(x, y, input, col, type){
	if(type == "tooltipBar" && Object.keys(yearBarCache).length > 0){
		col = yearBarCache.id
	}
	var label = input.data[col].type
	var dollarOld = d3.format("$.4s")

	function dollar(x) {
	  var s = dollarOld(x);
	  switch (s[s.length - 1]) {
	    case "k": return s.slice(0, -1) + " thousand";
	    case "M": return s.slice(0, -1) + " million";
	    case "G": return s.slice(0, -1) + " billion";
	    case "T": return s.slice(0, -1) + " trillion";
	  }
	  return s;
	}
	var numOld = d3.format(".4s")
	function num(x) {
	  var s = numOld(x);
	  switch (s[s.length - 1]) {
	    case "k": return s.slice(0, -1) + " thousand";
	    case "M": return s.slice(0, -1) + " million";
	    case "G": return s.slice(0, -1) + " billion";
	    case "T": return s.slice(0, -1) + " trillion";
	  }
	  return s;
	}



	if(type == "label"){
		if(label == "dollar"){
			return '$' + (x.axis.defaultLabelFormatter.call(x)).replace("k","K").replace("G","B");
		}
		else if(label == "percent"){
			return x.axis.defaultLabelFormatter.call(x) + "%";
		}
		else{
			return (x.axis.defaultLabelFormatter.call(x)).replace("k","K").replace("G","B");	
		}
	}
	else if(type == "labelMap"){
		if(label == "dollar"){
			return '$' + x.axis.defaultLabelFormatter.call(x);
		}
		else if(label == "percent"){
			return x.axis.defaultLabelFormatter.call(x) + "%";
		}
		else{
			return x.axis.defaultLabelFormatter.call(x);	
		}	
	}

	if(type == "tooltipLine"){
		var date = new Date(x)
		var full = MONTHNAMES[date.getMonth()] + " " + date.getFullYear()
		switch(label){
			case "dollar":
				return full + ": " + dollar(y)
				break;
			case "dollarThousand":
				return full + ": " + dollar(y * 1000)
				break;
			case "dollarMillion":
				return full + ": " + dollar(y * 1000000)
				break;
			case "number":
				return full + ": " + num(y)
				break;				
			case "numberThousand":
				return full + ": " + num(y * 1000)
				break;
			case "numberMillion":
				return full + ": " + num(y * 1000000)
				break;
			case "percent":
				return full + ": " + y + "%"
				break;

		}
	}
	else if(type == "tooltipBar"){
		switch(label){
			case "dollar":
				return dollar(y)
				break;
			case "dollarThousand":
				return dollar(y * 1000)
				break;
			case "dollarMillion":
				return dollar(y * 1000000)
				break;
			case "number":
				return num(y)
				break;				
			case "numberThousand":
				return num(y * 1000)
				break;
			case "numberMillion":
				return num(y * 1000000)
				break;
			case "percent":
				return y + "%"
				break;
		}
	}
	else if(type == "tooltipMap"){
		switch(label){
			case "dollar":
				return x + ": " + dollar(y)
				break;
			case "dollarThousand":
				return x + ": " + dollar(y * 1000)
				break;
			case "dollarMillion":
				return x + ": " + dollar(y * 1000000)
				break;
			case "number":
				return x + ": " + num(y)
				break;				
			case "numberThousand":
				return x + ": " + num(y *1000)
				break;
			case "numberMillion":
				return x + ": " + num(y * 1000000)
				break;
			case "percent":
				return x + ": " + y + "%"
				break;
		}
	}
}

document.getElementById("searchBox").addEventListener("keydown", function(e) {
    if (!e) { var e = window.event; }
    // e.preventDefault(); // sometimes useful

    // Enter is pressed
    if (e.keyCode == 13) { searchTables(this); }
}, false);

d3.select("#searchButton")
	.on("click", function(){
		searchTables(document.getElementById("searchBox"))
	})

d3.selectAll("#checkBoxes input")
	.on("click", function(){
		if(!d3.select(this).property("checked")){
			d3.selectAll("#checkBoxes input").property("checked",false)
			searchTables(document.getElementById("searchBox"))
		}else{
			d3.selectAll("#checkBoxes input").property("checked",false)
			d3.select(this).property("checked",true)
			searchTables(document.getElementById("searchBox"))
		}
	})
// WORDS = getJSON
d3.select("#prevButton")
	.on("click", function(){
		if(tableIndex <= 0){
			tableIndex = sheets.length -1;
		}else{
			tableIndex -= 1;
		}
		newTable(tableIndex)
	})
d3.select("#nextButton")
	.on("click", function(){
		if(tableIndex >= sheets.length-1){
			tableIndex = 0;
		}else{
			tableIndex += 1;
		}
		newTable(tableIndex)
	})

$(function() {
    $('#tableMenu').change(function() {
        var val = $(this).val();
        newTable(sheets.indexOf(val))
    });
});



(function () {

	var scrollHandle = 0,
	    scrollStep = 5,
	    fixTable = $("body");
	  // console.log(fixTable)

	//Start the scrolling process
	$(".panner").mousedown(function () {
	    var data = $(this).data('scrollModifier'),
	        direction = parseInt(data, 10);

	    $(this).addClass('active');

	    startScrolling(direction, scrollStep);
	});

	//Kill the scrolling
	$(".panner").mouseup(function () {
	    stopScrolling();
	    $(this).removeClass('active');
	});

	//Actual handling of the scrolling
	function startScrolling(modifier, step) {
	    if (scrollHandle === 0) {
	        scrollHandle = setInterval(function () {
	            var newOffset = fixTable.scrollLeft() + (scrollStep * modifier);

	            fixTable.scrollLeft(newOffset);
	        }, 10);
	    }

	   // var $foo = $("#headerWrapper");
	    // $foo.bind('scroll', function() {
	        // "Disable" the horizontal scroll.
	        // if ($foo.scrollLeft() !== 0) {
	            // $foo.scrollLeft(0);
	        // }
	    // });

	}

	function stopScrolling() {
	    clearInterval(scrollHandle);
	    scrollHandle = 0;
	}

}());



function reset(){
	sheets = allSheets;
	$("#searchBox").val("Enter keywords")
	d3.selectAll("#checkBoxes input").property("checked",false)
	filterSheets(0)
	newTable(0)
}
d3.select("#resetButton")
	.on("click", reset)
$(document).ready(function() {

   $(window).scroll(function() {
	   var end = d3.select("#testTable thead").node().getBoundingClientRect().width - $(window).width() + 74;       
       var scrollLeftVal = $(this).scrollLeft();
       d3.select("thead")
       	.style("left", -1*scrollLeftVal + 70)
       if(Math.abs(scrollLeftVal-end) <= 220){
       	d3.select(".rightFader")
       		.style("right", -220+Math.abs(scrollLeftVal-end))
       }
       else{
       	  d3.select(".rightFader")
       		.style("right",0)

       }


		var pos = window.pageXOffset || document.documentElement.scrollLeft
		var posLeft =  window.pageXOffset || document.documentElement.scrollRight
		if(pos+window.innerWidth >=1400){
		d3.select("#panRight img")
				.classed("enabled", false)
				.transition()
				.duration(100)
				.style("opacity", 0.1)
		}else{
			d3.select("#panRight img")
				.classed("enabled", true)
				.style("opacity", 0.3)
			d3.select(".rightFader")
				.style("right", 0)			
		}

		if(posLeft <= 20 || typeof(posLeft) == "undefined"){
			d3.select("#panLeft img")
					.classed("enabled", false)
					.transition()
					.duration(100)
					.style("opacity", 0.1)
		}else{
			d3.select("#panLeft img")
				.classed("enabled", true)
				.style("opacity", 0.3)
		}

    });
 });






