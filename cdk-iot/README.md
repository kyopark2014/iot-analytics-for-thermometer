# AWS CDK

여기에서는 [AWS CDK](https://github.com/kyopark2014/technical-summary/blob/main/cdk-introduction.md)를 이용해 Temperature Analytic Environment를 위한 infra structure를 구성합니다. 

## Amazon S3

'themometer'라는 prefix로 Amazon S3를 정의합니다. 실제 생성된 S3 bucket 이름은 "cdkiotstack-themometerccbbc1ec-1dixhn1vbe410"와 같이 중복을 피하기 우하여 cdk project 이름과 s3 prefix를 조합후 random값을 추가하여 구성됩니다. 

```java
    const s3Bucket = new s3.Bucket(this, "themometer",{
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      publicReadAccess: false,
      versioned: false,
    });
```

## Kinesis Data Stream

Kinesis Data Stream을 아래와 같이 구성합니다. retentionPeriod를 정의하면 해당 기간동안 shard에 저장된 값이 보존되어, 추가적으로 fanout component가 추가시 사용 할 수 있습니다. 

```java
    const streamName = 'themometer';
    const stream = new kinesisstream.Stream(this, 'Stream', {
      streamName: streamName,
      retentionPeriod: cdk.Duration.hours(48),
      encryption: kinesisstream.StreamEncryption.UNENCRYPTED, 
      streamMode: kinesisstream.StreamMode.ON_DEMAND
    });
```

## Lambda for Stream

"Lambda for Kinesis"는 Kinesis Data Streams의 fanout으로 Iot Core로 인입된 데이터를 수집합니다. 아래와 같이 lambdaEventSource로 Kinesis Event Source를 stream으로 받게 됩니다. 

```java
    const lambdaStream = new lambda.Function(this, "LambdaKinesisStream", {
      description: 'get eventinfo from kinesis data stream',
      runtime: lambda.Runtime.NODEJS_14_X, 
      code: lambda.Code.fromAsset("../lambda-for-stream"), 
      handler: "index.handler", 
      timeout: cdk.Duration.seconds(3),
      environment: {
      }
    }); 

    // connect lambda for kinesis with kinesis data stream
    const eventSource = new lambdaEventSources.KinesisEventSource(stream, {
      startingPosition: lambda.StartingPosition.TRIM_HORIZON,
    });
    lambdaStream.addEventSource(eventSource);  
```
