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
// var embed = false;

function init(){
	// $.get( getDocURL("2A3"), function(resp) {
	setLayout();
	// if(getQueryVariable("tableID") != null){
	tableID = getQueryVariable("tableID")
	columns = getQueryVariable("columns").split(",")
	chartType = getQueryVariable("chartType")
	
	setTimeout(function(){
		console.log(tableID)
		$.getJSON( getJSONPath(tableID), function(resp){
		  // var data = resp.results[0];
		  var data = resp;
		  console.log(data, tableIndex)
		  // var category = data.category;
		  switch(chartType){
		  	case "lineChart":
		  		drawLineChart(data);
		  		break;
		  	case "timeBar":
	  			drawSingleYearBarChart(data);
		  	case "map":
		  		drawMap(data,columns[0])
		  		break;
		  }
		});
		setTheme();
		// filterSheets(tableIndex)
		yearBarCache = {};
	}, 1000);
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
function checkUnitCompatibility(unit, input, charts){
	d3.selectAll("th.selected")
		.classed("selected", function(th){
			var re = /col\d*/g
			var series = d3.select(this).attr("class").match(re)
			if(input["data"][series]["type"] == unit){
				return true
			} else{
				for(var i = 0; i<charts.length; i++){ removeSeries(charts[i], input["data"][series]["label"]) }
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
function drawMap(input, col){
	var initId = input["data"][col]["label"]
	$('#map').highcharts('Map', {
        title : {
            text : input.title.name
        },
        mapNavigation: {
        	enableMouseWheelZoom: false,
            enabled: true,
            buttonOptions: {
                verticalAlign: 'bottom'
            }
        },
        chart:{
        	marginTop: 50,
        	marginBottom: 70
        },
        colorAxis: {
            // min: 0,
            // max: 100000,
            minColor: "#f0f0f0",
            maxColor: "#1696d2"
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
	d3.select("#map")
		.transition()
		.style("left","400px")
}

function drawLineChart(input){
	var initId = input["data"]["col1"]["label"]
    $('#lineChart').highcharts({
            chart: {
                marginTop: 100,
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
                marginTop: 10,
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
function singleYear(){
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

	d3.select("#lineChart")
		.transition()
		.style("left","400px")
	d3.select("#singleYearBarChart")
		.transition()
		.style("left",2000)
	d3.select("#map")
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

function setTheme(){
	Highcharts.createElement('link', {
	    href: 'http://fonts.googleapis.com/css?family=Lato:400,600',
	    rel: 'stylesheet',
	    type: 'text/css'
	}, null, document.getElementsByTagName('head')[0]);

	var embed = {
                        text: 'Get embeddable chart',
                        onclick: function () {
                        	console.log("embed")
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
function getJSONPath(id){
	return "../data/json/stat_supplement_table-" + id + ".json"
}
var simpleTimeSheets = ['2.A3','2.A4','2.A8','2.A9','2.A13','2.A27','2.A28','2.C1','2.F3','3.C4','3.C6.1','3.E1','4.A1','4.A2','4.A3','4.A4','4.A5','4.A6','4.B1','4.B2','4.B4','4.B11','4.C1','5.A17','5.C2','5.D3','5.E2','5.F6','5.F8','5.F12','5.G2','6.C7','6.D6','6.D8','6.D9','7.A9','7.E6','8.A1','8.A2','8.B10','9.B1','9.D1']
var notok = ['2A27','2A28','2C1','3C4','3E1','4B1','4B2']
var tempAllSheets = ['5.J1','5F1-M0','5.J2','5.J4','5.J8','5.J10','5.J14','6.A6','5.B4','5.D1','6.A1','6.F1','6A2','2A30','5A14-M0','5A14-M1','5A4-M0','5A4-M1','5F1-M1','5F4-M0','5F4-M1','5F4-M2','5H1-M0','5H1-M1','6B5-M0','6B5-M1','6B51-M0','6B51-M1','6C2-M0','6C2-M1','6D4-M0','6D4-M1','6D4-M2','6D4-M3','2.A3','2.A4','2.A8','2.A9','2.A13','2.F3','3.C6.1','4.A1','4.A2','4.A3','4.A4','4.A5','4.A6','4.B4','4.B11','4.C1','5.A17','5.C2','5.D3','5.E2','5.F6','5.F8','5.F12','5.G2','6.C7','6.D6','6.D8','6.D9','7.A9','7.E6','8.A1','8.A2','8.B10','9.B1','9.D1']
var allSheets = ['2.A3','2.A4','2.A9','2.A13','2.F3','3.C6.1','4.A1','4.A2','4.A3','4.A6','4.B11','5.A17','5.D3','5.F6','6.D8','7.A9','8.B10','9.D1']
var sheets = tempAllSheets;
var tableIndex = 0;
// init("2A9");
// init("4C1");
init();
function test(index){
	init(simpleTimeSheets[index].replace(/\./g,""))
}


