# AWS IoT Edukit 이용한 Themometer 분석 환경 


여기서는 [AWS Edukit](https://github.com/kyopark2014/IoT-Core-Contents/blob/main/m5stack.md)을 이용하여 AWS IoT Core와 Data Analytics을 이용하여 IoT 센서로부터 데이터를 수집하는 과정을 설명합니다. 전체적인 Architecture는 아래와 같습니다.

<img width="748" alt="image" src="https://user-images.githubusercontent.com/52392004/169610690-feaed370-ee55-4bc5-b4a4-103fbd6f63d6.png">


## AWS Edukit(M5Stack)을 이용한 온도 측정 및 IoT Core로 전송

Thermometer based on AWS Edukit에 따라 Edukit에서 온도를 측정하는 Themometer 펌웨어를 다운로드 합니다. M5Stack의 Temperature sensor를 이용하여 온도를 측정한 후, MQTT를 이용해 AWS IoT Core로 온도 데이터를 JSON 포멧으로 전달하게 됩니다. 

[M5Stack에서 전송되는 데이터의 형태](https://github.com/kyopark2014/IoT-Core-Contents/blob/main/edukit-thermostat.md)는 아래와 같습니다. 

```java
{
  "state": {
    "reported": {
      "temperature": 17.820343,
      "sound": 8,
      "roomOccupancy": false,
      "hvacStatus": "STANDBY"
    }
  },
  "clientToken": "0123501CB56E162101-77"
}
```

## 온도 데이터를 분석하기 위한 시스템 준비 

아래와 같이 AWS CDK를 이용하여 [M5Stack에서 전달된 온도 데이터](https://github.com/kyopark2014/iot-analytics/tree/main/aws-iot-thermometer)를 저장하고 분석하는 infra structure를 생성합니다. 

```c
$ cd cdk-iot
$ cdk synth
$ cdk deploy
```
