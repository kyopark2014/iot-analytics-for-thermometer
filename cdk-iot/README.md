# AWS CDK로 IoT 분석 환경 구축하기 

Thermometer가 MQTT를 이용해 IoT Core로 전송되면 이를 저장하는 S3를 아래와 같이 정의 합니다. 

```java
    const s3Bucket = new s3.Bucket(this, "thermometer-storage",{
      bucketName: "s3-themometer-storage",
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      publicReadAccess: false,
      versioned: false,
    });
```    

브라우저에서 구동되는 Web Client의 resource들을 저장하는 S3를 선언합니다.

```java
    const s3Web = new s3.Bucket(this, "themometer-web",{
      bucketName: "s3-themometer-web",
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      publicReadAccess: false,
      versioned: false,
    });
```    

Queue처럼 IoT Core를 통해 인입되는 데이터를 저장하는 Kinesis data stream을 정의 합니다.

```java
    // kinesis data stream
    const streamName = 'themometer';
    const stream = new kinesisstream.Stream(this, 'Stream', {
      streamName: streamName,
      retentionPeriod: cdk.Duration.hours(48),
      encryption: kinesisstream.StreamEncryption.UNENCRYPTED, 
      streamMode: kinesisstream.StreamMode.ON_DEMAND
    });
```    
``
    const topic = new sns.Topic(this, 'sns-iot', {
      topicName: 'sns-iot'
    });
