import { SQSEvent } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, TransactWriteCommand } from "@aws-sdk/lib-dynamodb";
import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";
import { randomUUID } from "crypto";

const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const sns = new SNSClient({});

export const handler = async (event: SQSEvent): Promise<void> => {
  console.log("catalogBatchProcess", JSON.stringify(event));

  for (const record of event.Records) {
    let product: { title?: string; description?: string; price?: unknown; count?: unknown };

    try {
      product = JSON.parse(record.body);
    } catch {
      console.error("Failed to parse SQS record body:", record.body);
      continue;
    }

    const { title, description, price, count } = product;

    if (!title || price == null || count == null) {
      console.error("Invalid product data, skipping:", product);
      continue;
    }

    const parsedPrice = Number(price);
    const parsedCount = Number(count);

    if (isNaN(parsedPrice) || parsedPrice < 0) {
      console.error("Invalid price, skipping:", product);
      continue;
    }

    if (isNaN(parsedCount) || parsedCount < 0 || !Number.isInteger(parsedCount)) {
      console.error("Invalid count, skipping:", product);
      continue;
    }

    const id = randomUUID();

    await dynamo.send(
      new TransactWriteCommand({
        TransactItems: [
          {
            Put: {
              TableName: process.env.PRODUCTS_TABLE_NAME,
              Item: { id, title, description: description ?? "", price: parsedPrice },
            },
          },
          {
            Put: {
              TableName: process.env.STOCKS_TABLE_NAME,
              Item: { product_id: id, count: parsedCount },
            },
          },
        ],
      })
    );

    console.log("Created product:", id, title);

    await sns.send(
      new PublishCommand({
        TopicArn: process.env.SNS_TOPIC_ARN,
        Subject: "New product created",
        Message: JSON.stringify({ id, title, description: description ?? "", price: parsedPrice, count: parsedCount }),
        MessageAttributes: {
          price: {
            DataType: "Number",
            StringValue: String(parsedPrice),
          },
        },
      })
    );
  }
};
