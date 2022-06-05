const aws = require('aws-sdk');
const sns = new aws.SNS();
const topicArn = process.env.topicArn;

exports.handler = async (event) => {
    console.log('event: '+JSON.stringify((event)));
    
    let records = event['Records'];
    let isCompleted = false;
    
    for(let i=0;i<records.length;i++) {
        let body = Buffer.from(records[i]['kinesis']['data'], 'base64');        
        let record = JSON.parse(body);

        let temperature = record['state']['reported']['temperature'];        
        let timestamp = records[i]['kinesis']['approximateArrivalTimestamp'];
        
        let clientToken = record['clientToken'];
        let deviceId = clientToken.substr(0, clientToken.indexOf('-'));

        let date = new Date(timestamp*1000);

        let hour = date.getHours()+9;  // change from GMt to KST
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
        console.log('snsResult:', snsResult);

        isCompleted = true;
    };

    function wait(){
        return new Promise((resolve, reject) => {
          if(!isCompleted) {
            setTimeout(() => resolve("wait..."), 1000)
          }
          else {
            setTimeout(() => resolve("done..."), 0)
          }
        });
    }
    console.log(await wait());
    console.log(await wait());
    console.log(await wait());
    console.log(await wait());
    console.log(await wait());
    
    const response = {
        statusCode: 200,
    };
    return response;
};
