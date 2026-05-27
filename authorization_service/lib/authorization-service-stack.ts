import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as nodejs from "aws-cdk-lib/aws-lambda-nodejs";
import { Construct } from "constructs";
import * as path from "path";

export class AuthorizationServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const githubLogin = process.env.GITHUB_LOGIN;
    if (!githubLogin) {
      throw new Error("GITHUB_LOGIN environment variable is required. Add it to .env file.");
    }

    const basicAuthorizer = new nodejs.NodejsFunction(this, "BasicAuthorizer", {
      runtime: lambda.Runtime.NODEJS_22_X,
      entry: path.join(__dirname, "../src/handlers/basicAuthorizer.ts"),
      handler: "handler",
      functionName: "basicAuthorizer",
      bundling: { forceDockerBundling: false, minify: false },
      environment: {
        [githubLogin]: "TEST_PASSWORD",
      },
    });

    new cdk.CfnOutput(this, "BasicAuthorizerArn", {
      value: basicAuthorizer.functionArn,
      exportName: "BasicAuthorizerArn",
      description: "Basic Authorizer Lambda ARN",
    });
  }
}
