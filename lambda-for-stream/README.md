# Temporature를 모니터링하고 Alarm 발생

AWS Kinesis Data Streams는 IoT devices로부터 생성된 데이터를 Queue형태로 저장 후 필요할때 사용할 수 있습니다. 여기서는 Lambda를 이용하여 Kinesis Data Streams의 데이터를 받은 후에 모니터링 하다가 일정이상의 값인 경우에 Alarm을 생성하는것을 설명하고자 합니다. 

Kinesis Data Stream을 통해 수집된 데이터는 하나 또는 여러개의 record를 가지고 있으므로, 아래와 같이 record 단위로 처리하여야 합니다. 이때, base64로 decoding하여 body에서 temperature, timestamp, deviceid를 추출 합니다. 

```java
    let records = event['Records'];
    let isCompleted = false;
    
    for(let i=0;i<records.length;i++) {
        let body = Buffer.from(records[i]['kinesis']['data'], 'base64');        
        let record = JSON.parse(body);

        let temperature = record['state']['reported']['temperature'];        
        let timestamp = records[i]['kinesis']['approximateArrivalTimestamp'];
        
        let clientToken = record['clientToken'];
        let deviceId = clientToken.substr(0, clientToken.indexOf('-'));
```        

timestamp를 시간으로 아래처럼 변환합니다. timestamp는 timezone이 GMT 기준이므로 KST로 변환하기 위하여 '+9'을 더하여 시간을 구합니다. hour, minute, second를 화면에 표시하기 좋게 한자리수인 경우에는 '0'을 추가한 문자열로 변환합니다. 

```java
        let date = new Date(timestamp*1000);

        let hour = date.getHours()+9;  // change from GMT to KST
        if(hour==24) hour = 12;
        else if(hour>24) hour -= 24;
        
        let strHour;
        if(hour<10) strHour = '0'+hour;
        else strHour = hour;
        
        let min = date.getMinutes();        
        let strMin;
        if(min<10) strMin = '0'+min;
        else strMin = min;
        
        let sec = date.getSeconds();        
        let strSec;
        if(sec<10) strSec = '0'+sec;
        else strSec = sec;
```

변환된 시간으로 message를 생성한 후, Amazon SNS로 전송합니다. 

```java
        let strTemp = (Math.floor(temperature*10)/10).toString();
        let strDate = strHour+':'+strMin+':'+strSec;

        let message = strTemp+' ('+strDate+')';
        console.log('message: '+message);

        // publish
        var snsParams = {
            Subject: deviceId,
            Message: message,        
            TopicArn: topicArn
        }; 
        console.log('snsParams: '+JSON.stringify(snsParams));
        
        let snsResult = sns.publish(snsParams, function(err){
            if (err) {
                console.log('Failure: '+err);
            } 
        });
```        
