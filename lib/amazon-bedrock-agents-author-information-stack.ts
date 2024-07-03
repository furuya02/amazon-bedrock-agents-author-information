import fs = require("fs");
import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { aws_iam as iam } from "aws-cdk-lib";
import { aws_bedrock as bedrock } from "aws-cdk-lib";
import { aws_lambda as lambda } from "aws-cdk-lib";
import { PythonFunction } from "@aws-cdk/aws-lambda-python-alpha";
//https://docs.aws.amazon.com/cdk/api/v2/docs/aws-lambda-python-alpha-readme.html

export class AmazonBedrockAgentsAuthorInformationStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const foundationModel = this.node.tryGetContext("foundationModel");
    const projectName = this.node.tryGetContext("projectName");
    const functionName = `${projectName}-function`;

    ///////////////////////////////////////////////////////////////////////
    // Lambda
    ///////////////////////////////////////////////////////////////////////
    const reservationFunctionRole = new iam.Role(this, "LambdaFunctionRole", {
      assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
      managedPolicies: [iam.ManagedPolicy.fromAwsManagedPolicyName("service-role/AWSLambdaBasicExecutionRole")],
      inlinePolicies: {
        inlinePolicie: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: ["bedrock:InvokeModel"],
              resources: [`*`],
            }),
          ],
        }),
      },
    });

    const reservationFunction = new PythonFunction(this, "LambdaFunction", {
      functionName: functionName,
      entry: "src/lambda",
      handler: "handler",
      environment: {
        TZ: "Asia/Tokyo",
      },
      timeout: cdk.Duration.seconds(30),
      role: reservationFunctionRole,
      runtime: lambda.Runtime.PYTHON_3_12,
    });

    // code: lambda.Code.fromAsset(`lambda/${functionName}`),
    // handler: "index.handler",

    ///////////////////////////////////////////////////////////////////////
    // Actions for Amazon Berock
    ///////////////////////////////////////////////////////////////////////
    const agentsRole = new iam.Role(this, "AgentRole", {
      roleName: `${projectName}_role`,
      assumedBy: new iam.ServicePrincipal("bedrock.amazonaws.com"),
      inlinePolicies: {
        agentPoliciy: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: ["bedrock:InvokeModel"],
              resources: [`arn:aws:bedrock:${this.region}::foundation-model/${foundationModel}`],
            }),
          ],
        }),
      },
    });

    const instructionText = new TextDecoder("utf-8").decode(fs.readFileSync("assets/instruction.txt"));
    const bedrockAgents = new bedrock.CfnAgent(this, "BedrockAgents", {
      agentName: projectName,
      description: "DevIOの著者情報を取得するエージェント",
      agentResourceRoleArn: agentsRole.roleArn,
      foundationModel: foundationModel,
      instruction: instructionText,
      actionGroups: [
        {
          actionGroupName: "actionGroup",
          description: "著者の記事の一覧を取得するAPI",
          actionGroupState: "ENABLED",
          functionSchema: {
            functions: [
              {
                name: "get_articles",
                description:
                  "著者は指示に基づいて決定する必要があります。 著者が不明な場合はユーザーの判断に委ねてください",
                parameters: {
                  user: {
                    type: "string",
                    description: "著者",
                    required: true,
                  },
                },
              },
            ],
          },
          actionGroupExecutor: {
            lambda: reservationFunction.functionArn,
          },
        },
      ],
    });

    ///////////////////////////////////////////////////////////////////////
    // Resource-Based Policy Statements
    ///////////////////////////////////////////////////////////////////////
    const principal = new iam.ServicePrincipal("bedrock.amazonaws.com", {
      conditions: {
        ArnLike: {
          "aws:SourceArn": bedrockAgents.attrAgentArn,
        },
      },
    });
    reservationFunction.grantInvoke(principal);
  }
}
