# IoT Analytics


여기서는 [AWS Edukit](https://github.com/kyopark2014/IoT-Core-Contents/blob/main/m5stack.md)을 이용하여 AWS IoT Core와 Data Analytics을 이용하여 IoT 센서로부터 데이터를 수집하는 과정을 설명합니다. 전체적인 Architecture는 아래와 같습니다.

<img width="748" alt="image" src="https://user-images.githubusercontent.com/52392004/169610690-feaed370-ee55-4bc5-b4a4-103fbd6f63d6.png">



## 설치 및 실행

1) 아래와 같이 git을 다운로드 합니다. 

```c
$ git clone https://github.com/kyopark2014/iot-analytics
```

2) [Device 인증서 생성](https://github.com/kyopark2014/IoT-Core-Contents/blob/main/certification.md)을 참조하여 M5Stack을 위한 인증서를 생성합니다. 이 과정을 진행하면, "M5Stack.cert.pem", "M5Stack.private.key", "M5Stack.public.key", "AmazonRootCA1.cer"가 생성됩니다.

3) 아래와 같이 "main/certs" 폴더에 "aws-root-ca.pem", "certificate.pem.crt", "private.pem.key"을 생성합니다. 이때, "aws-root-ca.pem"은 "AmazonRootCA1.cer", "certificate.pem.crt"은 "M5Stack.cert.pem", "private.pem.key"은 "M5Stack.private.key"와 동일한 파일이므로, 파일을 열어서 동일하게 복사하여 줍니다.

![noname](https://user-images.githubusercontent.com/52392004/170308677-41474fe7-935c-40c0-ac0d-1b8051000751.png)

4) [Visual Studio Code에 PlatformIO IDE Extension 설치 및 활용](https://github.com/kyopark2014/IoT-Core-Contents/blob/main/edukit-platformio.md)에 따라 Visual Studio Code에서 M5Stack을 디버깅할 수 있는 환경을 만들고 다운로드 받은 "aws-iot-thermostat" 프로젝트를 오픈 합니다.

5) 아래와 같이 [PlatformIO]를 선택하여 [PROJECT TASKS]에서 [Build]와 [Update and Monitor]를 순차적으로 진행합니다. 

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
