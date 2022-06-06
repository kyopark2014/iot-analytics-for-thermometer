const myForm = document.querySelector('#my-form');

myForm.addEventListener('submit', onSubmit);

function onSubmit(e) {
    e.preventDefault();
    
    google.charts.load('current', {'packages':['corechart']});
	google.charts.setOnLoadCallback(DrawIoTChart);
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

    drawTemperature(temperatureValue);   
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

	let currentTimestamp = new Date()*1.0;
	let startTimestamp = 0;
	console.log('startTimestamp: '+(currentTimestamp-timegap));

	let url = '/status?deviceid='+deviceid+'&startTimestamp='+startTimestamp;
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
		  
			for(let i=0;i<items.length;i++) {
				temperatureValue.push([new Date(parseInt(items[i].timestamp)), parseFloat(items[i].temperature)]);        
			}
		}
	};
    
	xmlHttp.send( null );

    return temperatureValue;
}   

function drawTemperature(temperatureValue) {
    var options = {
      hAxis: {
        title: 'Time',
		format: 'hh:mm:ss', // 'MM/dd hh:mm'  or  'MM/dd/yy'
      },
      vAxis: {
        title: 'Temperature (degree)',
		scaleType: 'linear',   // log
		ticks: [0, 10, 20, 30, 40]
      },
      legend:'none'
    };

    var data = google.visualization.arrayToDataTable(temperatureValue, true); 

    var chart = new google.visualization.AreaChart(document.getElementById('chart_temperature'));  // LineChart

	chart.draw(data, options);    
} 
