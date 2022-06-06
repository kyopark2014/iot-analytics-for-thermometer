## Dashboard를 위한 Web Client

이전 얼마기간의 데이터를 보고자 하므로 아래와 같이 "startTimestamp"를 계산합니다. URL에는 querystring으로서 deviceid와 startTimestamp가 입력되도록 합니다. 

```java
	let currentTimestamp = new Date()*1.0;
	let startTimestamp = currentTimestamp-timegap;
	console.log('startTimestamp: '+startTimestamp);

	let url = '/status?deviceid='+deviceid+'&startTimestamp='+startTimestamp;
	console.log('url: '+url);

	let xmlHttp = new XMLHttpRequest();	
  xmlHttp.open( "GET", url, false);   
```

'/status' API를 이용해 로드된 temperature 데이터를 가지고 graph로 화면에 표시합니다. 

```java
	let temperatureValue = [];
	xmlHttp.onreadystatechange = function() {
		if (xmlHttp.readyState == XMLHttpRequest.DONE && xmlHttp.status == 200 ) {
		  	let res = JSON.parse(xmlHttp.responseText);	
		  	console.log('statusCode: '+res.statusCode);

        let items = JSON.parse(res.body);
		  
			  for(let i=0;i<items.length;i++) {
				  temperatureValue.push([new Date(parseInt(items[i].timestamp)), parseFloat(items[i].temperature)]);        
			  }
		  }
	};
  
  xmlHttp.send( null );
```    
	
## Reference

[Visualization - Google Charts](https://developers.google.com/chart/interactive/docs/gallery/areachart) 

