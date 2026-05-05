import { APIGatewayProxyHandler } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));

export const handler: APIGatewayProxyHandler = async (event) => {
  const productId = event.pathParameters?.productId;
  console.log("getProductsById", JSON.stringify({ productId }));

  try {
    const [productResult, stockResult] = await Promise.all([
      client.send(new GetCommand({
        TableName: process.env.PRODUCTS_TABLE_NAME,
        Key: { id: productId },
      })),
      client.send(new GetCommand({
        TableName: process.env.STOCKS_TABLE_NAME,
        Key: { product_id: productId },
      })),
    ]);

    if (!productResult.Item) {
      return {
        statusCode: 404,
        headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" },
        body: JSON.stringify({ message: "Product not found" }),
      };
    }

    const product = { ...productResult.Item, count: stockResult.Item?.count ?? 0 };

    return {
      statusCode: 200,
      headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" },
      body: JSON.stringify(product),
    };
  } catch (err) {
    console.error(err);
    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" },
      body: JSON.stringify({ message: "Internal server error" }),
    };
  }
};