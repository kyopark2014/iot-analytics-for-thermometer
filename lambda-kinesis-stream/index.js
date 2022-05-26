exports.handler = async (event) => {
    console.log('event: '+JSON.stringify((event)));
    
    let records = event['Records'];
    let eventInfo = [];
    records.forEach((record) => {
        let body = Buffer.from(record['kinesis']['data'], 'base64');
        
        eventInfo.push(JSON.parse(body));
    });

    console.log('eventInfo: %j', eventInfo);
    
    // TODO implement
    const response = {
        statusCode: 200,
        body: JSON.stringify(eventInfo),
    };
    return response;
};
