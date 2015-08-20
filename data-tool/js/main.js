function init(){
	$.get( getDocURL("2A3"), function(resp) {
	  var data = resp.results[0];
	  var category = data.category;
	  switch(category){
	  	case "timeSeries":
	  		drawLineChart(data);
  			drawBarChart(data);
	  		drawTable(data);
	  		break;
	  }
	});
	setTheme();
	drawScrubber();
}
function drawTable(input){
	d3.select("#testTable")
		.append("table")
		.attr("class", "pure-table")
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
			var series = th.attr("class").replace(" ","").replace("selected","")
			var chart = $('#lineChart').highcharts();
			//th -> tr -> thead -> table
			var table = th.node().parentNode.parentNode.parentNode
			var tableID = d3.select(table).attr("id")
			$.get( getDocURL(tableID) , function(resp) {
		  		var data = resp.results[0];
		  		if( !selected ){
					chart.addSeries({
						id: getId(data) + "_" + series,
		            	name: series,
		            	data: generateTimeSeries(data.data.years, data["data"][series])
					});
					th.classed("selected", true)
				} else{
					removeSeries(chart, getId(data) + "_" + series)
					th.classed("selected", false)
				}
			});
		});
	d3.select("th.col1").classed("selected",true)
}
function generateTimeSeries(year, column){
	var series = [];
	for(var i = 0; i< year.length; i++){
		if(typeof(year[i]) == "number"){
			series.push([Date.UTC(year[i], 0, 1), column[i]]);
		}else{
			var years = year[i].split("–");
			series.push([Date.UTC(parseInt(years[0]), 0, 1), column[i]]);
			series.push([Date.UTC(parseInt(years[1]), 0, 1), column[i]]);
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
                    format: '${value:,.0f}'
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
        	id: input.title.id.replace(".","") + "_" + "col1",
            name: "col1",
            data: generateTimeSeries(input.data.years, input.data.col1)
        }
        ]
    });
}
function generateBarFromYear(years, column, year){
	var series = generateTimeSeries(years, column);
	for(var i = 0; i < series.length; i++){
		if(series[i][0] == Date.UTC(parseInt(year), 0, 1)){
			return series[i][1]
		}
	}
	return false;
}
function drawBarChart(input){
        $('#barChart').highcharts({
            chart: {
                marginTop: 10,
                marginBottom: 40,
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
                        formatter: function () {
                            return '' + '$' + this.y + ' million';
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
                categories: ['col1', 'col2'],
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
                    name: '',
                    data: [generateBarFromYear(input.data.years, input.data.col1, "1993"), generateBarFromYear(input.data.years, input.data.col2, "1993")]
                    }
                                          ]

        }); //end chart 6
}
function removeSeries(chart, id){
	// var chart = $('#lineChart').highcharts();
	for(var i = 0; i<chart.series.length; i++){
		var ser = chart.series[i];
		if(ser.options.id == id){
			ser.remove();
		}
	}
}
function getId(doc){
	return doc.title.id.replace(".","")
}
function getDocURL(id){
	return "http://localhost:27080/test/tables/_find?criteria=" + encodeURIComponent('{"title.id":"' + id + '"}')
}
function changeYears(start, end){
	var chart = $('#lineChart').highcharts();
    chart.xAxis[0].setExtremes(
            Date.UTC(parseInt(start), 0, 1),
            Date.UTC(parseInt(end), 0, 1)
    );

}
function drawScrubber(){
	var width = 240,
	    height = 45,
	    radius = 7,
		lowerBound = 1937,
		upperBound = 2014,
		margin = {top: 0, right: 4, bottom: 0, left: 4};

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
	    .attr("cx", function(d) {console.log(d); return d.x; })
	    .attr("cy", function(d) { return d.y; })
	    .call(drag);

	svg.selectAll(".right")
		.data(d3.range(1).map(function() { return {x: width - radius-margin.right, y: height / 2}; }))
		.enter()
		.append("circle")
		.attr("class","thumb right")
	    .attr("r", radius)
	    .attr("cx", function(d) {console.log(d); return d.x; })
	    .attr("cy", function(d) { return d.y; })
	    .call(drag);

	function dragmove(d) {
	  var dragged = d3.select(this)
	  var isLeft = dragged.classed("left")
	  var other = (isLeft) ? d3.select("circle.right") : d3.select("circle.left")
	  if(!isLeft){
	  	var pos = Math.min(width-radius-margin.right, Math.max(other.data()[0].x, d3.event.x));
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
	        backgroundColor: null,
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
