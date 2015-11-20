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
	// $.get( getDocURL("2A3"), function(resp) {
	setLayout();

	setTimeout(function(){
		$.getJSON( getJSONPath(sheets[tableIndex].replace(".","")), function(resp){
		  // var data = resp.results[0];
		  exportParams.tableID = sheets[tableIndex].replace(".","")
		  var data = resp;
		  var category = data.category;
		  switch(category){
		  	case "timeSeries":
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
		drawScrubber();
		filterSheets(0)
		yearBarCache = {};
	}, 1000);
}

function newTable(index){
	var id = sheets[index].replace(/\./g,"")
	exportParams.tableID = id;
	$.getJSON( getJSONPath(id), function(resp){
		  // var data = resp.results[0];
		  var data = resp;
		  var category = data.category;
		  console.log(id, category)
		  switch(category){
		  	case "timeSeries":
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
		drawScrubber();
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

	// var nameValue = document.getElementById("searchBox").value;
	// console.log(nameValue)
}
function drawTable(input){
	d3.select("#testTable table").remove()
	d3.select("#tableTitle")
		.html("<div class =\"titleCategory\">" + input.title.category + "</div>" + input.title.id + ": " + input.title.name)

	d3.select("#testTable")
		.append("table")
		.attr("class", "pure-table tablesorter")
		.attr("id", function(){
			return getId(input)
		})
	.html(function(){
		return input.html.header + input.html.body
	})
	d3.selectAll("#testTable th")
		.on("click", function(){
			var th = d3.select(this)
			var selected = th.classed("selected")
			var re = /col\d*/g
			var series = th.attr("class").match(re)
			var lineChart = $('#lineChart').highcharts();
			var singleYearBarChart = $('#singleYearBarChart').highcharts();
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

						lineChart.addSeries({
							id: seriesID,
			            	name: seriesID,
			            	data: generateTimeSeries(data.data.years.series, data["data"][series]["series"])
						});
						// singleYearBarChart.addSeries({
						// 	id: seriesID,
	     //                	name: seriesID,
	     //                	data: [generateBarFromYear(data.data.years.series, data["data"][series]["series"], $("#rightValue").text())]
	     //                	}
						// )

						yearBarCache[seriesID] = [data.data.years.series, data["data"][series]["series"]]
						checkUnitCompatibility(data["data"][series]["type"], input, [lineChart, singleYearBarChart])
						th.classed("selected", true)
			  			exportParams.columns.push(series)

					} else{
						var tmp = exportParams.columns.indexOf(series);
						exportParams.columns.splice(tmp, 1)

						removeSeries(lineChart, seriesID)
						removeSeries(singleYearBarChart, seriesID)
						th.classed("selected", false)
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
						drawBar(data, series[0])

						// checkUnitCompatibility(data["data"][series]["type"], input, [lineChart, singleYearBarChart])
						d3.selectAll("th").classed("selected",false)
						th.classed("selected", true)
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
	// console.log(input)
	if(input.category == "timeSeries"){
		d3.selectAll("td.col0")
			.html(function(){
				return d3.select(this).html().replace(/\.0/g,"")
			})
	}
	d3.selectAll(".footnotes").remove()
	d3.select("#testTable")
		.append("div")
		.attr("class", "footnotes")
	for(var i = 0; i<input.footnotes.length; i++){
		var note = input.footnotes[i]
		d3.select(".footnotes")
			.append("div")
			.attr("class",note.type + " footer")
			.html(function(){
				if(note.type == "footnote"){
					return "<span id = symbol_" + note.symbol.replace(".","") + ">" + note.symbol + "</span>" + note.content
				}else{ return note.content}
			})
	}
	d3.selectAll(".top_footnote")
		.on("click", function(){
			var symbol = d3.select(this).attr("class").replace("top_footnote","").split("_")[1]
			console.log($("#symbol_" + symbol).offset().top, $(window).height())
			var diff = $("#symbol_" + symbol).offset().top
			$('html, body').animate({
//diff minus height of controls minus thead minus title height				
        		scrollTop: diff - 360 - d3.select("thead").node().getBoundingClientRect().height - 100
    		}, 1000);

		})
		if(d3.select("#testTable thead").node().getBoundingClientRect().width - $(window).width() + 44 <= 0){
			d3.select(".rightFader").style("opacity", 0)
		}else{ d3.select(".rightFader").style("opacity",1)}

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
			var w = (cs == null || cs == 1) ? 100 : 120*cs-20+2.22
			return w;
		})
		.style("max-width", function(){
			var cs = d3.select(this).attr("colspan")
			var w = (cs == null || cs == 1) ? 100 : 120*cs-20+2.22
			return w;
		})
		.style("min-width", function(){
			var cs = d3.select(this).attr("colspan")
			var w = (cs == null || cs == 1) ? 100 : 120*cs-20+2.22
			return w;
		})
	d3.selectAll("td")
		.style("width", function(){
			var cs = d3.select(this).attr("colspan")
			var w = (cs == null || cs == 1) ? 100 : 120*cs-20+2.22
			return w
		})
		.style("max-width", function(){
			var cs = d3.select(this).attr("colspan")
			var w = (cs == null || cs == 1) ? 100 : 120*cs-20+2.22
			return w;
		})
		.style("min-width", function(){
			var cs = d3.select(this).attr("colspan")
			var w = (cs == null || cs == 1) ? 100 : 120*cs-20+2.22
			return w;
		})


//center table in window
	var tWidth = $("thead").width()
	var wWidth = $(window).width()
	var margin = (wWidth - tWidth) / 2.0
	d3.select("table")
		.style("margin-left",40)
	var headHeight = d3.select("thead").node().getBoundingClientRect().height
	var bodyHeight = d3.select("tbody").node().getBoundingClientRect().height
	var tablePos = parseInt(d3.select("#tableContainer").style("margin-top").replace("px",""))
	d3.select("tbody").style("top", (headHeight + tablePos) + "px")

	d3.select("table").style("height", (headHeight + bodyHeight) + "px")

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
					.style("color","#ff0000")
					.transition()
					.delay(1000)
					.duration(500)
					.style("color","#000000	")
				return false
			}
		})

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
			series.push([Date.UTC(year[i], 0, 1), y]);
		}
		else if(year[i].indexOf("Before 1975") != -1){
			series.push([Date.UTC(1935, 0, 1), y]);
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
		return Date.UTC(parseInt(year),m,1)

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
			return Date.UTC(parseInt(mYear),m,1)
		}
		else if(typeof(m)== "number" && !isNaN(m)){
			year = y1.replace(/[A-Za-z ]/g,"")
			if(year == ""){
//cases like January–June 1999	
				year2 = y2.replace(/[A-Za-z ]/g,"")
				return Date.UTC(parseInt(year2),m,1)
			}else{
//cases like July 1968–1973
				return Date.UTC(parseInt(year),m,1)
			}
		}else{
//cases like 1968-June 1999
			return Date.UTC(parseInt(y1), 0, 1)
		}
	}
}
function drawBar(input, col){
	console.log(input.default)
	// var col = (typeof(input.default) != "undefined") ? input.default : "col1"
	var labels = (input["data"]["categories"]["series"].length > 6) ? false : true;
	var marginBottom = (labels) ? 80 : 110;
	var marginLeft = (labels) ? 10 : 80;
	var initId = input["data"][col]["label"]
        $('#barChart').highcharts({
            chart: {
                marginTop: 50,
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
                            	return '' + '$' + this.y + ' million';
                            }
                        }
                    }
                }
            },
            title: {
                text: input.title.category
            },
            subtitle: {
                text: input.title.name
                // x: 0,
                // y: 35
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
                lineWidth: 0,
                gridLineWidth: 0,
                minorGridLineWidth: 0,
                lineColor: 'transparent',
                labels: {
                    enabled: false
                },
                minorTickLength: 0,
                tickLength: 0,
                title: {
                    text: null
                }
            },
            tooltip: {
                formatter: function () {
                	if(this.y == false || this.y==null){
                        return null
                    }else{
                    	return '' +
                        	this.x + ': $' + this.y + ' million';
                        }
                }
            },
            legend: {
                enabled: true,
                floating: 'true',
                align: 'center',
                verticalAlign: 'left',
                layout: 'horizontal',
                borderWidth: 0,
                itemDistance: 9,
                y: 40
            },
            series: [{
            			id: initId,
                    	name: initId,
                    	data: input["data"][col]["series"]
                    }
                  ]

        });
	d3.select("#lineChart")
		.transition()
		.style("left",-2000)
	d3.select("#singleYearBarChart")
		.transition()
		.style("left",2000)
	d3.select("#map")
		.transition()
		.style("left",2000)
	d3.select("#barChart")
		.transition()
		.style("left","400px")
}

