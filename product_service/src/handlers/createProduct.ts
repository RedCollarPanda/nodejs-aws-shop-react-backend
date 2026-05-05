import { APIGatewayProxyHandler } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, TransactWriteCommand } from "@aws-sdk/lib-dynamodb";
import { randomUUID } from "crypto";

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));

export const handler: APIGatewayProxyHandler = async (event) => {
  console.log("createProduct", JSON.stringify(event));

  try {
    const body = JSON.parse(event.body ?? "{}");
    const { title, description, price, count } = body;

    if (!title || price == null || count == null) {
      return {
        statusCode: 400,
        headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" },
        body: JSON.stringify({ message: "title, price and count are required" }),
      };
    }

    if (typeof price !== "number" || price < 0) {
      return {
        statusCode: 400,
        headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" },
        body: JSON.stringify({ message: "price must be a non-negative number" }),
      };
    }

    if (typeof count !== "number" || count < 0 || !Number.isInteger(count)) {
      return {
        statusCode: 400,
        headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" },
        body: JSON.stringify({ message: "count must be a non-negative integer" }),
      };
    }

    const id = randomUUID();

    await client.send(new TransactWriteCommand({
      TransactItems: [
        {
          Put: {
            TableName: process.env.PRODUCTS_TABLE_NAME,
            Item: { id, title, description: description ?? "", price },
          },
        },
        {
          Put: {
            TableName: process.env.STOCKS_TABLE_NAME,
            Item: { product_id: id, count },
          },
        },
      ],
    }));

    return {
      statusCode: 201,
      headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" },
      body: JSON.stringify({ id, title, description: description ?? "", price, count }),
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