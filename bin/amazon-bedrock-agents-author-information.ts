#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { AmazonBedrockAgentsAuthorInformationStack } from "../lib/amazon-bedrock-agents-author-information-stack";

const defaultRegion = process.env["AWS_DEFAULT_REGION"];
if (defaultRegion !== "us-east-1") {
  throw new Error(`us-east-1でデプロイしてください。AWS_DEFAULT_REGION=${defaultRegion}`);
}

const app = new cdk.App();
new AmazonBedrockAgentsAuthorInformationStack(app, "AmazonBedrockAgentsAuthorInformationStack", {});
