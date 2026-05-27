#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import * as dotenv from "dotenv";
import * as path from "path";
import { AuthorizationServiceStack } from "../lib/authorization-service-stack";

dotenv.config({ path: path.join(__dirname, "../.env") });

const app = new cdk.App();
new AuthorizationServiceStack(app, "AuthorizationServiceStack", {
  env: {
    region: process.env.CDK_DEFAULT_REGION || "eu-north-1",
    account: process.env.CDK_DEFAULT_ACCOUNT,
  },
});
