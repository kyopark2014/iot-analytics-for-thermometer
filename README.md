# AWS IoT Edukit 이용한 Themometer Analytic Environment

여기서는 [AWS Edukit](https://github.com/kyopark2014/IoT-Core-Contents/blob/main/m5stack.md)을 이용하여 AWS IoT Core와 Data Analytics을 이용하여 IoT 센서로부터 데이터를 수집하고, 이를 웹브라우저를 통해 확인하고, 일정 조건에 대한 알람을 생성하는 일련의 과정을 설명합니다. 

## 문제 정의

"우리집 베란다의 온도 변화를 그래프로 보고, 온도가 너무 높으면 알람을 받을 수는 없을까?"

우리집 베란다에는 무척 아까는 제라늄 화분이 여럿 있습니다. 제라늄은 일년 내내 꽃이 피고 키우는 재미가 있지만, 여름의 고온에 매우 약해서 잘 관리하여야 합니다. 특히 30도 이상의 고온이 되지 않도록 주의가 필요한데, 다행히 우리집은 동향이라서 한여름에 온도가 높지는 않지만, 오전에는 꽤 햇볓이 잘들어서 온도 변화를 알고 싶었고, 온도가 너무 높을때는 시원한 곳으로 옮기고 싶었습니다.

이러한 소소한(?) 바램을 아래와 같이 구현해보고자 합니다. 

## Architecture 구성 

전체적인 Architecture는 아래와 같습니다. 

- [AWS Edukit](https://github.com/kyopark2014/IoT-Core-Contents/blob/main/m5stack.md)은 M5Stack의 AWS 버전으로 온도센서를 비롯한 다양한 센서를 가지고 있습니다. 여기에서는 M5Stack에 WiFi, Temperature, MQTT를 활성화 해서, Temperature변화를 [MQTT](https://github.com/kyopark2014/IoT-Core-Contents/blob/main/mqtt.md) 프로토콜을 이용해 AWS IoT Core로 전송합니다. 

- MQTT로 전달되는 온도 데이터는 Amazon Kinesis Data Streams을 통해 수집됩니다. 이러한 구조는 다수의 Temperature 센서들로부터 수많은 트래픽을 효과적으로 처리해야 하는 경우에 유용합니다. 

- Amazon Kinesis Data Streams로 수집된 온도 데이터는 Amazon Kinesis Data Firehose를 통해 S3에 저장되는데, 이때 Lambda를 통해 적절한 형태로 포맷을 변경합니다. 여기서는 [Lambda for firehose](https://github.com/kyopark2014/iot-analytics-for-thermometer/tree/main/lambda-for-firehose)를 이용해 Stream으로 들어오는 데이터의 변환 작업을 수행합니다. 

- Amazon S3에 저장된 데이터는 Amazon Athena를 통해 SQL로 검색할 수 있는데, json파일의 정규화를 위해서는 변환 Table 생성이 필요합니다. 여기서는 AWS Glue Data Catalog의 Crawler를 이용하여 Table을 생성하고, temperature 데이터 베이스 정보를 Athena로 전달합니다. 

- Temperature가 일정온도 이상인 경우에 Alarm을 생성할 수 있습니다. 이는 Amazon Kinesis Data Streams의 Fanout으로 연결된 [AWS Lambda for stream](https://github.com/kyopark2014/iot-analytics-for-thermometer/tree/main/lambda-for-stream)을 이용해 Alarm event를 생성하고, Amazon SNS를 통해 전달합니다. 이후 [Lambda for slack](https://github.com/kyopark2014/iot-analytics-for-thermometer/tree/main/lambda-for-slack)에서 event를 생성하여 Slack으로 전달합니다. 

- 사용자가 IoT device의 Temperature data를 조회하고자 하는 경우에 Amazon CloudFront를 통해 Web page를 열고, API Gateway와 [Lambda for athena](https://github.com/kyopark2014/iot-analytics-for-thermometer/tree/main/lambda-for-athena)를 통해 Amazon Athena로 센서 데이터를 조회 합니다. 

<img width="976" alt="image" src="https://user-images.githubusercontent.com/52392004/170957665-bd1d136b-dacf-4a4f-b52f-3cc52d781969.png">


## 1. AWS Edukit(M5Stack)에서 측정한 Temperature를 IoT Core로 전송

[AWS Edukit(M5Stack) Upgreade](https://github.com/kyopark2014/iot-analytics-for-thermometer/blob/main/aws-iot-thermometer/README.md)를 따라서 themometer용 M5Stack용 Binary를 설치합니다.  [M5Stack](https://github.com/kyopark2014/IoT-Core-Contents/blob/main/m5stack.md)의 Temperature sensor를 이용하여 온도를 측정한 후, [MQTT](https://github.com/kyopark2014/IoT-Core-Contents/blob/main/mqtt.md)를 이용해 AWS IoT Core로 온도 데이터를 JSON 포멧으로 전달하게 됩니다. 



## 2. AWS CDK를 이용한 인프라 생성  

1) 아래와 같이 [AWS CDK](https://github.com/kyopark2014/technical-summary/blob/main/cdk-introduction.md)를 이용하여 [M5Stack에서 전달된 온도 데이터](https://github.com/kyopark2014/iot-analytics/tree/main/aws-iot-thermometer)를 저장하고 분석하는 infra structure를 생성합니다. 

```c
$ cd cdk-iot
$ cdk synth
$ cdk deploy
```

2) [AWS Glue에서 Table 생성](https://github.com/kyopark2014/iot-analytics-for-thermometer/blob/main/crawler.md)에 따라 AWS Glue Data catalogd의 Crawler를 이용하여 Table을 생성합니다. 

3) [Athena로 IoT 데이터 조회](https://github.com/kyopark2014/iot-analytics-for-thermometer/blob/main/athena.md)에 따라 Athena로 IoT device에서 생성되고, AWS Anlytics를 통해 수집된 데이터를 확인 합니다.




