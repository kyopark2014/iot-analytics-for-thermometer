# Temporature를 모니터링하고 Alarm 발생을 위한 Lambda

AWS Kinesis Data Streams는 IoT devices로부터 생성된 데이터를 Queue형태로 저장 후 필요할때 사용할 수 있습니다. 여기서는 Lambda를 이용하여 Kinesis Data Streams의 데이터를 받은 후에 모니터링 하다가 일정이상의 값인 경우에 Alarm을 생성하는것을 설명하고자 합니다. 