function drawMap(input, col){
	// console.log(col)
	var initId = input["data"][col]["label"]
	$('#map').highcharts('Map', {
        title : {
            text : input.title.category
        },
        subtitle:{
        	text: input.title.name,
        },
        mapNavigation: {
        	enableMouseWheelZoom: false,
            enabled: true,
            buttonOptions: {
                verticalAlign: 'bottom'
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
            maxColor: "#1696d2"
        },
        legend:{
        	title: {
        		text: initId
        	}
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
		.style("left",-2000)
	d3.select("#singleYearBarChart")
		.transition()
		.style("left",2000)
	d3.select("#barChart")
		.transition()
		.style("left",2000)
	d3.select("#map")
		.transition()
		.style("left","400px")
}

function drawLineChart(input){
	var initId = input["data"]["col1"]["label"]
    $('#lineChart').highcharts({
            chart: {
                marginTop: 150,
                marginBottom: 40
            },
            plotOptions: {
                series: {
                    marker: {
                        enabled: true
                    },
                }
            },

            title: {
                text: input.title.name
            },
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
                    format: '${value:.0f}'
                }
            },
            tooltip: {
                shared: true,
                valuePrefix: '$',
                valueDecimals: 0
            },
            credits: {
                enabled: false,
                text: "",
                href: "http://www.neighborhoodinfodc.org"
            },
            legend: {
                enabled: true,
                floating: 'true',
                align: 'center',
                verticalAlign: 'left',
                layout: 'horizontal',
                borderWidth: 0,
                itemDistance: 9,
                y: 40
            },

        series: [{
        	id: initId,
            name: initId,
            data: generateTimeSeries(input.data.years.series, input.data.col1.series)
        }
        ]
    });
}
function generateBarFromYear(years, column, year){
	var series = [];
	for(var i = 0; i< years.length; i++){
//ignore "Total" row in tables such as 5.B4
		if(years[i] == false){
			return null;
		}
		else if(typeof(years[i]) == "number"){
			series.push([Date.UTC(years[i], 0, 1), column[i]]);
		}else{
			var range = years[i].split("-");
			var start = parseInt(range[0]);
			var end = parseInt(range[1]);
			for(var c=start; c<=end; c++){
				series.push([Date.UTC(c, 0, 1), column[i]]);	
			}
		}
	}
	for(var j = 0; j < series.length; j++){
		if(series[j][0] == Date.UTC(parseInt(year), 0, 1)){
			return series[j][1]
		}
	}
	return false;
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
                            	return '' + '$' + this.y + ' million';
                            }
                        }
                    }
                }
            },
            title: {
                text: input.title.name
            },
            subtitle: {
                text: '',
                x: 0,
                y: 35
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
                lineWidth: 0,
                gridLineWidth: 0,
                minorGridLineWidth: 0,
                lineColor: 'transparent',
                labels: {
                    enabled: false
                },
                minorTickLength: 0,
                tickLength: 0,
                title: {
                    text: null
                }
            },
            tooltip: {
                formatter: function () {
                	if(this.y == false || this.y==null){
                        return null
                    }else{
                    	return '' +
                        	this.x + ': $' + this.y + ' million';
                        }
                }
            },
            legend: {
                enabled: false,
                floating: 'true',
                align: 'center',
                verticalAlign: 'left',
                layout: 'horizontal',
                borderWidth: 0,
                itemDistance: 9,
                y: 40
            },
            series: [{
            			id: initId,
                    	name: initId,
                    	data: [generateBarFromYear(input.data.years.series, input.data.col1.series, "2014")]
                    }
                  ]

        });
		yearBarCache[initId] = [input.data.years.series, input.data.col1.series]
}
function removeSeries(chart, id){
	if(chart.renderTo.id == "singleYearBarChart"){
		// console.log(id)

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
			if(ser.options.id == id){
				ser.remove();
			}
		}
	}
}
function getId(doc){
	return doc.title.id.replace(".","")
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

	exportParams.chartType = "timeBar";

	d3.select("#lineChart")
		.transition()
		.style("left",-2000)
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

	exportParams.chartType = "lineChart";

	d3.select("#lineChart")
		.transition()
		.style("left","400px")
	d3.select("#singleYearBarChart")
		.transition()
		.style("left",2000)
	d3.select("#map")
		.transition()
		.style("left",2000)
	d3.select("#barChart")
		.transition()
		.style("left",2000)
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
            Date.UTC(parseInt(start), 0, 1),
            Date.UTC(parseInt(end), 0, 1)
    );
    var singleYearBarChart = $('#singleYearBarChart').highcharts();
		$.each(singleYearBarChart.series[0].data, function(k,v){
			var barData = yearBarCache[v.category]
			v.update({
				y: generateBarFromYear(barData[0], barData[1], end),
			});

		});

}
function drawScrubber(){
	d3.select("#singleYearCheck svg").remove();
	d3.selectAll("#valueScrubber div").remove();
	var width = 240,
	    height = 45,
	    radius = 7,
		lowerBound = 1937,
		upperBound = 2014,
		margin = {top: 0, right: 4, bottom: 0, left: 4};
	
	d3.select("#singleYearCheck")
		.append("svg")
		.attr("width", 2*radius)
		.attr("height", 2*radius)
		.append("g")
		.append("circle")
		.attr("class", "unchecked")
		.attr("cx",radius)
		.attr("cy",radius)
		.attr("r",radius)
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

	var scale = d3.scale.linear()
		.domain([radius+margin.left, width-radius-margin.right])
		.range([lowerBound, upperBound]);

	var drag = d3.behavior.drag()
	    .origin(function(d) { return d; })
	    .on("drag", dragmove);

	var leftValue = d3.select("#valueScrubber")
		.append("div")
		.attr("id", "leftValue")
		.text("1937")

	var svg = d3.select("#valueScrubber").append("div")
	  	.append("svg")
	    .attr("width", width)
	    .attr("height", height);
	    
	var rightValue = d3.select("#valueScrubber")
		.append("div")
		.attr("id", "rightValue")
		.text("2014")

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
	d3.select("#hideScrubber")
		.style("display","block")
	d3.select("#valueScrubber").classed("hidden",true)
	d3.select("#singleYearCheck").classed("hidden",true)	

}
function showScrubber(){
	d3.select("#hideScrubber")
		.style("display","none")
	d3.select("#valueScrubber").classed("hidden",false)
	d3.select("#singleYearCheck").classed("hidden",false)	
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
	    colors: ["#0096d2", "#00578b", "#fcb918", "#f47d20", "#6d6d6d", "#c6c6c6", "#ec008c",
	      "#55BF3B", "#DF5353", "#7798BF", "#aaeeee"],
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
	        align: 'left'
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
	            	text: "Share",
                    menuItems: oldMenu
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
var simpleTimeSheets = ['2.A3','2.A4','2.A8','2.A9','2.A13','2.A27','2.A28','2.C1','2.F3','3.C4','3.C6.1','3.E1','4.A1','4.A2','4.A3','4.A4','4.A5','4.A6','4.B1','4.B2','4.B4','4.B11','4.C1','5.A17','5.C2','5.D3','5.E2','5.F6','5.F8','5.F12','5.G2','6.C7','6.D6','6.D8','6.D9','7.A9','7.E6','8.A1','8.A2','8.B10','9.B1','9.D1']
var notok = ['2A27','2A28','2C1','3C4','3E1','4B1','4B2']
var tempAllSheets = ['5.D2','5.E1','5.F7','5.H3','5.H4','6.C1','5.A1.8','2.F4','2.F5','2.F6','2.F8','2.F11','5.J1','5F1-M0','5.J2','5.J4','5.J8','5.J10','5.J14','6.A6','5.B4','5.D1','6.A1','6.F1','6A2','2A30','5A14-M0','5A14-M1','5A4-M0','5A4-M1','5F1-M1','5F4-M0','5F4-M1','5F4-M2','5H1-M0','5H1-M1','6B5-M0','6B5-M1','6B51-M0','6B51-M1','6C2-M0','6C2-M1','6D4-M0','6D4-M1','6D4-M2','6D4-M3','2.A3','2.A4','2.A8','2.A9','2.A13','2.F3','3.C6.1','4.A1','4.A2','4.A3','4.A4','4.A5','4.A6','4.B4','4.B11','4.C1','5.A17','5.C2','5.D3','5.E2','5.F6','5.F8','5.F12','5.G2','6.C7','6.D6','6.D8','6.D9','7.A9','7.E6','8.A1','8.A2','8.B10','9.B1','9.D1']
// var allSheets = ['2.A3','2.A4','2.A9','2.A13','2.F3','3.C6.1','4.A1','4.A2','4.A3','4.A6','4.B11','5.A17','5.D3','5.F6','6.D8','7.A9','8.B10','9.D1']
var allSheets = tempAllSheets;
var sheets = tempAllSheets;
var tableIndex = 0;
// init("2A9");
// init("4C1");
init();
function test(index){
	init(simpleTimeSheets[index].replace(/\./g,""))
}


function searchTables(val){
	word = val.value
	word = word.toUpperCase()
	current = sheets[tableIndex]
	$.getJSON(getJSONPath("words"), function(words){
		sheets = words[word]
		filterSheets(current)
	})

}

function filterSheets(current){
	if(sheets.indexOf(current) != -1){
		tableIndex = sheets.indexOf(current);
		// newTable(tableIndex)
	}else{
		tableIndex = 0;
		newTable(0);
	}

	var select = document.getElementById("tableMenu"); 
	d3.selectAll("#tableMenu option").remove()
	$.getJSON(getJSONPath("titles"), function(titles){
		for(var i = 0; i < sheets.length; i++){
		    var opt = sheets[i];
		    var el = document.createElement("option");
		    el.textContent = titles[opt.replace(/\./g,"")];
		    el.value = opt;
		    select.appendChild(el);
		}
	$("#tableMenu").html($("#tableMenu option").sort(function (a, b) {
	    return a.text == b.text ? 0 : a.text < b.text ? -1 : 1
	}))
	});

}
document.getElementById("searchBox").addEventListener("keydown", function(e) {
    if (!e) { var e = window.event; }
    // e.preventDefault(); // sometimes useful

    // Enter is pressed
    if (e.keyCode == 13) { searchTables(this); }
}, false);
// WORDS = getJSON
d3.select("#left_arrow")
	.on("click", function(){
		if(tableIndex <= 0){
			tableIndex = sheets.length -1;
		}else{
			tableIndex -= 1;
		}
		newTable(tableIndex)
	})
d3.select("#right_arrow")
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

d3.select("#refresh")
	.on("click", function(){
		sheets = allSheets;
		$("#searchBox").val("Search tables for keywords...")
		filterSheets(0)
		newTable(0)
	})
$(document).ready(function() {

   $(window).scroll(function() {
	   var end = d3.select("#testTable thead").node().getBoundingClientRect().width - $(window).width() + 44;       
       var scrollLeftVal = $(this).scrollLeft();
       d3.select("thead")
       	.style("left", -1*scrollLeftVal + 49)
       if(Math.abs(scrollLeftVal-end) <= 220){
       	d3.select(".rightFader")
       		.style("right", -220+Math.abs(scrollLeftVal-end))
       }
       else{
       	  d3.select(".rightFader")
       		.style("right",0)

       }
    });
 });

