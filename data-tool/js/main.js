var yearBarCache;

function init(){
	$.get( getDocURL("2A3"), function(resp) {
	  var data = resp.results[0];
	  var category = data.category;
	  switch(category){
	  	case "timeSeries":
	  		drawLineChart(data);
  			drawSingleYearBarChart(data);
	  		drawTable(data);
	  		break;
	  }
	});
	setTheme();
	drawScrubber();
	yearBarCache = {};
}
function drawTable(input){
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
			//th -> tr -> thead -> table
			var table = th.node().parentNode.parentNode.parentNode
			var tableID = d3.select(table).attr("id")
			$.get( getDocURL(tableID) , function(resp) {
		  		var data = resp.results[0];
		  		var seriesID = data["data"][series]["label"]
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
				} else{
					removeSeries(lineChart, seriesID)
					removeSeries(singleYearBarChart, seriesID)
					th.classed("selected", false)
				}
			});
		});
	formatTable("testTable")
	d3.select("th.col1").classed("selected",true)
}
function resizeHeader(header, bodyCells){
	var oldWidth = parseFloat(d3.select(header).style("width").replace("px",""));
	var headerRemainder = parseFloat(header.getBoundingClientRect().width) - oldWidth;
	var bodyWidth = 0;
	for(var i = 0; i < bodyCells.length; i++){
		bodyWidth += parseFloat(bodyCells[i].getBoundingClientRect().width);
	}
 	var w =  bodyWidth - headerRemainder;
//If header is longer than body cell, resize bodycell's width.
 	if(oldWidth > w && bodyCells.length == 1){
 		d3.select(bodyCells[0]).style("width", oldWidth)
 		d3.select(header).style("width", oldWidth)

 	}
 //otherwise, resize header to width of bodycell(s)
 	else{
		d3.select(header).style("width", w)
	}
	return false
}
function formatTable(tableID){
//draw sortArrows
	d3.selectAll("#" + tableID + " thead th")
		.append("i")
		.attr("class","sortArrow")

//Make table sortable using mottie's jquery tablesorter, bind click events to sort arrows
	$(function(){
	  $("#" + tableID + " table").tablesorter({
	  		selectorSort: "i"
	  });
	});

//Determine which columns fall under which headers, and resize width to width of child columns
	var rows = d3.selectAll("#" + tableID + " thead tr")[0]
	var bodyRow = d3.select("#" + tableID + " tbody tr").selectAll("td")
	var holder = Array.apply(null, Array(rows.length)).map(function(){return bodyRow[0].slice()});
	for(var i = 0; i < rows.length; i++){
		var headers = d3.select(rows[i]).selectAll("th")
		headers[0].forEach(function(h){
			var colspan = (d3.select(h).attr("colspan") == null) ? 1 : parseInt(d3.select(h).attr("colspan"));
			var rowspan = (d3.select(h).attr("rowspan") == null) ? 1 : parseInt(d3.select(h).attr("rowspan"));
			resizeHeader(h, holder[i].splice(0,colspan))
			if(rowspan != 1){
				for(j = i+1; j + i < rowspan; j++ ){
					holder[j].splice(0,colspan)
				}
			}
		})			
	}

//Determine height of thead, and set initial position of tbody to be just under thead
	var headHeight = d3.select("#" + tableID + " thead").node().getBoundingClientRect().height
	var tablePos = parseInt(d3.select("#tableContainer").style("margin-top").replace("px",""))
	d3.select("#" + tableID + " tbody").style("top", (headHeight + tablePos) + "px")

//unbind charting to sort arrows (clicking arrow does not add/remove series)
	d3.selectAll(".sortArrow").on("click", function(){
			d3.event.stopPropagation()
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
		var y = (column[i] == false) ? null : column[i];
		if(typeof(year[i]) == "number"){
			series.push([Date.UTC(year[i], 0, 1), y]);
		}else{
			var years = year[i].split("–");
			series.push([Date.UTC(parseInt(years[0]), 0, 1), y]);
			series.push([Date.UTC(parseInt(years[1]), 0, 1), y]);
		}
	}
	return series;
}
function drawLineChart(input){
    $('#lineChart').highcharts({
            chart: {
                marginTop: 100,
                marginBottom: 40

            },
            plotOptions: {
                series: {
                    marker: {
                        enabled: true
                    }
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
        	id: "Annual maximum taxable earnings (dollars) :: OASDI",
            name: "Annual maximum taxable earnings (dollars) :: OASDI",
            data: generateTimeSeries(input.data.years.series, input.data.col1.series)
        }
        ]
    });
}
function generateBarFromYear(years, column, year){
	var series = [];
	for(var i = 0; i< years.length; i++){
		if(typeof(years[i]) == "number"){
			series.push([Date.UTC(years[i], 0, 1), column[i]]);
		}else{
			var range = years[i].split("–");
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
                categories: ["Annual maximum taxable earnings (dollars) :: OASDI"],
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
                    return '' +
                        this.x + ': $' + this.y + ' million';
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
            			id: "Annual maximum taxable earnings (dollars) :: OASDI",
                    	name: "Annual maximum taxable earnings (dollars) :: OASDI",
                    	data: [generateBarFromYear(input.data.years.series, input.data.col1.series, "2014")]
                    }
                  ]

        }); //end chart 6
		yearBarCache[input.title.id.replace(".","") + "_" + "col1"] = [input.data.years.series, input.data.col1.series]
}
function removeSeries(chart, id){
	// var chart = $('#lineChart').highcharts();
	if(chart.renderTo.id == "singleYearBarChart"){
		// console.log(chart.series[0].data)
		var index = chart.xAxis[0].categories.indexOf(id)
		chart.series[0].removePoint(index)

		$.each(chart.series[0].data, function(k,v){
			v.update({
				x: k
			});
		});

		var categories = chart.xAxis[0].categories
		categories.splice(index, 1)
		// chart.xAxis[0].setCategories(categories)
		// console.log(chart.xAxis[0].categories)
		// console.log(categories)
		chart.xAxis[0].setCategories(categories)
		chart.redraw();
		// for(var j=0; j<categories.length; j++){
			
		// 	chart.series[0].data[j].category = categories[j]
		// }




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
		.style("left",0)
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
		.style("left",0)
	d3.select("#singleYearBarChart")
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

function setTheme(){
	Highcharts.createElement('link', {
	    href: 'http://fonts.googleapis.com/css?family=Lato:400,600',
	    rel: 'stylesheet',
	    type: 'text/css'
	}, null, document.getElementsByTagName('head')[0]);

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
	        enabled: false
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
	                enabled: false,
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

init();
