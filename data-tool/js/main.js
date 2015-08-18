d3.json("../sample-data/supplement-2014-2A3.json", function(error, json){
  if (error) return console.warn(error);
  // console.log(error)
  data = json;
  var category = data.category;
  switch(category){
  	case "timeSeries":
  		drawLinechart(data);
  		drawTable(data);
  		break;
  }
});
function drawTable(input){
	d3.select("#testTable table")
	.html(function(){
		return input.html.header + input.html.body
	})
	// console.log(d3.selectAll("#testTable th")))
	d3.selectAll("#testTable th")
		.on("click", function(){
			var series = d3.select(this).attr("class")
			var chart = $('#lineChart').highcharts();
			$.get( "http://localhost:27080/test/tables/_find?criteria=%7B%22title.id%22%3A%222.A3%22%7D", function( data ) {
		  		var tInput = data.results[0];
		  		// console.log(data);
				chart.addSeries({
					id: tInput.title.id.replace(".","") + "_" + series,
	            	name: series,
	            	data: generateTimeSeries(tInput.data.years, tInput["data"][series])
				});
			});
		})
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
function drawLinechart(input){
	console.log(input.title.id.replace(".","") + "_" + "col1")
    $('#lineChart').highcharts({
        chart: {
            type: 'spline'
        },
        title: {
            text: input.title.id + ' ' + input.title.name
        },
        xAxis: {
            type: 'datetime',
            dateTimeLabelFormats: { // don't display the dummy year
                month: '%B',
                year: '%Y'
            },
            title: {
                text: 'Date'
            }
        },
        yAxis: {
            title: {
                text: 'Snow depth (m)'
            },
            min: 0
        },
        tooltip: {
            headerFormat: '<b>{series.name}</b><br>',
            pointFormat: '{point.x:%y}: {point.y:.2f} m'
        },

        plotOptions: {
            spline: {
                marker: {
                    enabled: true
                }
            }
        },

        series: [{
        	id: input.title.id.replace(".","") + "_" + "col1",
            name: "col1",
            data: generateTimeSeries(input.data.years, input.data.col1)
        }
        ]
    });
}
function removeSeries(id){
	var chart = $('#lineChart').highcharts();
	for(var i = 0; i<chart.series.length; i++){
		var ser = chart.series[i];
		if(ser.options.id == id){
			ser.remove();
		}
	}
}












