const athenaBucket = process.env.athenaBucket; 
const dbName = process.env.dbName; 
const workGroup = process.env.workGroup; 

var clientConfig = {
    bucketUri: athenaBucket,
    database: dbName,
    workGroup: workGroup
}

var awsConfig = {
    region: 'ap-northeast-2', 
}

var athena = require("athena-client");
var client = athena.createClient(clientConfig, awsConfig);

exports.handler = async (event) => {
    console.log('## ENVIRONMENT VARIABLES: ' + JSON.stringify(process.env))
    console.log('event: '+JSON.stringify((event)));
    let isCompleted = false;

    let deviceid = event.deviceid;
    let startTimestamp = event.startTimestamp;
    console.log('deviceid: '+deviceid+', startTimestamp: '+startTimestamp);
    
    let sqlStatement = "SELECT * FROM themometer where deviceid = '"+deviceid+"' and timestamp > "+startTimestamp+" order by timestamp limit 5000";
    console.log('sql: '+sqlStatement);

    var output = [];

    try {
        let result = await client.execute(sqlStatement).toPromise();
        console.log('result: %j', result);
        console.log('# of items: ', result['records'].length);

        for(let i=0;i<result['records'].length;i++) {
            let record = result['records'][i];

            output.push({
                timestamp: record['timestamp'],
                temperature: record['temperature']
            })
        }
        console.log('output: %j', output);        
        
        isCompleted = true;

    } catch(err) {
        console.log('err: '+err);
    }

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
        body: JSON.stringify(output),
    };
    return response;
};
