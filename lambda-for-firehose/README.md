# 수집된 데이터 변환을 위한 Lambda

AWS Kinesis Data Firehose는 S3에 저장하기 전에 Lambda를 통해 데이터 전처리를 할 수 있으므로, 불필요한 데이터 없이 원하는 포맷으로 데이터를 저장할 수 있습니다. 여기서는 Lambda로 데이터를 변환하는 과정에 대해 설명합니다. 


Kinesis Data Firehose를 위한 "lambda-for-firhose"로 들어오은 event는 여러개의 온도데이터가 전달됩니다. 따라서 event의 "records"을 하나씩 처리하여야 하는데, 이때 data에 있는 string은 base64로 encoding되어 있으므로 아래와 같이 decoding 하여야 합니다. decoding후 body에서 temperature, timestamp, deviceid를 parsing 합니다. M5Stack에 전달하는 데이터에는 deviceid가 없지만 clienttoken에서 아래처럼 잘라서 deviceid를 추출 할 수 있습니다. 

```java
    let records = event['records'];
    let outRecords = [];

    for(let i=0;i<records.length;i++) {
        let recordId = records[i]['recordId'];
        let data = Buffer.from(records[i]['data'], 'base64');
 
        let body = JSON.parse(data);
        console.log('body: %j', body);

        let temperature = body['state']['reported']['temperature'];
        console.log('temperature: '+temperature);
    
        let timestamp = records[i]['approximateArrivalTimestamp'];
        console.log('timestamp: '+timestamp);
        
        let clientToken = body['clientToken'];
        let deviceId = clientToken.substr(0, clientToken.indexOf('-'));
        console.log('deviceId: '+deviceId);
```        

이제 아래와 같이 새로운 json 포맷으로 데이터를 모은후에 다시 base64로 encoding하여 Kinesis Data Firehose로 전달합니다. 

```java
        const converted = {
            deviceId: deviceId,
            timestamp: timestamp,
            temperature: temperature,
        };
        console.log('event: %j',converted);
    
        let binary = Buffer.from(JSON.stringify(converted), 'utf8').toString('base64');
            
        const outRecord = {
            recordId: recordId,
            result: 'Ok',
            data: binary
        }
        outRecords.push(outRecord); 
```        
