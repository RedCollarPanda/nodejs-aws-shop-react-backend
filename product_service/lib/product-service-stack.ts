import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as nodejs from "aws-cdk-lib/aws-lambda-nodejs";
import { Construct } from "constructs";
import * as path from "path";

export class ProductServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const getProductsList = new nodejs.NodejsFunction(
      this,
      "GetProductsList",
      {
        runtime: lambda.Runtime.NODEJS_22_X,
        entry: path.join(__dirname, "../src/handlers/getProductsList.ts"),
        handler: "handler",
        functionName: "getProductsList",
        bundling: { forceDockerBundling: false },
      }
    );

    const getProductsById = new nodejs.NodejsFunction(
      this,
      "GetProductsById",
      {
        runtime: lambda.Runtime.NODEJS_22_X,
        entry: path.join(__dirname, "../src/handlers/getProductsById.ts"),
        handler: "handler",
        functionName: "getProductsById",
        bundling: { forceDockerBundling: false },
      }
    );

    const api = new apigateway.RestApi(this, "ProductsApi", {
      restApiName: "Product Service",
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
      },
    });

    const products = api.root.addResource("products");
    products.addMethod(
      "GET",
      new apigateway.LambdaIntegration(getProductsList)
    );

    const productById = products.addResource("{productId}");
    productById.addMethod(
      "GET",
      new apigateway.LambdaIntegration(getProductsById)
    );

    new cdk.CfnOutput(this, "ApiUrl", {
      value: api.url,
      description: "Product Service API URL",
    });
  }
}
