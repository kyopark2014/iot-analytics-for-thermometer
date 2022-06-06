const aws = require('aws-sdk');
const sns = new aws.SNS();
const topicArn = process.env.topicArn;

exports.handler = async (event) => {
    console.log('event: '+JSON.stringify((event)));
    
    let records = event['Records'];

    for(let i=0;i<records.length;i++) {
        let body = Buffer.from(records[i]['kinesis']['data'], 'base64');        
        let record = JSON.parse(body);

        let temperature = record['state']['reported']['temperature'];        
        let timestamp = records[i]['kinesis']['approximateArrivalTimestamp'];
        
        let clientToken = record['clientToken'];
        let deviceId = clientToken.substr(0, clientToken.indexOf('-'));

        let date = new Date(timestamp*1000);
        
        let message = deviceId+': '+temperature+' ('+date+')';
        console.log('message: '+message);

        // publish
        var snsParams = {
            Subject: temperature,
            Message: message,        
            TopicArn: topicArn
        }; 
        console.log('snsParams: '+JSON.stringify(snsParams));
        
        let snsResult = sns.publish(snsParams, function(err){
            if (err) {
                console.log('Failure: '+err);
            } 
        });
        console.log('snsResult:', snsResult);
    };
    
    const response = {
        statusCode: 200,
    };
    return response;
};
