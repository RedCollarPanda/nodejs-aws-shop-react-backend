import * as cdk from "aws-cdk-lib";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as s3n from "aws-cdk-lib/aws-s3-notifications";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as nodejs from "aws-cdk-lib/aws-lambda-nodejs";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as sqs from "aws-cdk-lib/aws-sqs";
import { Construct } from "constructs";
import * as path from "path";

export class ImportServiceStack extends cdk.Stack {
  public readonly bucket: s3.Bucket;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    this.bucket = new s3.Bucket(this, "ImportBucket", {
      bucketName: `import-service-bucket-${this.account}-${this.region}`,
      cors: [
        {
          allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.PUT],
          allowedOrigins: ["*"],
          allowedHeaders: ["*"],
        },
      ],
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    const importProductsFile = new nodejs.NodejsFunction(this, "ImportProductsFile", {
      runtime: lambda.Runtime.NODEJS_22_X,
      entry: path.join(__dirname, "../src/handlers/importProductsFile.ts"),
      handler: "handler",
      functionName: "importProductsFile",
      bundling: { forceDockerBundling: false },
      environment: {
        BUCKET_NAME: this.bucket.bucketName,
      },
    });

    this.bucket.grantPut(importProductsFile, "uploaded/*");

    const catalogItemsQueue = sqs.Queue.fromQueueAttributes(this, "CatalogItemsQueue", {
      queueUrl: cdk.Fn.importValue("CatalogItemsQueueUrl"),
      queueArn: cdk.Fn.importValue("CatalogItemsQueueArn"),
    });

    const importFileParser = new nodejs.NodejsFunction(this, "ImportFileParser", {
      runtime: lambda.Runtime.NODEJS_22_X,
      entry: path.join(__dirname, "../src/handlers/importFileParser.ts"),
      handler: "handler",
      functionName: "importFileParser",
      bundling: { forceDockerBundling: false },
      environment: {
        BUCKET_NAME: this.bucket.bucketName,
        SQS_QUEUE_URL: catalogItemsQueue.queueUrl,
      },
    });

    this.bucket.grantRead(importFileParser, "uploaded/*");
    this.bucket.grantPut(importFileParser, "parsed/*");
    this.bucket.grantDelete(importFileParser, "uploaded/*");
    catalogItemsQueue.grantSendMessages(importFileParser);

    this.bucket.addEventNotification(
      s3.EventType.OBJECT_CREATED,
      new s3n.LambdaDestination(importFileParser),
      { prefix: "uploaded/" }
    );

    const basicAuthorizerArn = cdk.Fn.importValue("BasicAuthorizerArn");
    const basicAuthorizerFn = lambda.Function.fromFunctionAttributes(
      this,
      "BasicAuthorizerFn",
      {
        functionArn: basicAuthorizerArn,
        sameEnvironment: true,
      }
    );

    const authorizer = new apigateway.TokenAuthorizer(this, "BasicTokenAuthorizer", {
      handler: basicAuthorizerFn,
      identitySource: apigateway.IdentitySource.header("Authorization"),
    });

    const api = new apigateway.RestApi(this, "ImportApi", {
      restApiName: "Import Service",
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
      },
    });

    api.addGatewayResponse("Unauthorized", {
      type: apigateway.ResponseType.UNAUTHORIZED,
      responseHeaders: {
        "Access-Control-Allow-Origin": "'*'",
        "Access-Control-Allow-Headers": "'*'",
      },
    });

    api.addGatewayResponse("AccessDenied", {
      type: apigateway.ResponseType.ACCESS_DENIED,
      responseHeaders: {
        "Access-Control-Allow-Origin": "'*'",
        "Access-Control-Allow-Headers": "'*'",
      },
    });

    const importResource = api.root.addResource("import");
    importResource.addMethod(
      "GET",
      new apigateway.LambdaIntegration(importProductsFile),
      {
        authorizer,
        authorizationType: apigateway.AuthorizationType.CUSTOM,
        requestParameters: {
          "method.request.querystring.name": true,
        },
      }
    );

    new cdk.CfnOutput(this, "BucketName", {
      value: this.bucket.bucketName,
      description: "Import Service S3 Bucket Name",
    });

    new cdk.CfnOutput(this, "ApiUrl", {
      value: api.url,
      description: "Import Service API URL",
    });
  }
}
