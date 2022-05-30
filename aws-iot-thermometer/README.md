#  AWS Edukit(M5Stack)에서 측정한 Temperature를 IoT Core로 전송

여기서는 AWS IoT EduKit(M5stack)에 Thermometer(온도계)용 펌웨어를 설치하고, AWS IoT Core로 Temperature 데이터가 정상적으로 수신되는지 확인하는 방법을 설명합니다. 

## Thermometer용 펌웨어로 Upgrade
 
1) [Device 인증서 생성](https://github.com/kyopark2014/IoT-Core-Contents/blob/main/certification.md)을 참조하여 M5Stack을 위한 인증서를 생성합니다. 이 과정을 진행하면, "M5Stack.cert.pem", "M5Stack.private.key", "M5Stack.public.key", "AmazonRootCA1.cer"가 생성됩니다.

2) 아래와 같이 [M5Stack](https://github.com/kyopark2014/IoT-Core-Contents/blob/main/m5stack.md)로 Thermometer로 동작시키기 위한 [git 소스](https://github.com/kyopark2014/iot-analytics-for-thermometer)를 다운로드 합니다. 

```c
$ git clone https://github.com/kyopark2014/iot-analytics-for-thermometer
```

3) 아래와 같이 "main/certs" 폴더에 "aws-root-ca.pem", "certificate.pem.crt", "private.pem.key"을 생성합니다. 이때, "aws-root-ca.pem"은 앞에서 생성된 "AmazonRootCA1.cer"과 동일한 파일입니다. 마찬가지로 "certificate.pem.crt"은 "M5Stack.cert.pem", "private.pem.key"은 "M5Stack.private.key"와 동일한 파일이므로, [Device 인증서 생성](https://github.com/kyopark2014/IoT-Core-Contents/blob/main/certification.md)에서 생성된 파일들을 "main/certs"로 복사 한 후에 이름을 변경하거나, Visual Studio Code에서 파일을 신규로 생성 한 후, 텍스트를 복사하여 붙여넣기를 해줍니다. 

![noname](https://user-images.githubusercontent.com/52392004/170308677-41474fe7-935c-40c0-ac0d-1b8051000751.png)

4) [IoT Core Endpoint](https://github.com/kyopark2014/IoT-Core-Contents/blob/main/endpoint.md)을 참조하여 접속할 IoT Core의 Endpoint를 확인합니다.

5) "sdkconfig"에 "CONFIG_AWS_IOT_MQTT_HOST"의 값을 IoT Core의 Endpoint로 변경합니다.

![noname](https://user-images.githubusercontent.com/52392004/170382445-dd3aec37-cde7-49aa-8b75-a42e66c81471.png)


6) [Visual Studio Code에 PlatformIO IDE Extension 설치 및 활용](https://github.com/kyopark2014/IoT-Core-Contents/blob/main/edukit-platformio.md)에 따라 Visual Studio Code에서 M5Stack을 디버깅할 수 있는 환경을 만들고 다운로드 받은 "aws-iot-thermometer" 프로젝트를 오픈 합니다.

7) 아래와 같이 [PlatformIO]를 선택하여 [PROJECT TASKS]에서 [Build]와 [Update and Monitor]를 순차적으로 진행합니다. 

![noname](https://user-images.githubusercontent.com/52392004/170312397-c3d7a1f8-5823-4668-acb9-ceedb26376c9.png)

또는 아래와 같이 terminal에서 명령어로 진행 할 수 있습니다. 

-  Build

```c
$ pio run --environment core2foraws
```


- Flash the Firmware and Monitor

```c
$ pio run --environment core2foraws --target upload --target monitor 
```

- Monitoring the device

```c
$ pio run --environment core2foraws --target monitor
```

## 동작 확인

Thermometer 펌웨어가 정상적으로 설치가 되면, M5Stack의 UI는 아래와 같이 우측 상단에 WiFi Icon이 표시가되고, Device device Id와 Connection state가 텍스트로 표시 됩니다.

![image](https://user-images.githubusercontent.com/52392004/171019447-2e9ceed9-4191-4416-8574-203fd18094c6.png)

![noname](https://user-images.githubusercontent.com/52392004/171020765-75e9b485-97d2-4804-8221-0a08fafe1f31.png)




이제, 아래와 같이 IoT Core에서 정상적으로 메시지 수신이 가능한지 확인 합니다. 


1) [AWS IoT] - [MQTT test client]로 진입합니다. 

https://ap-northeast-2.console.aws.amazon.com/iot/home?region=ap-northeast-2#/test

2) 아래와 같이 [Subscribe to a topic]에서 [Topic filter]에 "$aws/things/+/shadow/update"로 입력 후에, [Subscribe]를 선택합니다. 

![noname](https://user-images.githubusercontent.com/52392004/171020452-0e664fb4-2ec4-44b2-a54c-c4139bebaff7.png)

3) 정상적으로 펌웨어 업그레이드가 되었다면, 아래그림처럼 1분 간격으로 Subscriptions에 새로운 Record가 들어옵니다.

![noname](https://user-images.githubusercontent.com/52392004/171017429-afe154c0-3d24-4ca5-b387-50bedaeea259.png)


## 수신된 데이터의 형태 

[M5Stack에서 전송되는 데이터의 형태](https://github.com/kyopark2014/IoT-Core-Contents/blob/main/edukit-thermostat.md)는 아래와 같습니다. 결과는 json 포맷으로 전달되며, "state" / "reported"의 "temperature"항목에 실수형으로 섭씨 온도가 제공되며, IoT device가 구동되는 동안에는 "clientToken"으로 동일데이터인지 확인 할 수 있습니다. 

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
