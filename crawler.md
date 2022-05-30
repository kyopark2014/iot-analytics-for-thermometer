# AWS Glue에서 Table 생성

여기에서는 AWS Glue Data catalog의 Crawler를 이용하여 Json 포맷의 Schema 분석을 위한 정규화 Table을 생성하고자 합니다. 

1) [AWS Glue] - [Data catalog] - [Crawlers]로 이동합니다. 

https://ap-northeast-2.console.aws.amazon.com/glue/home?region=ap-northeast-2#catalog:tab=crawlers

2) CDK로 인프라 생성시, 아래와 같이 "traslate-records"라는 파일이 생성되어 있습니다. 여기에는 Glue Database로 "themometer"를 이용하고, Glue에서 사용할 S3 bucket 및 IAM Role에 대한 정보가 포함되어 있습니다.

아래 그림과 같이 "translate-records"를 선택 후에, [Run crawler]를 선택합니다. 

![noname](https://user-images.githubusercontent.com/52392004/171030160-c648d13d-ee4c-4f44-9af3-ead17e90b90f.png)

이후 [Status]가 "ready" - "Starting" - "Stopping" - "Ready"로 전환되고 아래와 같이 "Table added"가 1로 변경됩니다.

![noname](https://user-images.githubusercontent.com/52392004/171030839-f520b70b-e523-48e7-8282-eb6fbb93d072.png)

3) 좌측 메뉴에서 [Tables]를 선택하면 아래처럼 "thermometer"라는 Table이 생성된것을 확인 할 수 있습니다. 

![noname](https://user-images.githubusercontent.com/52392004/171031162-0bb10098-68fd-4f6e-8a98-c8116f734b95.png)

4) "themometer"를 선택하면 아래와 같이 json파일의 Schema를 확인 할 수 있습니다.

![image](https://user-images.githubusercontent.com/52392004/171031233-85883516-7fdb-4194-b8f1-63ed447b7db0.png)

