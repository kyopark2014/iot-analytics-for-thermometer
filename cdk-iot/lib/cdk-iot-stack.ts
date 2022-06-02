import { Arn, Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';

import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3Deploy from "aws-cdk-lib/aws-s3-deployment"
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as kinesisstream from 'aws-cdk-lib/aws-kinesis';
import * as kinesisfirehose from 'aws-cdk-lib/aws-kinesisfirehose';
import {SnsEventSource} from 'aws-cdk-lib/aws-lambda-event-sources'
import * as sns from 'aws-cdk-lib/aws-sns';
import * as subscriptions from 'aws-cdk-lib/aws-sns-subscriptions';

import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambdaEventSources from 'aws-cdk-lib/aws-lambda-event-sources';
import * as cfn from 'aws-cdk-lib/aws-cloudformation';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as glue from 'aws-cdk-lib/aws-glue'
import * as athena from 'aws-cdk-lib/aws-athena'
import * as iot from 'aws-cdk-lib/aws-iot';
import * as apiGateway from 'aws-cdk-lib/aws-apigateway';
import { IResource, LambdaIntegration, MockIntegration, PassthroughBehavior, RestApi } from 'aws-cdk-lib/aws-apigateway';
import * as cloudFront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';


export class CdkIotStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // S3
    const s3Bucket = new s3.Bucket(this, "thermometer-storage",{
      bucketName: "s3-themometer-storage",
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      publicReadAccess: false,
      versioned: false,
    });
    new cdk.CfnOutput(this, 'StorageBucketName', {
      value: s3Bucket.bucketName,
      description: 'The nmae of bucket',
    });
    new cdk.CfnOutput(this, 's3Arn', {
      value: s3Bucket.bucketArn,
      description: 'The arn of s3',
    });
    new cdk.CfnOutput(this, 's3Path', {
      value: 's3://'+s3Bucket.bucketName,
      description: 'The path of s3',
    });

    // S3
    const s3Web = new s3.Bucket(this, "themometer-web",{
      bucketName: "s3-themometer-web",
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      publicReadAccess: false,
      versioned: false,
    });
    new cdk.CfnOutput(this, 'WebBucketName', {
      value: s3Web.bucketName,
      description: 'The nmae of bucket',
    });
    
    new s3Deploy.BucketDeployment(this, "DeployReactApp", {
      sources: [s3Deploy.Source.asset("../webclient")],
      destinationBucket: s3Web,
    })
    
    // kinesis data stream
    const streamName = 'themometer';
    const stream = new kinesisstream.Stream(this, 'Stream', {
      streamName: streamName,
      retentionPeriod: cdk.Duration.hours(48),
      encryption: kinesisstream.StreamEncryption.UNENCRYPTED, 
      streamMode: kinesisstream.StreamMode.ON_DEMAND
    });
    new cdk.CfnOutput(this, 'StreamARN', {
      value: stream.streamArn,
      description: 'The arn of kinesis stream',
    });
    // using pre-defined metric method
    stream.metricGetRecordsSuccess();
    stream.metricPutRecordSuccess();

    // SNS
    const topic = new sns.Topic(this, 'sns-iot', {
      topicName: 'sns-iot'
    });
    topic.addSubscription(new subscriptions.EmailSubscription('storytimebot21@gmail.com'));
    new cdk.CfnOutput(this, 'snsTopicArn', {
      value: topic.topicArn,
      description: 'The arn of the SNS topic',
    });

    // Lambda for stream 
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

    // "lambda for stream" is connected with kinesis event source
    const eventSource = new lambdaEventSources.KinesisEventSource(stream, {
      startingPosition: lambda.StartingPosition.TRIM_HORIZON,
    });
    lambdaStream.addEventSource(eventSource);  

    // Lambda - Slack
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
    new cdk.CfnOutput(this, 'RuleRoleArn', {
      value: ruleRole.roleArn,
      description: 'The arn of RuleRole for IoT',
    });

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

    // Lambda for firehose 
    const lambdaFirehose = new lambda.Function(this, "LambdaKinesisFirehose", {
      description: 'update event sources',
      runtime: lambda.Runtime.NODEJS_14_X, 
      code: lambda.Code.fromAsset("../lambda-for-firehose"), 
      handler: "index.handler", 
      timeout: cdk.Duration.seconds(3),
      environment: {
      }
    }); 
    new cdk.CfnOutput(this, 'LambdaKinesisARN', {
      value: lambdaFirehose.functionArn,
      description: 'The arn of lambda for kinesis',
    });

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
    new cdk.CfnOutput(this, 'crawlerRoleArn', {
      value: crawlerRole.roleArn,
      description: 'The arn of crawlerRole',
    });
    
    // crawler to generate a table
    const glueDatabaseName = "themometerDb";
    new glue.CfnCrawler(this, "TranslateRecords", {
      name: "translate-records",
      role: crawlerRole.roleArn,
      targets: {
          s3Targets: [
              {path: 's3://'+s3Bucket.bucketName+'/themometer'}, 
          ]
      },
      databaseName: glueDatabaseName,
      schemaChangePolicy: {
          deleteBehavior: 'DELETE_FROM_DATABASE'
      },      
    });

    // Traslation Role
    const translationRole = new iam.Role(this, 'TranslationRole', {
      roleName: 'TranslationRole',
      assumedBy: new iam.ServicePrincipal("firehose.amazonaws.com"),
      description: 'TraslationRole',
    });
    translationRole.addManagedPolicy({
      managedPolicyArn: 'arn:aws:iam::aws:policy/AWSLambdaExecute',
    });  
    translationRole.addManagedPolicy({
      managedPolicyArn: 'arn:aws:iam::aws:policy/service-role/AWSLambdaKinesisExecutionRole',
    });
    translationRole.addManagedPolicy({
      managedPolicyArn: 'arn:aws:iam::aws:policy/service-role/AWSGlueServiceRole',
    });
    translationRole.addToPolicy(new iam.PolicyStatement({
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
    translationRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        "lambda:InvokeFunction", 
        "lambda:GetFunctionConfiguration", 
      ],
      resources: [
        lambdaFirehose.functionArn, 
        lambdaFirehose.functionArn+':*'],
    }));
    translationRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        "glue:GetTable",
        "glue:GetTableVersion",
        "glue:GetTableVersions"
      ],
      resources: ['*'],
    }));

    // firhose
    new kinesisfirehose.CfnDeliveryStream(this, 'FirehoseDeliveryStream', {
      deliveryStreamType: 'KinesisStreamAsSource',
      kinesisStreamSourceConfiguration: {
        kinesisStreamArn: stream.streamArn,
        roleArn: translationRole.roleArn,
      },      
      extendedS3DestinationConfiguration: {
        bucketArn: s3Bucket.bucketArn,
        bufferingHints: {
          intervalInSeconds: 60,
          sizeInMBs: 128    // mininum 64MBs at data format conversion 
        },
        compressionFormat: 'UNCOMPRESSED', // GZIP, SNAPPY
        encryptionConfiguration: {
          noEncryptionConfig: "NoEncryption"
        },
        prefix: "themometer/",
        errorOutputPrefix: 'eror/',
        roleArn: translationRole.roleArn,
        processingConfiguration: {
          enabled: true,
          processors: [{
            type: 'Lambda',
              parameters: [{
              parameterName: 'LambdaArn',
              parameterValue: lambdaFirehose.functionArn
            }]
          }]
        }, 
        dataFormatConversionConfiguration: {          
          enabled: false, 
          schemaConfiguration: {
            databaseName: glueDatabaseName, // Glue database name
            roleArn: translationRole.roleArn,
            tableName: 'themometer' // Glue table name
          }, 
        }, 
      }
    });    

    // athena workgroup
    let workGroupName = 'themometer-workgroup';
    const workgroup = new athena.CfnWorkGroup(this, 'analytics-athena-workgroup', {
      name: workGroupName,
      description: 'athena working group',
      recursiveDeleteOption: true,
      state: 'ENABLED',
      workGroupConfiguration: {
        resultConfiguration: {
          outputLocation: `s3://${s3Bucket.bucketName}`,
        },
      },
    }) 
    new cdk.CfnOutput(this, 'workgroupArn', { 
      value: `arn:aws:athena:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:workgroup/${workGroupName}`,
      description: 'The arn of workgroup',
    });
      
    // Athena Role to query 
    const athenaRole = new iam.Role(this, "athenaRole", {
      roleName: 'AthenaRole',
      assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
      description: "Athena Role",
    });
    athenaRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        "athena:StartQueryExecution",
        "athena:BatchGetQueryExecution",
        "athena:GetQueryExecution",
        "athena:GetQueryResults",
        "athena:GetQueryResultsStream",
        "athena:ListQueryExecutions",
        "athena:StopQueryExecution",
        "athena:ListWorkGroups",
        "athena:ListEngineVersions",
        "athena:GetWorkGroup",
        "athena:GetDataCatalog",
        "athena:GetDatabase",
        "athena:GetTableMetadata",
        "athena:ListDataCatalogs",
        "athena:ListDatabases",
        "athena:ListTableMetadata"
      ],
      resources: [
        `arn:aws:athena:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:workgroup/primary`,
        `arn:aws:athena:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:workgroup/${workGroupName}`
      ],
    }));
    athenaRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        "glue:GetTable",
        "glue:GetDatabase",
        "glue:GetPartitions"
      ],
      resources: ['*'],
    }));
    athenaRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        "s3:GetBucketLocation",
        "s3:GetObject",
        "s3:GetBucketLocation",
        "s3:ListBucket",
        "s3:ListBucketMultipartUploads",
        "s3:ListMultipartUploadParts",
        "s3:AbortMultipartUpload",
        "s3:CreateBucket",
        "s3:PutObject",
        "s3:PutBucketPublicAccessBlock"
      ],
      resources: [
        s3Bucket.bucketArn,
        s3Bucket.bucketArn + "/*"
      ],
    }));
    athenaRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      resources: [
        `arn:aws:logs:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:*`
      ],
    }));
    new cdk.CfnOutput(this, 'AthenaRoleArn', {
      value: athenaRole.roleArn,
      description: 'The arn of AthenaRole',
    });
    
    // Lambda for athena 
    const lambdaAthena = new lambda.Function(this, "LambdaAthena", {
      description: 'query athena',
      runtime: lambda.Runtime.NODEJS_14_X, 
      code: lambda.Code.fromAsset("../lambda-for-athena"), 
      role: athenaRole,
      handler: "index.handler", 
      timeout: cdk.Duration.seconds(20),
      environment: {
        athenaBucket: s3Bucket.bucketArn,
        dbName: glueDatabaseName,
        workGroup: workGroupName
      }
    }); 
    new cdk.CfnOutput(this, 'LambdaAthenaARN', {
      value: lambdaAthena.functionArn,
      description: 'The arn of lambda for athena',
    });

    // API GATEWAY
    const stage = "dev";

    // log group api
    const logGroup = new logs.LogGroup(this, 'AccessLogs', {
      retention: 90, // Keep logs for 90 days
    });
    logGroup.grantWrite(new iam.ServicePrincipal('apigateway.amazonaws.com')); 

    // api-role
    const role = new iam.Role(this, "api-role", {
      roleName: "ApiRole",
      assumedBy: new iam.ServicePrincipal("apigateway.amazonaws.com")
    });
    role.addToPolicy(new iam.PolicyStatement({
      resources: ['*'],
      actions: ['lambda:InvokeFunction']
    }));
    role.addManagedPolicy({
      managedPolicyArn: 'arn:aws:iam::aws:policy/AWSLambdaExecute',
    }); 

    // define api gateway
    const api = new apiGateway.RestApi(this, 'api-thermometer', {
      description: 'API Gateway',
      endpointTypes: [apiGateway.EndpointType.REGIONAL],
      defaultMethodOptions: {
        authorizationType: apiGateway.AuthorizationType.NONE
      },
    /*  defaultCorsPreflightOptions: {
        allowOrigins: apiGateway.Cors.ALL_ORIGINS,
        allowMethods: apiGateway.Cors.ALL_METHODS // this is also the default
      }, */
    //  binaryMediaTypes: ['*/*'], 
      deployOptions: {
        stageName: stage,
        accessLogDestination: new apiGateway.LogGroupLogDestination(logGroup),
        accessLogFormat: apiGateway.AccessLogFormat.jsonWithStandardFields({
          caller: false,
          httpMethod: true,
          ip: true,
          protocol: true,
          requestTime: true,
          resourcePath: true,
          responseLength: true,
          status: true,
          user: true
        }),
      },
    //  proxy: false
    });   

    lambdaAthena.grantInvoke(new iam.ServicePrincipal('apigateway.amazonaws.com'));

    const templateString: string = `##  See http://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-mapping-template-reference.html
    ##  This template will pass through all parameters including path, querystring, header, stage variables, and context through to the integration endpoint via the body/payload
    #set($allParams = $input.params())
    {
    "body-json" : $input.json('$'),
    "params" : {
    #foreach($type in $allParams.keySet())
        #set($params = $allParams.get($type))
    "$type" : {
        #foreach($paramName in $params.keySet())
        "$paramName" : "$util.escapeJavaScript($params.get($paramName))"
            #if($foreach.hasNext),#end
        #end
    }
        #if($foreach.hasNext),#end
    #end
    },
    "stage-variables" : {
    #foreach($key in $stageVariables.keySet())
    "$key" : "$util.escapeJavaScript($stageVariables.get($key))"
        #if($foreach.hasNext),#end
    #end
    },
    "context" : {
        "account-id" : "$context.identity.accountId",
        "api-id" : "$context.apiId",
        "api-key" : "$context.identity.apiKey",
        "authorizer-principal-id" : "$context.authorizer.principalId",
        "caller" : "$context.identity.caller",
        "cognito-authentication-provider" : "$context.identity.cognitoAuthenticationProvider",
        "cognito-authentication-type" : "$context.identity.cognitoAuthenticationType",
        "cognito-identity-id" : "$context.identity.cognitoIdentityId",
        "cognito-identity-pool-id" : "$context.identity.cognitoIdentityPoolId",
        "http-method" : "$context.httpMethod",
        "stage" : "$context.stage",
        "source-ip" : "$context.identity.sourceIp",
        "user" : "$context.identity.user",
        "user-agent" : "$context.identity.userAgent",
        "user-arn" : "$context.identity.userArn",
        "request-id" : "$context.requestId",
        "resource-id" : "$context.resourceId",
        "resource-path" : "$context.resourcePath"
        }
    }`    
    const requestTemplates = { // path through
      "image/jpeg": templateString,
      "image/jpg": templateString,
      "application/octet-stream": templateString,
      "image/png" : templateString
    }
    
    const status = api.root.addResource('status');

    status.addMethod('GET', new apiGateway.LambdaIntegration(lambdaAthena, {
      passthroughBehavior: apiGateway.PassthroughBehavior.WHEN_NO_TEMPLATES,  // options: NEVER
      credentialsRole: role,
    //  requestTemplates: requestTemplates,
      integrationResponses: [{
        statusCode: '200',
      }], 
      proxy:false, 
    }), {
      methodResponses: [   // API Gateway sends to the client that called a method.
        {
          statusCode: '200',
          responseModels: {
            'application/json': apiGateway.Model.EMPTY_MODEL,
          }, 
        }
      ]
    }); 

    addCorsOptions(status);
    
    new cdk.CfnOutput(this, 'apiUrl', {
      value: api.url,
      description: 'The url of API Gateway',
    });

    // cloudfront
    const distribution = new cloudFront.Distribution(this, 'cloudfront', {
      defaultBehavior: {
        origin: new origins.S3Origin(s3Web),
        allowedMethods: cloudFront.AllowedMethods.ALLOW_ALL,
        viewerProtocolPolicy: cloudFront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      },
      priceClass: cloudFront.PriceClass.PRICE_CLASS_200,  
    });
    distribution.addBehavior("/status", new origins.RestApiOrigin(api), {
      viewerProtocolPolicy: cloudFront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
    });    

    new cdk.CfnOutput(this, 'distributionDomainName', {
      value: distribution.domainName,
      description: 'The domain name of the Distribution',
    }); 

  /*  const apiGateway2 = new apiGateway.LambdaRestApi(this, 'LambdaRestApi', {
      handler: lambdaAthena,
      endpointConfiguration: {
        types: [apiGateway.EndpointType.REGIONAL]
      },
      defaultMethodOptions: {
        authorizationType: apiGateway.AuthorizationType.NONE
      }
    });
    new CloudFrontToApiGateway(this, 'test-cloudfront-apigateway', {
      existingApiGatewayObj: apiGateway2
    }); */
  }
}

export function addCorsOptions(apiResouce: IResource) {
  // CORS
  apiResouce.addMethod('OPTIONS', new MockIntegration({
    integrationResponses: [{ 
      statusCode: '200',
        responseParameters: {
          'method.response.header.Access-Control-Allow-Headers': "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'",
          'method.response.header.Access-Control-Allow-Origin': "'*'",
          'method.response.header.Access-Control-Allow-Credentials': "'false'",
          'method.response.header.Access-Control-Allow-Methods': "'OPTIONS,GET,PUT,POST,DELETE'",
        }
      },
    ],
    passthroughBehavior: apiGateway.PassthroughBehavior.WHEN_NO_MATCH,
    requestTemplates: {
      'application/json': '{ "statusCode": 200 }',
    },
  }), {
    methodResponses: [{ 
        statusCode: '200',
        responseParameters: {
          'method.response.header.Access-Control-Allow-Headers': true,
          'method.response.header.Access-Control-Allow-Methods': true,
          'method.response.header.Access-Control-Allow-Credentials': true,
          'method.response.header.Access-Control-Allow-Origin': true,
        }, 
      },
    ],
  });   
}

