import { APIGatewayProxyHandler } from "aws-lambda";
import { products } from "../products";

export const handler: APIGatewayProxyHandler = async () => {
  return {
    statusCode: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(products),
  };
};
