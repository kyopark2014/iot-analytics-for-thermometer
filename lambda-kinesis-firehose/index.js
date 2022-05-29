exports.handler = async (event) => {
    console.log('event: '+JSON.stringify((event)));
    
    let records = event['records'];
    let outRecords = [];

    for(let i=0;i<records.length;i++) {
        let recordId = records[i]['recordId'];
        let data = Buffer.from(records[i]['data'], 'base64');
 
        let body = JSON.parse(data);
        console.log('body: %j', body);

        if(body['state'] && !body['metadata']) {
            let temperature = body['state']['reported']['temperature'];
            console.log('temperature: '+temperature);
    
            let timestamp = records[i]['approximateArrivalTimestamp'];
            console.log('timestamp: '+timestamp);
    
            let clientToken = body['clientToken'];        
            let pos = clientToken.indexOf('-');
            let deviceId = clientToken.substr(0, pos);
            console.log('deviceId: '+deviceId);
                    
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
        }
        else {
            console.log('ignore it.');
            const outRecord = {
                recordId: recordId,
                result: 'Dropped',
                data: ''
            }
            outRecords.push(outRecord); 
        }
    }; 
    console.log('body: %j', {'records': outRecords});
    
    return {'records': outRecords}
};
