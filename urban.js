/**
 * Urban Institute theme for Highcharts JS
 * @author Tim Meko
 */

Highcharts.theme = {
	colors: ['#1b2c5e', '#0067b2', '#a4be65', '#ee8c2f', '#24CBE5', '#64E572', '#FF9655', '#FFF263', '#6AF9C4'],
	chart: {
		backgroundColor: '#ffffff',
		borderWidth: 0,
		plotBackgroundColor: '#ffffff',
		plotShadow: false,
		plotBorderWidth: 0
	},
	title: {
		style: {
			color: '#000',
			font: 'bold 16px Helvetica, Arial, "Trebuchet MS", Verdana, sans-serif'
		},
		align: "left"
	},
	subtitle: {
		style: {
			color: '#666666',
			font: 'bold 12px Helvetica, Arial, "Trebuchet MS", Verdana, sans-serif'
		},
		align: "left"
	},
	xAxis: {
		gridLineWidth: 0,
		lineColor: '#000',
		tickColor: '#000',
		tickmarkPlacement: 'on',
		labels: {
			style: {
				color: '#000',
				font: '11px Helvetica, Arial, "Trebuchet MS", Verdana, sans-serif'
			}
		},
		title: {
			style: {
				color: '#333',
				fontWeight: 'bold',
				fontSize: '12px',
				fontFamily: 'Helvetica, Arial, "Trebuchet MS", Verdana, sans-serif'

			}
		}
	},
	yAxis: {
		lineWidth: 0,
		tickWidth: 0,
		tickColor: '#000',
		labels: {
			style: {
				color: '#000',
				font: '11px Helvetica, Arial, "Trebuchet MS", Verdana, sans-serif'
			}
		},
		title: {
			style: {
				color: '#333',
				fontWeight: 'bold',
				fontSize: '12px',
				fontFamily: 'Helvetica, Arial, "Trebuchet MS", Verdana, sans-serif'
			}
		}
	},
	legend: {
		itemStyle: {
			font: '9pt Helvetica, Arial, "Trebuchet MS", Verdana, sans-serif',
			color: 'black'

		},
		itemHoverStyle: {
			color: '#039'
		},
		itemHiddenStyle: {
			color: 'gray'
		}
	},
	labels: {
		style: {
			color: '#99b'
		}
	},
	plotOptions: {
            series: {
                marker: {
                    enabled: false
                },
                lineWidth: 3,
                shadow: false
            }
    },

	navigation: {
		buttonOptions: {
			theme: {
				stroke: '#CCCCCC'
			}
		}
	}
};

// Apply the theme
var highchartsOptions = Highcharts.setOptions(Highcharts.theme);
