## Slack으로 메시지를 보내기 위해 필요한 Token 등록 방법

Slack의 Token은 민감한 정보이므로 github등을 통해 공유되지 않도록 주의하여야 합니다.

### Token 업데이트 방법

Lambda console에서 Slack을 위한 Lambda로 진입하여 아래와 같이 [Configuration] - [Environment variables]에 가면 [AWS CDK](https://github.com/kyopark2014/iot-analytics-for-thermometer/blob/main/cdk-iot/lib/cdk-iot-stack.ts)에서 입력한 임의 token이 아래처럼 들어가 있는것을 확인 할 수 있습니다. [Edit]를 선태하여 수정화면으로 이동합니다.

![noname](https://user-images.githubusercontent.com/52392004/172056487-c2855bc6-9a27-40dc-b619-82df7a3c0c2c.png)

아래처럼 실제 token을 입력합니다. 

![noname](https://user-images.githubusercontent.com/52392004/172056376-88aaa644-95fb-4112-a5b2-91ab602436bf.png)
