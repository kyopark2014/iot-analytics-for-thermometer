# AWS IoT Edukit 이용한 Themometer Analytic Environment

여기서는 [AWS Edukit](https://github.com/kyopark2014/IoT-Core-Contents/blob/main/m5stack.md)을 이용하여 AWS IoT Core와 Data Analytics을 이용하여 IoT 센서로부터 데이터를 수집하는 과정을 설명합니다. 

## 문제 정의

"우리집 베란다의 온도 변화를 그래프로 보고, 온도가 너무 높으면 알람을 받을 수는 없을까?"

우리집 베란다에는 무척 아까는 제라늄 화분이 여럿 있습니다. 제라늄은 일년 내내 꽃이 피고 키우는 재미가 있지만, 여름의 고온에 매우 약해서 잘 관리하여야 합니다. 특히 30도 이상의 고온이 되지 않도록 주의가 필요한데, 다행히 우리집은 동향이라서 한여름에 온도가 높지는 않지만, 오전에는 꽤 햇볓이 잘들어서 온도 변화를 알고 싶었고, 온도가 너무 높을때는 시원한 곳으로 옮기고 싶었습니다.

이러한 소소한(?) 바램을 아래와 같이 구현해보고자 합니다. 

## Architecture 구성 

전체적인 Architecture는 아래와 같습니다.

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
