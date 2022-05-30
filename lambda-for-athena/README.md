# Athena Query

Restful API로 Athena를 query하는 방법에 대해 소개합니다. 

## Configuration

아래와 같이 Athena에서 결과를 저장하는 S3 주소, Glue의 Database 이름과 Athena의 Work Group의 이름을 입력합니다.

```java
const athenaBucket = process.env.athenaBucket; 
const dbName = process.env.dbName; 
const workGroup = process.env.workGroup; 

var clientConfig = {
    bucketUri: athenaBucket,
    database: dbName,
    workGroup: workGroup
}

var awsConfig = {
    region: 'ap-northeast-2', 
}
```

상기 코드에서 참조하는 Environment variables은 [Lambda] - [Configuration] - [Environment Variables]에 입력됩니다.

<img width="610" alt="image" src="https://user-images.githubusercontent.com/52392004/170911263-2b11de30-a1dc-48e3-a751-c4c1f99686bb.png">


## Athena Query

아래와 같이 Athena에 Query를 수행하고 결과를 output으로 준비합니다.

```java
    let sqlStatement = "SELECT * FROM themometer where deviceid = '"+deviceid+"' limit 1000";
    console.log('sql: '+sqlStatement);

    var output = [];

    try {
        let result = await client.execute(sqlStatement).toPromise();
        console.log('result: %j', result);
        console.log('# of items: ', result['records'].length);

        for(let i=0;i<result['records'].length;i++) {
            let record = result['records'][i];

            output.push({
                timestamp: record['timestamp'],
                temperature: record['temperature']
            })
        }
        console.log('output: %j', output);        
        
        isCompleted = true;

    } catch(err) {
        console.log('err: '+err);
    }
```

## Permission

아래와 같은 퍼미션 설정이 필요합니다. 

```java
        {
            "Effect": "Allow",
            "Action": [
                "athena:StartQueryExecution",
                "athena:BatchGetQueryExecution",
                "athena:GetQueryExecution",
                "athena:GetQueryResults",
                "athena:GetQueryResultsStream",
                "athena:ListQueryExecutions",
                "athena:StartQueryExecution",
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
            "Resource": [
                "arn:aws:athena:ap-northeast-2:123456789012:workgroup/primary",
                "arn:aws:athena:ap-northeast-2:123456789012:workgroup/themometer-workgroup"
            ]
        },
        {
            "Effect": "Allow",
            "Action": [
                "glue:GetTable",
                "glue:GetDatabase",
                "glue:GetPartitions"
            ],
            "Resource": [
                "*"
            ]
        },
        {
            "Effect": "Allow",
            "Action": [
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
            "Resource": [
                "arn:aws:s3:::*"
            ]
        }
```        


## 실행 결과 

Athena 조회시 결과는 아래와 같은 포맷으로 전달 됩니다. 

```java
{
    "records": [
        {
            "deviceid": "0123501CB56E162101",
            "timestamp": "1653842630255",
            "temperature": "18.224293",
            "partition_0": "2022",
            "partition_1": "05",
            "partition_2": "29",
            "partition_3": "16"
        },
        {
            "deviceid": "0123501CB56E162101",
            "timestamp": "1653842871137",
            "temperature": "17.841766",
            "partition_0": "2022",
            "partition_1": "05",
            "partition_2": "29",
            "partition_3": "16"
        },
        {
            "deviceid": "0123501CB56E162101",
            "timestamp": "1653842028066",
            "temperature": "18.925083",
            "partition_0": "2022",
            "partition_1": "05",
            "partition_2": "29",
            "partition_3": "16"
        }
    ]
 }
 ```
 
 이를 사용하기 쉽게 timestamp와 temperature만 뽑아서 output으로 전달하면 아래와 같습니다. 
 
 ```java
 [
   {
      "timestamp":"1653842630255",
      "temperature":"18.224293"
   },
   {
      "timestamp":"1653842871137",
      "temperature":"17.841766"
   },
   {
      "timestamp":"1653842028066",
      "temperature":"18.925083"
   }
]   
```

## Reference 
[athena-client - a simple aws athena client for nodejs and typescript](https://github.com/KoteiIto/node-athena)

[JavaScript (SDK V2) Code Examples for Amazon Athena](https://docs.aws.amazon.com/code-samples/latest/catalog/code-catalog-javascript-example_code-athena.html)
