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



var allSheets = tempAllSheets;
var sheets = tempAllSheets;
var TOTAL_TABLES = sheets.length
var tableIndex = 0;
// init("2A9");
// init("4C1");
init();

var yearBarCache;
var MONTHNAMES = ["January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
    ]
var MONTHABBREVS = ["Jan", "Feb", "Mar", "Apr", "May", "June",
  "Jul", "Aug", "Sept", "Oct", "Nov", "Dec"
    ]

var IE = false;
var FIG2, FIG3, FIG9,FIG7,FIG10,FIG4, FIG92, MOBILE, INDEX;
// var embed = false;
var global_data;


var exportParams = {}

function init(){
var tableIndex = 0
var allSheets = tempAllSheets;
var sheets = tempAllSheets;
var TOTAL_TABLES = sheets.length
var tableIndex = 0;
FIG2 = (sheets[tableIndex] == "2")
FIG9 = (sheets[tableIndex] == "9-1")
FIG92 = (sheets[tableIndex] == "9-2")
FIG7 = (sheets[tableIndex] == "7")
FIG10 = (sheets[tableIndex] == "10")
FIG4 = (sheets[tableIndex] == "4")
FIG3 = (sheets[tableIndex] == "3")
INDEX = sheets[tableIndex]
if(FIG92){
	MOBILE = d3.select("#mobileTest").style("display") == "block"
}
setLayout();
	setTimeout(function(){

		$.getJSON( getJSONPath(sheets[tableIndex].replace(/\./g,"_")), function(resp, err){
		  // var data = resp.results[0];
		  var data = resp;
		  global_data = data;
		  
		  
		  // var category = data.category;
		  switch(category){
		  	case "lineChart":
		  		// if(!FIG10){
	  			var years = data.data.years.series;
	  			drawScrubber(getYear(years[0]), getYear(years[years.length-1]));

		  		drawLineChart(data);
		  		multiYear();
		  		showScrubber();
				var lineChart = $('#lineChart').highcharts();
				var lineType;
				if(FIG10){
					lineType = "spline"
				}
				else if(FIG4){
					lineType = "areaspline"
				}else{
					lineType = "line"
				}

		  		for(var i = 0; i< columns.length; i++){
		  			var series = columns[i]
					var lineData = (FIG10 || FIG4) ? generateSpline(data["data"][series]["xvals"], data["data"][series]["series"], series) : generateTimeSeries(data.data.years.series, data["data"][series]["series"])
					
		  			var seriesID = data["data"][series]["label"]

	  				lineChart.addSeries({
						id: series,
		            	name: seriesID,
		            	type: lineType,
		            	data: lineData,
		            	fillOpacity:.1
		            	// index: parseInt(series.replace("col","")-1)
					});

		  		}
		  			if(FIG2){
						lineChart.addSeries({
						id: "Recessions",
		            	name: "Recessions",
		            	type: "area",
		            	color: "#cfe8f3"

					});
					}
				if(!FIG10 && !FIG4){
		  			changeYears(inYears[0],inYears[1])
		  		}
		  		break;
		  	case "timeBar":
		  		var years = data.data.years.series;
		  		drawScrubber(getYear(years[0]), getYear(years[years.length-1]));
		  		drawLineChart(data);
		  		var lineChart = $('#lineChart').highcharts();

		  		for(var i = 0; i< columns.length; i++){
		  			var series = columns[i]
		  			var seriesID = data["data"][series]["label"]
	  				lineChart.addSeries({
						id: series,
		            	name: seriesID,
		            	data: generateTimeSeries(data.data.years.series, data["data"][series]["series"])
					});
		  		}
		  		drawSingleYearBarChart(data, columns[0], inYears[1]);

		  		for(var i = 1; i< columns.length; i++){
			  			var series = columns[i]
			  			var seriesID = data["data"][series]["label"]
					    var singleYearBarChart = $('#singleYearBarChart').highcharts();

						singleYearBarChart.series[0].addPoint(generateBarFromYear(data.data.years.series, data["data"][series]["series"], inYears[1]))

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
    			}



		  		singleYear();
		  		showScrubber();
		  		break;
		  	case "map":
		  	  	exportParams.chartType = "map"
		  		drawMap(data,columns[0])
		  		hideScrubber();
		  		break;
		  	case "stackedBar":
		  		exportParams.chartType = "stackedBar";
		  		drawStackedBar(data)
		  		break;
		  	case "barChart":
		  		exportParams.chartType = "barChart";
				drawBar(data,columns[0]);
		  	  	for(var i = 1; i< columns.length; i++){
		  	  		var barChart = $('#barChart').highcharts();

		  			var series = columns[i]
		  			var seriesID = data["data"][series]["label"]
		  			barChart.addSeries({
						id: series[0],
		            	name: seriesID,
                		data: data["data"][series]["series"]
					})

		  		}
		  		hideScrubber();
		  		break;
		  }
		});
		setTheme();
		yearBarCache = {};
	}, 1000);
}

