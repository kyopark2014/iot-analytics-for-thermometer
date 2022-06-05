# Slack 으로 메시지 전송

"lambda for slack"은 Amazon SNS를 통해 전달된 event를 가지고 메시지를 생성하여 slack으로 전달하는 역할을 합니다. 여기서 slack channel은 "storytime"을 이용하는데, 자신의 slack channel을 생성하여 업데이트 하여야 합니다. 

SNS로 전달된 message를 event에서 추출합니다. 

```java
  const message = event.Records[0].Sns.Message;
  console.log("msg: "+message);
```

slack에서 제공하는 라이브러리인 "@slack/web-api"을 이용하여 메시지를 전송합니다. 

```java
const web = new WebClient(token);
  // The current date
  const currentTime = new Date().toTimeString();
  
  var isCompleted = false, statusCode = 200;
  (async () => {
    try {
      // Use the `chat.postMessage` method to send a message from this app
      let result = await web.chat.postMessage({
        channel: 'storytime',
        text: currentTime+'\n'+message,
      });
      
      console.log('response: '+ JSON.stringify(result));
      console.log('### ok: '+result.ok);

      isCompleted = true, statusCode = 200;
    } catch (error) {
      console.log(error);

      isCompleted = true, statusCode = 500;      
    }  
  })(); 
```  
