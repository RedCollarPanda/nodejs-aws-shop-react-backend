import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as nodejs from "aws-cdk-lib/aws-lambda-nodejs";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import { Construct } from "constructs";
import * as path from "path";

export class ProductServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

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

    productsTable.grantReadData(getProductsList);
    productsTable.grantReadData(getProductsById);
    stocksTable.grantReadData(getProductsList);
    stocksTable.grantReadData(getProductsById);
    productsTable.grantWriteData(createProduct);
    stocksTable.grantWriteData(createProduct);

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
  }
}