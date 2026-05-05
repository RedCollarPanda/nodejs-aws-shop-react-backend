import { APIGatewayProxyHandler } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));

export const handler: APIGatewayProxyHandler = async (event) => {
  console.log("getProductsList", JSON.stringify(event));

  try {
    const [productsResult, stocksResult] = await Promise.all([
      client.send(new ScanCommand({ TableName: process.env.PRODUCTS_TABLE_NAME })),
      client.send(new ScanCommand({ TableName: process.env.STOCKS_TABLE_NAME })),
    ]);

    const stocks = new Map(
      (stocksResult.Items ?? []).map((s) => [s.product_id, s.count])
    );

    const products = (productsResult.Items ?? []).map((p) => ({
      ...p,
      count: stocks.get(p.id) ?? 0,
    }));

    return {
      statusCode: 200,
      headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" },
      body: JSON.stringify(products),
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