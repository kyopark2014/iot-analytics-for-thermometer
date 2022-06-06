# AWS IoT Edukit 이용한 Themometer Analytic Environment

여기서는 [AWS Edukit](https://github.com/kyopark2014/IoT-Core-Contents/blob/main/m5stack.md)을 이용하여 AWS IoT Core와 Data Analytics을 이용하여 IoT 센서로부터 데이터를 수집하고, 이를 웹브라우저를 통해 확인하고, 일정 조건에 대한 알람을 생성하는 일련의 과정을 설명합니다. 

## 문제 정의

"우리집 베란다에는 제가 아까는 제라늄 화분이 여럿 있습니다. 제라늄은 일년 내내 꽃이 피고 애뻐서, 키우는 재미가 있지만, 여름 고온에 쉽게 물러버릴수 있어서 잘 관리하여야 합니다. 특히 30도 이상의 고온이 되지 않도록 주의가 필요한데, 하루 또는 일정주기의 온도 변화를 알고 싶고, 온도가 너무 높을때는 시원한 곳으로 옮길 수 있도록 알람을 받고 싶습니다." 

![image](https://user-images.githubusercontent.com/52392004/172074437-37999798-9384-4247-a7dd-e941b4314d7b.png)


## Architecture 구성 

전체적인 Architecture는 아래와 같습니다. 

- [AWS Edukit](https://github.com/kyopark2014/IoT-Core-Contents/blob/main/m5stack.md)은 M5Stack의 AWS 버전으로서, 온도센서를 비롯한 다양한 센서를 가지고 있습니다. 여기에서는 M5Stack에 WiFi, Temperature, MQTT를 활성화 해서, Temperature변화를 [MQTT](https://github.com/kyopark2014/IoT-Core-Contents/blob/main/mqtt.md) 프로토콜을 이용해 AWS IoT Core로 전송합니다. 

- [MQTT](https://github.com/kyopark2014/IoT-Core-Contents/blob/main/mqtt.md)로 전달되는 온도 데이터는 Amazon Kinesis Data Streams을 통해 수집됩니다. 이러한 구조는 다수의 Temperature 센서들로부터 수많은 트래픽을 효과적으로 처리해야 하는 경우에 유용합니다. 

- Amazon Kinesis Data Streams로 수집된 온도 데이터는 Amazon Kinesis Data Firehose를 통해 S3에 저장되는데, 이때 Lambda를 통해 적절한 형태로 포맷을 변경합니다. 여기서는 [Lambda for firehose](https://github.com/kyopark2014/iot-analytics-for-thermometer/tree/main/lambda-for-firehose)를 이용해 Stream으로 들어오는 데이터의 변환 작업을 수행합니다. 

- Amazon S3에 저장된 데이터는 Amazon Athena를 통해 SQL로 검색할 수 있는데, json파일의 정규화를 위해서는 변환 Table 생성이 필요합니다. 여기서는 [AWS Glue Data Catalog의 Crawler를 이용하여 Table을 생성](https://github.com/kyopark2014/iot-analytics-for-thermometer/blob/main/crawler.md)하고, [Amazon Athena에서 temperature 데이터 베이스 정보를 조회](https://github.com/kyopark2014/iot-analytics-for-thermometer/blob/main/athena.md)할 수 합니다. 

- Temperature가 일정온도 이상인 경우에 Alarm을 생성할 수 있습니다. 이는 Amazon Kinesis Data Streams의 Fanout으로 연결된 [AWS Lambda for stream](https://github.com/kyopark2014/iot-analytics-for-thermometer/tree/main/lambda-for-stream)을 이용해 Alarm event를 생성하고, Amazon SNS를 통해 전달합니다. 이후 [Lambda for slack](https://github.com/kyopark2014/iot-analytics-for-thermometer/tree/main/lambda-for-slack)에서 event를 생성하여 Slack으로 전달합니다. 

- 사용자가 IoT device의 [Temperature data를 조회하고자 하는 경우에 Amazon CloudFront](https://github.com/kyopark2014/aws-routable-cloudfront)를 통해 [Web page를 열고](https://github.com/kyopark2014/iot-analytics-for-thermometer/tree/main/webclient), API Gateway와 [Lambda for athena](https://github.com/kyopark2014/iot-analytics-for-thermometer/tree/main/lambda-for-athena)를 통해 Amazon Athena로 센서 데이터를 조회 합니다. 


<img width="966" alt="image" src="https://user-images.githubusercontent.com/52392004/172187505-468f171e-167d-4df7-a937-086f024af329.png">


## 1) AWS Edukit(M5Stack)에서 측정한 Temperature를 IoT Core로 전송

[AWS Edukit(M5Stack)에서 측정한 Temperature를 IoT Core로 전송](https://github.com/kyopark2014/iot-analytics-for-thermometer/blob/main/aws-iot-thermometer/README.md)을 따라서 themometer용 M5Stack용 Binary를 설치합니다.  [M5Stack](https://github.com/kyopark2014/IoT-Core-Contents/blob/main/m5stack.md)은 Temperature sensor를 이용하여 주기적으로 온도를 측정한 후, [MQTT](https://github.com/kyopark2014/IoT-Core-Contents/blob/main/mqtt.md)를 이용해 AWS IoT Core에 온도 데이터를 JSON 포멧으로 전달합니다. 현재 전송주기의 기본 설정값은 1분으로 용도에 맞게 변경 할 수 있습니다.



## 2) AWS CDK를 이용한 Anlytics Infra Structure 생성  

1) 아래와 같이 [AWS CDK](https://github.com/kyopark2014/technical-summary/blob/main/cdk-introduction.md)을 이용하여 [M5Stack에서 전달된 온도 데이터](https://github.com/kyopark2014/iot-analytics/tree/main/aws-iot-thermometer)를 [저장하고 분석하는 infra structure를 생성](https://github.com/kyopark2014/iot-analytics-for-thermometer/tree/main/cdk-iot)합니다. 

```c
$ cd cdk-iot
$ cdk synth
$ cdk deploy
```

2) [AWS Glue에서 Table 생성](https://github.com/kyopark2014/iot-analytics-for-thermometer/blob/main/crawler.md)에 따라 AWS Glue Data catalog의 Crawler를 이용하여 Schema 생성을 위한 Table을 생성합니다. 

3) Slack Alarm을 전달하기 위하여 [Slack으로 메시지를 보내기 위해 필요한 Token 등록 방법](https://github.com/kyopark2014/iot-analytics-for-thermometer/blob/main/slack-token.md)에 따라 token 값을 입력합니다.



## 3) 결과 확인 

### Athena에서 데이터 조회 

[Athena로 IoT 데이터 조회](https://github.com/kyopark2014/iot-analytics-for-thermometer/blob/main/athena.md)처럼 IoT device를 통해 들어오는 온도데이터를 AWS Anlytics를 통해 수집해서 Athena를 통화 조회 할 수 있습니다. 


### Slack Alarm 수신 

아래와 같이 Slack으로 센서 Temperature와 관련된 Alarm을 받을 수 있습니다. 여기에서는 메시지 수신 확인을 위해 threshold temperature를 10도로 설정후에 테스트 하였고(실제는 30도로 운영), 정상적으로 메시지를 수신하는것을 확인 할 수 있습니다. 

![noname](https://user-images.githubusercontent.com/52392004/172061333-175e9f06-a0c6-4aef-99c4-7eb6ff62870e.png)




### Webclient를 이용한 모니터링 

아래와 같이 일정 시간 동안의 온도변화를 브라우저에서 확인 할 수 있습니다. 

![image](https://user-images.githubusercontent.com/52392004/172186070-98801f39-bde2-4ac7-a5ce-3c20a8cee2c4.png)