function getYear(year){
	if(year == "Before 1975"){
		return 1957
	}
	else if(typeof(year) == "number"){
		return year;
	}
	else if(year.indexOf("-") != -1){
		var ys = year.split("-")
		if(ys[0].search(/\d/g) != -1){
			return parseFloat(ys[0].replace(/[^\d]/g,""))
		} else{ return parseFloat(ys[1].replace(/[^\d]/g,""))}
	} else{ return parseFloat(year.replace(/[^\d]/g,""))}
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


function generateSpline(xval, column, ser){
	var series = [];
	for(var i = 0; i< xval.length; i++){
		var y = (column[i] == false || isNaN(column[i])) ? null : column[i];
//ignore "Total" row in tables such as 5.B4
		if(xval[i] == false){
			continue
		}
		else if(typeof(xval[i]) == "number"){
//simple case, like "2014"
			var enabled = true;
			if(xval[i] == 5.3 && y == 7.5 && ser == "col2" || xval[i] == 4.2 && y == 7.9 && ser == "col3" || xval[i] == 9.3 && y == 17.8 && ser == "col4"){
				enabled = false;
			}
			var color;
			if(xval[i] == 5.3 && y == 7.5 && ser == "col2"){
				color = "#1696d2"
			}
			else if(xval[i] == 4.2 && y == 7.9 && ser == "col3"){
				color = "#062635"
			}
			else if(xval[i] == 9.3 && y == 17.8 && ser == "col4"){
				color = "#eb3f1c"
			}
			else{ color = null}

			series.push(
				{
					"x": xval[i],
					"y": y,
	                marker: {
	                    states: {
	                        hover: {
	                            enabled: enabled
	                        }
	                    }
	                },
	                "color" : color

				}
				);
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
	var marginBottom, marginLeft;
	if(FIG3){
		marginBottom = 40;
	}
	else if(FIG92 && MOBILE){
		marginBottom = 220;
	}
	else if(labels){
		marginBottom = 80;
	}else{ marginBottom = 70}

	if(FIG3){
		marginLeft = 10
	}
	else if(FIG92 && MOBILE){
		marginLeft = 120;
	}
	else if(FIG10){
		marginLeft = 100;
	}
	else if(labels){
		marginLeft = 60;
	}else{ marginLeft = 80}
	// var marginLeft = (labels) ? 60 : 80;
	var marginTop = (FIG92 && !MOBILE) ? 50 : 120;
	var legend = (FIG92) ? MOBILE : true;
	var initId = input["data"][col]["label"]
        $('#barChart').highcharts({
            chart: {
                marginTop: marginTop,
                marginBottom: marginBottom,
                marginLeft: marginLeft,
                type: 'column'

            },
            plotOptions: {
            	column:{
            		colorByPoint: FIG92
            	},
                series: {
    	            pointPadding: 0,
		            groupPadding: 0.2,
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
                tickWidth: 0,
                tickInterval: 0,
                categories: input["data"]["categories"]["series"],
                plotLines: [{
                    value: 0,
                    width: 0
                        }],
                labels: {
                	useHTML: FIG3,
                    step: 0,
                    x: 0,
                    y: 20
                }
            },
            yAxis: {
                title: {
                    text: ''
                },
                gridLineWidth: '0',
                labels: {
                	enabled: false,
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
                enabled: false,
                text: "<a href = \"https://www.ssa.gov/policy/docs/statcomps/supplement/\">These data are from the Social Security Administration's <em>Annual Statistical Supplement, 2014</em>. The parenthetical numbers with the titles are retained from the supplement for reference.</a>",
                href: "https://www.ssa.gov/policy/docs/statcomps/supplement/",
                style:{
                		color: '#1696d2',
                		fill: '#1696d2'
                },
                title: false
            },
            legend: {
                enabled: legend,
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

        }, function (chart) { // on complete
	        	if(FIG92){
		      		chart.renderer.text('{', 1090, 349)
		            .attr({
	    	            rotation: 90,
	    	            scaleX: 1,
	    	            scaleY: 3.2
		            })
		        	.css({
		        		    'fill': '#ccc',
		        		    'font-size': '100px',
		        		    'font-weight': '100'
		        	})
		            .add();

		      		chart.renderer.text('Beneficiary no longer meets medical criteria', 300, 339)
		        	.css({
	        		    'fill': '#333',
	        		    'font-size': '14px',
	        		    'font-weight': 'bolder'
		        	})
		            .add();
	        	}
        	}
        );
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
		.style("left","0px")
}


function drawStackedBar(input){

    var ugly = ['', 'DI', '', 'non-DI',  ''];
    var cats = ugly.concat(ugly);
    var zeroes = [];
    cats.forEach(function () {zeroes.push(0);}); 


	// var col = (typeof(input.default) != "undefined") ? input.default : "col1"
	var labels = true;
	var marginBottom, marginLeft;
	if(FIG92 && MOBILE){
		marginBottom = 220;
	}
	else if(labels){
		marginBottom = 60;
	}else{ marginBottom = 110}
	if(FIG92 && MOBILE){
		marginLeft = 120;
	}
	else if(labels){
		marginLeft = 60;
	}else{ marginLeft = 80}
	// var marginLeft = (labels) ? 60 : 80;
	var marginTop = (FIG92 && !MOBILE) ? 50 : 120;
	var legend = (FIG92) ? MOBILE : true;
	var initId = "col1"
    var options = {
            chart: {
                marginTop: marginTop,
                marginBottom: marginBottom,
                marginLeft: marginLeft,
                type: 'column'

            },
            plotOptions: {
            	column:{
            		colorByPoint: FIG92,
            		stacking: 'normal',
	                groupPadding: 0.10

            	},
                series: {
                    marker: {
                        enabled: true
                    },

                    dataLabels: {
                        enabled: false,
                        align: 'center'
                        // formatter: function (){
                        // 	if(this.y == false || this.y==null){
                        // 		return null
                        // 	}else{
                        // 		return formatLabel(this.x, this.y, input, col, "tooltipBar")
                        //     }
                        // }
                    }
                }
            },
            title: {
                text: "<div class = \"chartSubtitle\">" + input.title.category + "</div>" + "<div class = \"chartTitle\">" + input.title.name + "</div>"
            },
            xAxis: [

					{
							categories: cats,
							tickWidth: 0
					},
            		{
		                labels:{
                    	useHTML:true
        			},
			                // gridLineWidth: '0',
			                // lineWidth: 2,
			                // tickInterval: 0,
			                categories:  ['Ages 31&ndash;49', 'Ages 60&ndash;64'],
       	        	          lineColor:'#ffffff',
        		              tickWidth: 0,
			                // plotLines: [{
			                //     value: 0,
			                //     width: 0
			                //         }],
			                // labels: {
			                //     step: 0,
			                //     x: 0,
			                //     y: 20
			                // }
			            },
            ],
            yAxis: {
            	max: 100,
                title: {
                    text: ''
                },
                labels: {
                	formatter: function(){
                		return this.value + "%"
                	}
                    // format: '${value:.0f}'
                }
            },
            tooltip: {
            	enabled: true,
            	useHTML: true,
                formatter: function () {
                	return '<b>' + this.x + '</b><br/>' +
                    this.series.name + ' quintile: ' + this.y + '%<br/>'

                // 	if(this.y == false || this.y==null){
                //         return null
                //     }else{
                //     	return formatLabel(this.x, this.y, input, this.series.userOptions.id, "tooltipBar")
                //     }
                }
            },
            credits: {
                enabled: false,
                text: "<a href = \"https://www.ssa.gov/policy/docs/statcomps/supplement/\">These data are from the Social Security Administration's <em>Annual Statistical Supplement, DI</em>. The parenthetical numbers with the titles are retained from the supplement for reference.</a>",
                href: "https://www.ssa.gov/policy/docs/statcomps/supplement/",
                style:{
                		color: '#1696d2',
                		fill: '#1696d2'
                },
                title: false
            },
            legend: {
                enabled: legend,
                floating: 'true',
                align: 'left',
                verticalAlign: 'left',
                layout: 'horizontal',
                borderWidth: 0,
                itemDistance: 9,
                y: 40
            },
            series: 
            [
			            {
				            name: 'Highest',
				            color: '#333333',
				            data: [4, 7],
				            stack: 'DI',
				            xAxis: 1            
			    		}, 
			            {
				            name: 'Fourth',
				            color: '#0a4c6a',
				            data: [9, 14],
				            stack: 'DI',
				            xAxis: 1            
			    		}, 
			            {
				            name: 'Middle',
				            color: '#1696d2',
				            data: [14, 18],
				            stack: 'DI',
				            xAxis: 1            
			    		}, 
			            {
				            name: 'Second',
				            color: '#73bfe2',
				            data: [26, 27],
				            stack: 'DI',
				            xAxis: 1            
			    		}, 
			    		{
				            name: 'Lowest',
				            color: '#cfe8f3',
				            data: [47, 33],
				            stack: 'DI',
		                    xAxis: 1            
			            
			        	},



			            {
				            name: 'Highest',
				            color: '#333333',
				            data: [20, 22],
				            showInLegend: false,
				            stack: 'non-DI',
				            xAxis: 1            
			    		}, 
			            {
				            name: 'Fourth',
				            color: '#0a4c6a',
				            data: [20, 21],
				            showInLegend: false,
				            stack: 'non-DI',
				            xAxis: 1            
			    		}, 
			            {
				            name: 'Middle',
				            color: '#1696d2',
				            data: [20, 20],
				            showInLegend: false,
				            stack: 'non-DI',
				            xAxis: 1            
			    		}, 
			        	{
				            name: 'Second',
				            color: '#73bfe2',
				            data: [20, 19],
				            showInLegend: false,
				            stack: 'non-DI',
		                    xAxis: 1            
			        	},
			        	{
				            name: 'Lowest',
				            data: [19, 18],
				            color: '#cfe8f3',
				            showInLegend: false,
				            stack: 'non-DI',
				            xAxis: 1            
			        	},
			        	{
				            name: '',
				            data: zeroes,
				            showInLegend: false,
				            stack: 'non-DI',
			        	}
        ]

        }
    var onLegendClick= function (event) {
	     	    		                	var myname = this.name;
	     	    		                	var myvis  = !this.visible;
	     	    		                	this.chart.series.forEach( function (elem) {
	     	    		                		if (elem.name == myname) {
	     	    		                			elem.setVisible(myvis);
	     	    		                		}
	     	    		                	});
	     	    		                	return false;
	     	    		                }
	     	    		            
    
    options.series.forEach(function (serie) {
        serie.events = { legendItemClick : onLegendClick} ;
    });

    $('#barChart').highcharts(options)
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
		.style("left","0px")
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
        		useHTML: true,
                formatter: function () {
                	// if(this.y == false || this.y==null){
                        // return null
                    // }else{
                    	return formatLabel(this.key, this.point.value, input, col, "tooltipMap")
                    // }
                }
        },
        credits: {
            enabled: false,
            text: "<a href = \"https://www.ssa.gov/policy/docs/statcomps/supplement/\">These data are from the Social Security Administration's <em>Annual Statistical Supplement, 2014</em>. The parenthetical numbers with the titles are retained from the supplement for reference.</a>",
            href: "https://www.ssa.gov/policy/docs/statcomps/supplement/",
            style:{
            		color: '#1696d2',
            		fill: '#1696d2'
            },
            title: false
        },
        series : [{
            data : input["data"][col]["series"],
            mapData: Highcharts.maps['countries/us/us-all'],
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
            data: Highcharts.geojson(Highcharts.maps['countries/us/us-all'], 'mapline'),
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
		.style("left","0px")
}


function drawLineChart(input){
	var initId = input["data"]["col1"]["label"]
	var axisType = (FIG10 || FIG4) ? "linear" : "datetime"
	var crosshairs = (FIG10) ? null : 
				{
			        color: 'rgb(159,159,159)',
			        dashStyle: 'solid'
			    }
	var mTop = (FIG7) ? 120 : 90;
	var xMin = (FIG10) ? 2 : 0;
	var xMax = (FIG10) ? 10 : null;
	var yMax;
	if(FIG4){
		yMax = 100
	}
	else if(FIG10){
		yMax = 20
	}else{ yMax = null}

	var yText = (FIG10) ? "Number of DI applications per 1,000 workers with taxable earnings" : "";
	var xText = (FIG10) ? "Unemployment rate" : "";
	var plotBands = (FIG2) ? [
				{ 
	                color: '#cfe8f3',
	                from: Date.UTC(1991, 0, 1),
	                to: Date.UTC(1991, 2, 1)
	            },
				{ 
	                color: '#cfe8f3',
	                from: Date.UTC(2001, 2, 1),
	                to: Date.UTC(2001, 9, 1)
	            },
				{ 
	                color: '#cfe8f3',
	                from: Date.UTC(2007,11, 1),
	                to: Date.UTC(2009, 5, 1)
	            }
            ]
            : []
    var plotLines = (FIG4) ? [{
                    value: 0,
                    width: 0
                        },

                    {
                    	value: 1000,
                    	width: 1,
                    	color: "#333333"
                    }

                    ]
                        : [{
                    value: 0,
                    width: 0
                        }]
        var yLines = (FIG4) ? [{
        	value: 100,
        	width: 2,
        	color: "#333333",
        	dashStyle: 'shortdash'
        }]
        : []
        var marginBottom = (FIG10) ? 100 : 50;
    $('#lineChart').highcharts({
            chart: {
                marginTop: mTop,
                marginBottom: marginBottom
            },
            plotOptions: {
                series: {
                    marker: {
                        enabled: !FIG4
                    },
                    events:{
                    	 legendItemClick: function () {
                    	 	if(FIG2 && this.name == "Recessions"){
                    	 		return false;
                    	 	}
                    	 }
                    }
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
                title: {
                    text: xText
                },
            	min: xMin,
            	max: xMax,
        	    plotBands: plotBands,

                gridLineWidth: '0',
                lineWidth: 2,
                plotLines: plotLines,
                type: axisType,
                minRange: 1,
                labels: {
                	formatter: function(){
                		if(FIG10){
                			return this.value + "%"
                		}
                		else if(FIG4){
                			var tmp = d3.format('$,.0f')
                			return tmp(this.value);
                		}else{
                			var d = new Date(this.value)
                			return d.getUTCFullYear()
                		}
                	}
                }
            },

            yAxis: {
            	plotLines: yLines,
            	min: 0,
            	max: yMax,
                title: {
                    text: yText
                },
                labels: {
	            	useHTML: false,
                	formatter: function(){
	                	if(FIG10){
	    					var tmp = d3.format(".1f")
	    					return tmp(this.value)    		
    	            	}else{
                			return formatLabel(this, null, input, this.chart.series[0].userOptions.id, "label")
                		}
                	}
                    // format: '${value:.0f}'
                }
            },
            tooltip: {
            	useHTML: true,
			    crosshairs: crosshairs,
                shared: false,
                valueDecimals: 0,
                formatter: function () {
                	if(this.y == false || this.y==null){
                        return null
                    }else{
                    	var arrayOfSeries = this;
                    	return formatLabel(this.x, this.y, input, this.series.userOptions.id, "tooltipLine", this.point.index)

                    }
                }
            },
            // credits: {
            //     enabled: true,
            //     text: "<a href = \"https://www.ssa.gov/policy/docs/statcomps/supplement/\">These data are from the Social Security Administration's <em>Annual Statistical Supplement, 2014</em>. The parenthetical numbers with the titles are retained from the supplement for reference.</a>",
            //     href: "https://www.ssa.gov/policy/docs/statcomps/supplement/",
            //     style:{
            //     		color: '#1696d2',
            //     		fill: '#1696d2'
            //     },
            //     title: false
            // },
            legend: {
            enabled: !FIG9,
            align: 'top',
            verticalAlign: 'top',
            layout: 'horizontal',
            // width: 140,
            // useHTML: true,
            x: 0,
            y: 20,
                borderWidth: 0,
                itemDistance: 9,
            },

        // series: [{
        // 	id: "col1",
        //     name: initId,
        //     data: generateTimeSeries(input.data.years.series, input.data.col1.series)
        // }
        // ]
    }    , function (chart) { // on complete
    	if(FIG10){
      		chart.renderer.text('2010s<br>Over the last few years, the unemployment<br>rate and applications have fallen together.', 335, 105)
        // ["#1696d2", "#062635", "#eb3f1c","#370b0a"]
        	.css({
        		    'fill': '#370b0a',
        		    'font-weight':'bolder'
        	})
            .add();
      		chart.renderer.text('Great Recession<br>During the Great Recession in the<br>late 2000s, both the unemployment<br>rate and share of DI applications<br>surged.', 495, 205)
        // ["#1696d2", "#062635", "#eb3f1c","#370b0a"]
        	.css({
        		    'fill': '#eb3f1c',
        		    'font-weight':'bolder'
        	})
            .add();
      		chart.renderer.text('2000s<br>Unemployment and applications<br>tracked each other during much<br>of the 2000s.', 145, 295)
        // ["#1696d2", "#062635", "#eb3f1c","#370b0a"]
        	.css({
        		    'fill': '#eb3f1c',
        		    'font-weight':'bolder'
        	})
            .add();
      		chart.renderer.text('1990s<br>Unemployment rose during the early 1990s<br>recession, taking applications with it, but<br>when unemployment fell, applications per<br>1,000 workers fell slightly.', 255, 430)
        // ["#1696d2", "#062635", "#eb3f1c","#370b0a"]
        	.css({
        		    'fill': '#062635',
        		    'font-weight':'bolder'
        	})
            .add();
      		chart.renderer.text('1980s<br>As the unemployment rate fell<br>in mid- and late-1980s, the<br>share of applications remained<br>unchanged, then fell in 1988<br><span style = "margin-left:20px">and 1989.</span>', 520, 402)
        // ["#1696d2", "#062635", "#eb3f1c","#370b0a"]
        	.css({
        		    'fill': '#1696d2',
        		    'font-weight':'bolder'
        	})
            .add();
      		chart.renderer.text('1980', 445, 309)
        // ["#1696d2", "#062635", "#eb3f1c","#370b0a"]
        	.css({
        		    'fill': '#333333'
        	})
            .add();
      		chart.renderer.text('2013', 450, 181)
        // ["#1696d2", "#062635", "#eb3f1c","#370b0a"]
        	.css({
        		    'fill': '#333333'
        	})
            .add();
         }
    else if(FIG4){
      		var lbl = chart.renderer.label('More than half of women beneficiaries<br>and about a third of men had benefits<br>below $1,000 per month.', 80, 105, null, null, null, true)
        // ["#1696d2", "#062635", "#eb3f1c","#370b0a"]
        	.css({
        		    'fill': '#333',
        		    'fontWeight':'bolder',
        		    'fontSize': '14px',
        		    'textAlign': 'right'
        	})
            .add();

            $("span:contains(More)").css("text-align","right")


    }

    });

}
function getRect(month,day,year){

}
function generateBarFromYear(years, column, year){
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
function drawSingleYearBarChart(input, col, year){
	var initId = input["data"][col]["label"]
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
                text: "<div class = \"chartSubtitle\">" + input.title.category + "</div>" + "<div class = \"chartTitle\">" + input.title.name + " :: " + String(year) + "</div>"
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
                text: "<a href = \"https://www.ssa.gov/policy/docs/statcomps/supplement/\">These data are from the Social Security Administration's <em>Annual Statistical Supplement, 2014</em>. The parenthetical numbers with the titles are retained from the supplement for reference.</a>",
                href: "https://www.ssa.gov/policy/docs/statcomps/supplement/",
                style:{
                		color: '#1696d2',
                		fill: '#1696d2'
                },
                title: false
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
            }
            ,
            series:[{
            			id: "col1",
                    	name: initId,
                    	data: [generateBarFromYear(input.data.years.series, input.data.col1.series, String(year))]
                    }]

        });
		yearBarCache[initId] = [input.data.years.series, input["data"][col]["series"]]
		// yearBarCache[initId] = generateTimeSeries(input.data.years.series, input.data.col1.series)
		yearBarCache["id"] = col
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
		return "data/words.json"
	}
	else if (id == "titles"){
		return "data/titles.json"
	}else{
		return "data/json/feature_fig" + id + ".json"
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
		.style("left","0px")
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


	d3.select("#lineChart")
		.transition()
		.style("left","0px")
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
    
    if(category == "timeBar"){
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
		.style("left",10)
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
                			var url = "http://apps.urban.org/features/social-security-data-tool/feature/fig"
                			url += INDEX + ".html"
                			var if_height = (FIG10) ? 700 : 500
                			return "&lt;iframe frameborder=\"0\" height=\"" + if_height + "px\" marginheight=\"0\" scrolling=\"no\" src=\"" + url + "\" width=\"100%\" style = \"max-width:700px\"&gt;&lt;/iframe&gt"
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
	var chartHeight = (FIG10) ? 700 : 500;
	var colors;
	if(FIG10){
		colors = ["#1696d2", "#062635", "#eb3f1c","#370b0a"]
	}
	else if(FIG92){
		colors = ["#1696d2","#1696d2", "#fdbf11","#fdbf11","#fdbf11","#1696d2"]
	}else{
		colors = ["#1696d2", "#fdbf11", "#062635", "#eb3f1c", "#55b748","#ec008b", "#db2b27"]
	}
	Highcharts.theme = {
	    colors: colors,
	    chart: {
	        backgroundColor: "#ffffff",
	        style: {
	            fontFamily: "Lato, sans-serif"
	        },
	        marginTop: 0,
	        marginBottom: 40,
	        height: chartHeight
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
            sourceWidth: 745,
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
	            fillOpacity: 0.1
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

function formatLabel(x, y, input, col, type, ind){
	
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
		var catLabel = (FIG7) ? input["data"][col]["label"] + "<br>": ""
		var date = new Date(x)
		var full = date.getFullYear()
		if(FIG10){
			var tmp = d3.format(".1f")
			var colNum = parseInt(col.replace("col",""))
			var fudge = (colNum == 1) ? 0 : 1;
			var decade = colNum*10 + 1970-fudge
			return (decade + ind) + "<br>" + tmp(x) + "%" + " unemployed" + "<br>" + y + " applications per 1,000 workers"
		}
		else if(FIG4){
			if(x == 300){
				return "Less than $300.00 : " + y + "%";
			}
			else if(x == 2249.9){
				return "$2,200 or more : 100%";
			}else{
				var money = d3.format('$,.2f')
				return money(x-49.9) + "&ndash;" + money(x) + " : " + y + "%"
			}
		}
		else if (FIG2){
			var tmp = d3.format(".1f")
			return full + ": " + tmp(y)
		}
		else if(FIG9){
			var tmp = d3.format(".0f")
			return full + ": " + tmp(y)
		}
		else{
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
					return catLabel  + full + ": " + y + "%"
					break;

			}
		}
	}
	else if(type == "tooltipBar"){
		if(FIG92){
			var tmp = d3.format(".0f")
			return tmp(y) + ",000"
		}
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

// pymChild = new pym.Child({ renderCallback: init });


(function() {

  window.addEventListener("resize", resizeThrottler, false);

  var resizeTimeout;
  function resizeThrottler() {
    // ignore resize events as long as an actualResizeHandler execution is in the queue
    if ( !resizeTimeout ) {
      resizeTimeout = setTimeout(function() {
        resizeTimeout = null;
        actualResizeHandler();
     
       // The actualResizeHandler will execute at a rate of 15fps
       }, 300);
    }
  }

  function actualResizeHandler() {
	if(FIG92){
		MOBILE = d3.select("#mobileTest").style("display") == "block"
	}
	init()
  }

}());


