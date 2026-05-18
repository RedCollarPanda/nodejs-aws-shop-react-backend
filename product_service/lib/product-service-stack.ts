import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as nodejs from "aws-cdk-lib/aws-lambda-nodejs";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as sqs from "aws-cdk-lib/aws-sqs";
import * as sns from "aws-cdk-lib/aws-sns";
import * as snsSubscriptions from "aws-cdk-lib/aws-sns-subscriptions";
import * as lambdaEventSources from "aws-cdk-lib/aws-lambda-event-sources";
import { Construct } from "constructs";
import * as path from "path";

export class ProductServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const snsEmail = process.env.SNS_EMAIL;
    if (!snsEmail) throw new Error("SNS_EMAIL environment variable is required");

    // For the filtered subscription we use a Gmail '+' subaddress so CDK gets a unique construct ID
    // while mail still lands in the same inbox (kitcpp+highprice@gmail.com → kitcpp@gmail.com)
    const snsEmailFiltered = snsEmail.replace("@", "+highprice@");

    const productsTable = new dynamodb.Table(this, "ProductsTable", {
      tableName: "products",
      partitionKey: { name: "id", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const stocksTable = new dynamodb.Table(this, "StocksTable", {
      tableName: "stocks",
      partitionKey: { name: "product_id", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const catalogItemsQueue = new sqs.Queue(this, "CatalogItemsQueue", {
      queueName: "catalogItemsQueue",
      visibilityTimeout: cdk.Duration.seconds(30),
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const createProductTopic = new sns.Topic(this, "CreateProductTopic", {
      topicName: "createProductTopic",
    });

    createProductTopic.addSubscription(
      new snsSubscriptions.EmailSubscription(snsEmail)
    );

    // Second subscription with filter: price > 100
    createProductTopic.addSubscription(
      new snsSubscriptions.EmailSubscription(snsEmailFiltered, {
        filterPolicyWithMessageBody: {
          price: sns.FilterOrPolicy.filter(
            sns.SubscriptionFilter.numericFilter({ greaterThan: 100 })
          ),
        },
      })
    );

    const commonEnv = {
      PRODUCTS_TABLE_NAME: productsTable.tableName,
      STOCKS_TABLE_NAME: stocksTable.tableName,
    };

    const getProductsList = new nodejs.NodejsFunction(this, "GetProductsList", {
      runtime: lambda.Runtime.NODEJS_22_X,
      entry: path.join(__dirname, "../src/handlers/getProductsList.ts"),
      handler: "handler",
      functionName: "getProductsList",
      bundling: { forceDockerBundling: false },
      environment: commonEnv,
    });

    const getProductsById = new nodejs.NodejsFunction(this, "GetProductsById", {
      runtime: lambda.Runtime.NODEJS_22_X,
      entry: path.join(__dirname, "../src/handlers/getProductsById.ts"),
      handler: "handler",
      functionName: "getProductsById",
      bundling: { forceDockerBundling: false },
      environment: commonEnv,
    });

    const createProduct = new nodejs.NodejsFunction(this, "CreateProduct", {
      runtime: lambda.Runtime.NODEJS_22_X,
      entry: path.join(__dirname, "../src/handlers/createProduct.ts"),
      handler: "handler",
      functionName: "createProduct",
      bundling: { forceDockerBundling: false },
      environment: commonEnv,
    });

    const catalogBatchProcess = new nodejs.NodejsFunction(this, "CatalogBatchProcess", {
      runtime: lambda.Runtime.NODEJS_22_X,
      entry: path.join(__dirname, "../src/handlers/catalogBatchProcess.ts"),
      handler: "handler",
      functionName: "catalogBatchProcess",
      bundling: { forceDockerBundling: false },
      environment: {
        ...commonEnv,
        SNS_TOPIC_ARN: createProductTopic.topicArn,
      },
    });

    catalogBatchProcess.addEventSource(
      new lambdaEventSources.SqsEventSource(catalogItemsQueue, { batchSize: 5 })
    );

    productsTable.grantReadData(getProductsList);
    productsTable.grantReadData(getProductsById);
    stocksTable.grantReadData(getProductsList);
    stocksTable.grantReadData(getProductsById);
    productsTable.grantWriteData(createProduct);
    stocksTable.grantWriteData(createProduct);
    productsTable.grantWriteData(catalogBatchProcess);
    stocksTable.grantWriteData(catalogBatchProcess);
    createProductTopic.grantPublish(catalogBatchProcess);

    const api = new apigateway.RestApi(this, "ProductsApi", {
      restApiName: "Product Service",
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
      },
    });

    const products = api.root.addResource("products");
    products.addMethod("GET", new apigateway.LambdaIntegration(getProductsList));
    products.addMethod("POST", new apigateway.LambdaIntegration(createProduct));

    const productById = products.addResource("{productId}");
    productById.addMethod("GET", new apigateway.LambdaIntegration(getProductsById));

    new cdk.CfnOutput(this, "ApiUrl", {
      value: api.url,
      description: "Product Service API URL",
    });

    new cdk.CfnOutput(this, "CatalogItemsQueueUrl", {
      value: catalogItemsQueue.queueUrl,
      description: "SQS Queue URL for catalog items",
      exportName: "CatalogItemsQueueUrl",
    });

    new cdk.CfnOutput(this, "CatalogItemsQueueArn", {
      value: catalogItemsQueue.queueArn,
      description: "SQS Queue ARN for catalog items",
      exportName: "CatalogItemsQueueArn",
    });
  }
}