const myForm = document.querySelector('#my-form');

myForm.addEventListener('submit', onSubmit);

function onSubmit(e) {
    e.preventDefault();

	DrawIoTChart();
}

function DrawIoTChart() {
	let currentTime = new Date();
	
	console.log("start at " + new Date(currentTime));
	console.log(currentTime*1.0);
	
	period = document.getElementById("period").value;

    let deviceid = document.getElementById("deviceid").defaultValue;
	console.log('deviceid: '+deviceid);

	// load temperature using deviceid
	const temperatureValue = loadTemperature(deviceid); 

	drawChart(temperatureValue);   
}

function loadTemperature(deviceid) {
	let period = document.getElementById("period").value;

	let timegap = 0;
	if(period == '1 day') {
		timegap =  24*3600*1000;
	}
	else if(period == '2 day') {
		timegap =  2*24*3600*1000;
	}
	else if(period == '1 week') {
		timegap =  7*24*3600*1000;
	}
	else if(period == '2 weeks') {
		timegap =  14*24*3600*1000;
	}
	else if(period == '1 hour') {
		timegap =  1*3600*1000;
	}
	else if(period == '3 hours') {
		timegap =  3*3600*1000;
	}
	else if(period == '6 hours') {
		timegap =  6*3600*1000;
	}
	else if(period == '12 hours') {
		timegap =  12*3600*1000;
	}

	let currentTimestamp = new Date()*1.0;
	let startTimestamp = currentTimestamp-timegap;
	console.log('startTimestamp: '+startTimestamp);

	let url = '/status?deviceid='+deviceid+'&startTimestamp='+startTimestamp;
	console.log('url: '+url);

	let xmlHttp = new XMLHttpRequest();	
    xmlHttp.open( "GET", url, false);     

	let temperatureValue = [];
	xmlHttp.onreadystatechange = function() {
		if (xmlHttp.readyState == XMLHttpRequest.DONE && xmlHttp.status == 200 ) {
		  	let res = JSON.parse(xmlHttp.responseText);	
		  	console.log('statusCode: '+res.statusCode);
		//  	console.log('body: '+res.body);	

			let items = JSON.parse(res.body);
		  
			console.log('record[0] --> timestamp: '+items[0].timestamp, ', temperature: '+items[0].temperature);
			console.log('date: '+new Date(parseInt(items[0].timestamp)));

			let date = new Date(parseInt(items[0].timestamp));
			let timeStr = date.getHours() + ':' + date.getMinutes() + ':' + date.getSeconds(); 
			console.log('timeStr: '+timeStr);
		  
			for(let i=0;i<items.length;i++) {
				date = new Date(parseInt(items[i].timestamp));
				let timeStr = date.getHours() + ':' + date.getMinutes() + ':' + date.getSeconds(); 

				temperatureValue.push([timeStr, parseFloat(items[i].temperature)]);     
			}
		}
	};
    
	xmlHttp.send( null );

    return temperatureValue;
}   


function drawChart(vals) {
    console.log("drawChart() start");
    var val_list = []
    for (i=0; i < vals.length; i++){
      
      var item = {"label": vals[i][0], "y": vals[i][1]};
      val_list.push(item)
    }

	console.log(vals)
	console.log(val_list)

    //! DrawChart kick
    var canvas = document.getElementById('chart_temperature');
    var charts = new CanvasJS.Chart(canvas,
        {
            title:{
                text:"Thermometer based on M5STACK"
            },
			axisX:{
				title: "Time"
			},
			axisY:{				
				title: "Temperature (degree)"
			},
			toolTip: {
				shared: true
			},
			legend:{
				cursor:"pointer",
				itemclick: toggleDataSeries
			},
            data:[{
               //  type:"line",
				type:"spline",				
				name: "abc",
                dataPoints: val_list
            }]
        });
    charts.render();
}

function toggleDataSeries(e) {
	if(typeof(e.dataSeries.visible) === "undefined" || e.dataSeries.visible) {
		e.dataSeries.visible = false;
	}
	else {
		e.dataSeries.visible = true;            
	}
	chart.render();
}
