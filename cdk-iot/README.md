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

Lambda for stream 통해 alarm등이 발생하면 이를 처리하는 Amazon SNS을 정의 합니다.

```java
    const topic = new sns.Topic(this, 'sns-iot', {
      topicName: 'sns-iot'
    });
```    

"lambda for stream"은 입력되는 값들을 확인후 필요에 따라 alarm을 발생 할 수 있습니다.

```java
    const lambdaStream = new lambda.Function(this, "LambdaKinesisStream", {
      description: 'get eventinfo from kinesis data stream',
      runtime: lambda.Runtime.NODEJS_14_X, 
      code: lambda.Code.fromAsset("../lambda-for-stream"), 
      handler: "index.handler", 
      timeout: cdk.Duration.seconds(3),
      environment: {
        topicArn: topic.topicArn
      }
    }); 
```

Kinesis data stream의 fan out이 lambda for stream으로 인입되도록 Event Source를 등록합니다.

```java
    const eventSource = new lambdaEventSources.KinesisEventSource(stream, {
      startingPosition: lambda.StartingPosition.TRIM_HORIZON,
    });
    lambdaStream.addEventSource(eventSource);  
```

SNS에서 event를 받아서 slack으로 전달하는 lambda for slack을 정의 합니다. 

```java
    const lambdaSlack = new lambda.Function(this, "LambdaSlack", {
      runtime: lambda.Runtime.NODEJS_14_X, 
      code: lambda.Code.fromAsset("../lambda-for-slack"), 
      handler: "index.handler", 
      timeout: cdk.Duration.seconds(10),
      environment: {
        token: "sample-3205298473938-3233090599600-5Kr8k7W8dieUwoL5d7GekmpJ"
      }
    });    
    lambdaSlack.addEventSource(new SnsEventSource(topic));    
```

## IoT 

IoT Rule에서 사용할 IAM Role을 정의 합니다.

```java
    // Rule Role for IoT
    const ruleRole = new iam.Role(this, "ruleRole", {
      roleName: 'RuleRole',
      assumedBy: new iam.ServicePrincipal("iot.amazonaws.com"),
      description: "Role of Rule for IoT",
    });
    ruleRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        "kinesis:PutRecord",
      ],
      resources: [
        stream.streamArn,
      ],
    }));
```

Kinesis data stream으로 '/shadow/update'에 대한 record를 수집하도록 Rule을 정의 합니다. 

```java
    // defile Rule for IoT
    new iot.CfnTopicRule(this, "TopicRule", {
      topicRulePayload: {
        actions: [
          {
            kinesis: {
              streamName: streamName,
              roleArn: ruleRole.roleArn,   
              partitionKey: '${clientToken}',
            },
          },
        ],
        sql: "SELECT * FROM '$aws/things/+/shadow/update'",
        ruleDisabled: false,
      },
      ruleName: "themometer",
    }); 
```

"lambda for firehose"를 정의 합니다.

```java
    const lambdaFirehose = new lambda.Function(this, "LambdaKinesisFirehose", {
      description: 'update event sources',
      runtime: lambda.Runtime.NODEJS_14_X, 
      code: lambda.Code.fromAsset("../lambda-for-firehose"), 
      handler: "index.handler", 
      timeout: cdk.Duration.seconds(3),
      environment: {
      }
    }); 
```

crawler에 대한 IAM Role을 정의 합니다.

```java
// crawler role 
    const crawlerRole = new iam.Role(this, "crawlerRole", {
      roleName: 'CrawlerRole',
      assumedBy: new iam.ServicePrincipal("glue.amazonaws.com"),
      description: "Role for crawler",
    });
    crawlerRole.addManagedPolicy({
      managedPolicyArn: 'arn:aws:iam::aws:policy/service-role/AWSGlueServiceRole',
    });  
    crawlerRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        "s3:AbortMultipartUpload",
        "s3:GetBucketLocation",
        "s3:GetObject",
        "s3:ListBucket",
        "s3:ListBucketMultipartUploads",
        "s3:PutObject"
      ],
      resources: [
        s3Bucket.bucketArn,
        s3Bucket.bucketArn + "/*"
      ],
    }));
```

    
