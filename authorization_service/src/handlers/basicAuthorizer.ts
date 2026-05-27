import {
  APIGatewayTokenAuthorizerEvent,
  APIGatewayAuthorizerResult,
} from "aws-lambda";

export const handler = async (
  event: APIGatewayTokenAuthorizerEvent
): Promise<APIGatewayAuthorizerResult> => {
  const token = event.authorizationToken;

  if (!token) {
    throw new Error("Unauthorized");
  }

  const encoded = token.replace(/^Basic\s/, "");
  const decoded = Buffer.from(encoded, "base64").toString("utf-8");
  const [login, password] = decoded.split(":");

  const effect =
    login && password && process.env[login] === password ? "Allow" : "Deny";

  return buildPolicy(effect, event.methodArn);
};

function buildPolicy(
  effect: "Allow" | "Deny",
  resource: string
): APIGatewayAuthorizerResult {
  return {
    principalId: "user",
    policyDocument: {
      Version: "2012-10-17",
      Statement: [
        {
          Action: "execute-api:Invoke",
          Effect: effect,
          Resource: resource,
        },
      ],
    },
  };
}
