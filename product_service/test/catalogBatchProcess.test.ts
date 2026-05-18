import { SQSEvent, SQSRecord } from "aws-lambda";

const mockDynamoSend = jest.fn();
const mockSnsSend = jest.fn();

jest.mock("@aws-sdk/client-dynamodb", () => ({
  DynamoDBClient: jest.fn(),
}));

jest.mock("@aws-sdk/lib-dynamodb", () => ({
  DynamoDBDocumentClient: {
    from: jest.fn(() => ({ send: mockDynamoSend })),
  },
  TransactWriteCommand: jest.fn((input) => input),
}));

jest.mock("@aws-sdk/client-sns", () => ({
  SNSClient: jest.fn(() => ({ send: mockSnsSend })),
  PublishCommand: jest.fn((input) => input),
}));

jest.mock("crypto", () => ({
  randomUUID: jest.fn(() => "test-uuid-1234"),
}));

import { handler } from "../src/handlers/catalogBatchProcess";

const makeRecord = (body: unknown): SQSRecord =>
  ({
    body: JSON.stringify(body),
    messageId: "msg-1",
    receiptHandle: "handle-1",
  } as SQSRecord);

const makeEvent = (records: SQSRecord[]): SQSEvent => ({ Records: records } as SQSEvent);

beforeEach(() => {
  jest.clearAllMocks();
  mockDynamoSend.mockResolvedValue({});
  mockSnsSend.mockResolvedValue({});
  process.env.PRODUCTS_TABLE_NAME = "products";
  process.env.STOCKS_TABLE_NAME = "stocks";
  process.env.SNS_TOPIC_ARN = "arn:aws:sns:us-east-1:123456789012:createProductTopic";
});

describe("catalogBatchProcess", () => {
  describe("successful processing", () => {
    it("writes product and stock to DynamoDB for a valid record", async () => {
      const event = makeEvent([makeRecord({ title: "Widget", description: "A widget", price: 9.99, count: 5 })]);

      await handler(event);

      expect(mockDynamoSend).toHaveBeenCalledTimes(1);
      const call = mockDynamoSend.mock.calls[0][0];
      expect(call.TransactItems).toHaveLength(2);

      const productPut = call.TransactItems[0].Put;
      expect(productPut.TableName).toBe("products");
      expect(productPut.Item).toMatchObject({ id: "test-uuid-1234", title: "Widget", description: "A widget", price: 9.99 });

      const stockPut = call.TransactItems[1].Put;
      expect(stockPut.TableName).toBe("stocks");
      expect(stockPut.Item).toMatchObject({ product_id: "test-uuid-1234", count: 5 });
    });

    it("publishes to SNS after creating a product", async () => {
      const event = makeEvent([makeRecord({ title: "Widget", price: 9.99, count: 5 })]);

      await handler(event);

      expect(mockSnsSend).toHaveBeenCalledTimes(1);
      const call = mockSnsSend.mock.calls[0][0];
      expect(call.TopicArn).toBe("arn:aws:sns:us-east-1:123456789012:createProductTopic");
      expect(call.Subject).toBe("New product created");
      expect(call.MessageAttributes.price).toEqual({ DataType: "Number", StringValue: "9.99" });

      const message = JSON.parse(call.Message);
      expect(message).toMatchObject({ id: "test-uuid-1234", title: "Widget", price: 9.99, count: 5 });
    });

    it("defaults description to empty string when absent", async () => {
      const event = makeEvent([makeRecord({ title: "NoDesc", price: 1, count: 1 })]);

      await handler(event);

      const productPut = mockDynamoSend.mock.calls[0][0].TransactItems[0].Put;
      expect(productPut.Item.description).toBe("");
    });

    it("processes all records in a batch", async () => {
      const event = makeEvent([
        makeRecord({ title: "A", price: 1, count: 1 }),
        makeRecord({ title: "B", price: 2, count: 2 }),
        makeRecord({ title: "C", price: 3, count: 3 }),
      ]);

      await handler(event);

      expect(mockDynamoSend).toHaveBeenCalledTimes(3);
      expect(mockSnsSend).toHaveBeenCalledTimes(3);
    });

    it("accepts price = 0 as valid", async () => {
      const event = makeEvent([makeRecord({ title: "Free", price: 0, count: 10 })]);

      await handler(event);

      expect(mockDynamoSend).toHaveBeenCalledTimes(1);
    });

    it("accepts count = 0 as valid", async () => {
      const event = makeEvent([makeRecord({ title: "OutOfStock", price: 5, count: 0 })]);

      await handler(event);

      expect(mockDynamoSend).toHaveBeenCalledTimes(1);
    });

    it("accepts numeric strings for price and count from CSV", async () => {
      const event = makeEvent([makeRecord({ title: "CSV Product", price: "19.99", count: "3" })]);

      await handler(event);

      expect(mockDynamoSend).toHaveBeenCalledTimes(1);
      const productPut = mockDynamoSend.mock.calls[0][0].TransactItems[0].Put;
      expect(productPut.Item.price).toBe(19.99);
      const stockPut = mockDynamoSend.mock.calls[0][0].TransactItems[1].Put;
      expect(stockPut.Item.count).toBe(3);
    });
  });

  describe("invalid records — skipped without throwing", () => {
    it("skips a record with invalid JSON body", async () => {
      const badRecord = { body: "not-json", messageId: "x", receiptHandle: "x" } as SQSRecord;
      const event = makeEvent([badRecord]);

      await expect(handler(event)).resolves.toBeUndefined();
      expect(mockDynamoSend).not.toHaveBeenCalled();
      expect(mockSnsSend).not.toHaveBeenCalled();
    });

    it("skips a record missing title", async () => {
      const event = makeEvent([makeRecord({ price: 5, count: 1 })]);

      await handler(event);

      expect(mockDynamoSend).not.toHaveBeenCalled();
    });

    it("skips a record missing price", async () => {
      const event = makeEvent([makeRecord({ title: "NoPrice", count: 1 })]);

      await handler(event);

      expect(mockDynamoSend).not.toHaveBeenCalled();
    });

    it("skips a record missing count", async () => {
      const event = makeEvent([makeRecord({ title: "NoCount", price: 5 })]);

      await handler(event);

      expect(mockDynamoSend).not.toHaveBeenCalled();
    });

    it("skips a record with negative price", async () => {
      const event = makeEvent([makeRecord({ title: "Neg", price: -1, count: 1 })]);

      await handler(event);

      expect(mockDynamoSend).not.toHaveBeenCalled();
    });

    it("skips a record with negative count", async () => {
      const event = makeEvent([makeRecord({ title: "Neg", price: 5, count: -1 })]);

      await handler(event);

      expect(mockDynamoSend).not.toHaveBeenCalled();
    });

    it("skips a record with non-integer count", async () => {
      const event = makeEvent([makeRecord({ title: "Float", price: 5, count: 1.5 })]);

      await handler(event);

      expect(mockDynamoSend).not.toHaveBeenCalled();
    });

    it("skips invalid records but still processes valid ones in the same batch", async () => {
      const event = makeEvent([
        makeRecord({ title: "Valid", price: 10, count: 2 }),
        makeRecord({ price: 5 }),          // missing title
        { body: "bad json", messageId: "x", receiptHandle: "x" } as SQSRecord,
      ]);

      await handler(event);

      expect(mockDynamoSend).toHaveBeenCalledTimes(1);
      expect(mockSnsSend).toHaveBeenCalledTimes(1);
    });
  });
});
