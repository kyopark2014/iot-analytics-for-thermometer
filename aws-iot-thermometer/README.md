#  AWS Edukit(M5Stack) Upgreade 

여기서는 AWS IoT EduKit을 이용하여 온도 데이터를 json으로 AWS IoT Core로 전송하는 방법을 설명합니다. 

## Thermometer용 펌웨어로 AWS Edukit Upgrade 방법
 
1) [Device 인증서 생성](https://github.com/kyopark2014/IoT-Core-Contents/blob/main/certification.md)을 참조하여 M5Stack을 위한 인증서를 생성합니다. 이 과정을 진행하면, "M5Stack.cert.pem", "M5Stack.private.key", "M5Stack.public.key", "AmazonRootCA1.cer"가 생성됩니다.

2) 아래와 같이 [M5Stack](https://github.com/kyopark2014/IoT-Core-Contents/blob/main/m5stack.md)로 Thermometer로 동작시키기 위한 git 소스를 다운로드 합니다. 

```c
$ git clone https://github.com/kyopark2014/iot-analytics-for-thermometer
```

3) 아래와 같이 "main/certs" 폴더에 "aws-root-ca.pem", "certificate.pem.crt", "private.pem.key"을 생성합니다. 이때, "aws-root-ca.pem"은 "AmazonRootCA1.cer", "certificate.pem.crt"은 "M5Stack.cert.pem", "private.pem.key"은 "M5Stack.private.key"와 동일한 파일이므로, 파일을 열어서 동일하게 복사하여 줍니다.

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
