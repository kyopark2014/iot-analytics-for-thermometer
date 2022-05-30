# Athena로 IoT 데이터 조회

여기에서는 AWS Glue Data catalog의 Crawsler를 이용해 생성한 table과 database를 이용해, athena에서 S3에 저장된 IoT 데이터를 조회하는것을 설명하고자 합니다. 


1) [Amazon Athena] - [Workgroups]에 진입하면 아래와 같이 "themometer-workgroup"이 생성되어 있는것을 확인 할 수 있습니다. "themometer-workgroup"에는 Athena에서 Query시 결과를 저장하는 S3 주소를 포함하고 있습니다.

![noname](https://user-images.githubusercontent.com/52392004/171032372-f09ba744-3aa4-4b43-bd6b-15c28ddc7450.png)

2) 좌측 매뉴에서 [Query editor]을 선택 후에, [Workgroup]에서 "thermometer"를 선택합니다. 이후, Query문에 "select * from themometer where deviceid = [Device Id]"로 입력 후에 [Run]을 선택합니다. 

![noname](https://user-images.githubusercontent.com/52392004/171033042-ab085370-21e9-47e9-98a9-b93b968f636d.png)

3) 이때, Athena에서 조회한 결과는 아래와 같습니다. 

<img width="975" alt="image" src="https://user-images.githubusercontent.com/52392004/170881634-c026bf72-8b4d-4c1a-af11-a87af5bf3025.png">
