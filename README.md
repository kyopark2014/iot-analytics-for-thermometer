# AWS IoT Edukit 이용한 Themometer Analytic Environment

여기서는 [AWS Edukit](https://github.com/kyopark2014/IoT-Core-Contents/blob/main/m5stack.md)을 이용하여 AWS IoT Core와 Data Analytics을 이용하여 IoT 센서로부터 데이터를 수집하고, 이를 웹브라우저를 통해 확인하고, 일정 조건에 대한 알람을 생성하는 일련의 과정을 설명합니다. 

## 문제 정의

"우리집 베란다의 온도 변화를 그래프로 보고, 온도가 너무 높으면 알람을 받을 수는 없을까?"

우리집 베란다에는 무척 아까는 제라늄 화분이 여럿 있습니다. 제라늄은 일년 내내 꽃이 피고 키우는 재미가 있지만, 여름의 고온에 매우 약해서 잘 관리하여야 합니다. 특히 30도 이상의 고온이 되지 않도록 주의가 필요한데, 다행히 우리집은 동향이라서 한여름에 온도가 높지는 않지만, 오전에는 꽤 햇볓이 잘들어서 온도 변화를 알고 싶었고, 온도가 너무 높을때는 시원한 곳으로 옮기고 싶었습니다.

이러한 소소한(?) 바램을 아래와 같이 구현해보고자 합니다. 

## Architecture 구성 

전체적인 Architecture는 아래와 같습니다. 

- AWS Edukit은 M5Stack의 AWS 버전으로 온도센서를 비롯한 다양한 센서를 가지고 있습니다. 여기에서는 M5Stack에 Wifi, Temperature, MQTT를 활성화 해서, Temperature변화를 MQTT 프로토콜을 이용해 WiFi로 전송합니다. 

- MQTT로 전달되는 온도 데이터는 Amazon Kinesis Data Streams을 통해 수집됩니다. 이러한 구조는 다수의 Temperature 센서들로부터 트래픽을 효과적으로 처리해야 하는 경우에 유용합니다. 

- Amazon Kinesis Data Streams로 수집된 온도 데이터는 Amazon Kinesis Data Firehose를 통해 S3에 저장되는데, 이때 Lambda를 통해 필요한 포맷으로 변경합니다. 여기서는 Lambda for firehose가 Stream으로 들어오는 데이터의 변환 작업을 수행합니다. 

- Amazon S3에 저장된 데이터는 Amazon Athena를 통해 SQL로 검색할 수 있는데, json파일의 정규화를 위해서는 Table 생성이 필요합니다. 여기서는 AWS Glue Data Catalog의 Crawler를 이용하여 Table을 생성하고, temperature 데이터 베이스 정보를 Athena로 전달합니다. 

- Temperature가 일정온도 이상인 경우에 Alarm을 생성할 수 있습니다. 이는 Amazon Kinesis Data Streams의 Fanout으로 연결된 AWS Lambda for stream을 이용해 Alarm event를 생성하고, Amazon SNS를 통해 전달합니다. 이후 Lambda for slack에서 event를 생성하여 Slack으로 전달하빈다. 

- 사용자가 IoT device의 Temperature data를 조회하고자 하는 경우에 Amazon CloudFront를 통해 Webpage를 열고, API Gateway와 Lambda for athena를 통해 Amazon Athena로 센서 데이터를 조회 합니다. 

![image](https://user-images.githubusercontent.com/52392004/170937830-1aaac162-c28e-4899-ae0f-0fddc9ee62f6.png)


## AWS Edukit(M5Stack)을 이용한 온도 측정 및 IoT Core로 전송

Thermometer based on AWS Edukit에 따라 Edukit에서 온도를 측정하는 Themometer 펌웨어를 다운로드 합니다. M5Stack의 Temperature sensor를 이용하여 온도를 측정한 후, MQTT를 이용해 AWS IoT Core로 온도 데이터를 JSON 포멧으로 전달하게 됩니다. 

[M5Stack에서 전송되는 데이터의 형태](https://github.com/kyopark2014/IoT-Core-Contents/blob/main/edukit-thermostat.md)는 아래와 같습니다. 

```java
{
    "state": {
        "reported": {
            "temperature": 20.182835
        }
    },
    "clientToken": "0123501CB56E162101-3"
}
```

## 온도 데이터를 분석하기 위한 시스템 준비 

아래와 같이 AWS CDK를 이용하여 [M5Stack에서 전달된 온도 데이터](https://github.com/kyopark2014/iot-analytics/tree/main/aws-iot-thermometer)를 저장하고 분석하는 infra structure를 생성합니다. 

```c
$ cd cdk-iot
$ cdk synth
$ cdk deploy
```

## Athena에서 조회한 결과

<img width="975" alt="image" src="https://user-images.githubusercontent.com/52392004/170881634-c026bf72-8b4d-4c1a-af11-a87af5bf3025.png">

```c
