const token = process.env.token;
const { WebClient } = require('@slack/web-api');

exports.handler = async (event) => {
  console.log('## ENVIRONMENT VARIABLES: ' + JSON.stringify(process.env));
  console.log('## EVENT: ' + JSON.stringify(event))

  const message = event.Records[0].Sns.Message;

  console.log("msg: "+message);

  const web = new WebClient(token);
  
  var isCompleted = false, statusCode = 200;
  (async () => {
    try {
      // Use the `chat.postMessage` method to send a message from this app
      let result = await web.chat.postMessage({
        channel: 'storytime',
        text: message,
      });
      
      console.log('response: '+ JSON.stringify(result));
      console.log('### ok: '+result.ok);

      isCompleted = true, statusCode = 200;
    } catch (error) {
      console.log(error);

      isCompleted = true, statusCode = 500;      
    }  
  })(); 

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
    statusCode: statusCode,
  };

  return response
}