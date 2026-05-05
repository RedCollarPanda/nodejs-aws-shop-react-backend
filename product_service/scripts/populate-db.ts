import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, BatchWriteCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({ region: "eu-north-1" });
const docClient = DynamoDBDocumentClient.from(client);

const PRODUCTS_TABLE = process.env.PRODUCTS_TABLE_NAME ?? "products";
const STOCKS_TABLE = process.env.STOCKS_TABLE_NAME ?? "stocks";

const products = [
  { id: "7567ec4b-b10c-48c5-9345-fc73c48a80aa", title: "ProductOne", description: "Short Product Description1", price: 24 },
  { id: "7567ec4b-b10c-48c5-9345-fc73c48a80a1", title: "ProductTitle", description: "Short Product Description7", price: 15 },
  { id: "7567ec4b-b10c-48c5-9345-fc73c48a80a3", title: "Product", description: "Short Product Description2", price: 23 },
  { id: "7567ec4b-b10c-48c5-9345-fc73348a80a1", title: "ProductTest", description: "Short Product Description4", price: 15 },
  { id: "7567ec4b-b10c-48c5-9445-fc73c48a80a2", title: "Product2", description: "Short Product Description1", price: 23 },
  { id: "7567ec4b-b10c-45c5-9345-fc73c48a80a1", title: "ProductName", description: "Short Product Description7", price: 15 },
];

const stocks = [
  { product_id: "7567ec4b-b10c-48c5-9345-fc73c48a80aa", count: 1 },
  { product_id: "7567ec4b-b10c-48c5-9345-fc73c48a80a1", count: 2 },
  { product_id: "7567ec4b-b10c-48c5-9345-fc73c48a80a3", count: 3 },
  { product_id: "7567ec4b-b10c-48c5-9345-fc73348a80a1", count: 4 },
  { product_id: "7567ec4b-b10c-48c5-9445-fc73c48a80a2", count: 5 },
  { product_id: "7567ec4b-b10c-45c5-9345-fc73c48a80a1", count: 6 },
];

async function populate() {
  await docClient.send(new BatchWriteCommand({
    RequestItems: {
      [PRODUCTS_TABLE]: products.map((item) => ({ PutRequest: { Item: item } })),
    },
  }));
  console.log(`Inserted ${products.length} products`);

  await docClient.send(new BatchWriteCommand({
    RequestItems: {
      [STOCKS_TABLE]: stocks.map((item) => ({ PutRequest: { Item: item } })),
    },
  }));
  console.log(`Inserted ${stocks.length} stocks`);
}

populate().catch(console.error);
