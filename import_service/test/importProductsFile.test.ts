import { handler } from "../src/handlers/importProductsFile";
import { APIGatewayProxyEvent, Context } from "aws-lambda";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { PutObjectCommand } from "@aws-sdk/client-s3";

jest.mock("@aws-sdk/client-s3", () => ({
  S3Client: jest.fn().mockImplementation(() => ({})),
  PutObjectCommand: jest.fn().mockImplementation((args) => args),
}));

jest.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: jest.fn(),
}));

const mockGetSignedUrl = getSignedUrl as jest.MockedFunction<typeof getSignedUrl>;
const MockPutObjectCommand = PutObjectCommand as jest.MockedClass<typeof PutObjectCommand>;

const mockContext = {} as Context;
const SIGNED_URL = "https://s3.amazonaws.com/bucket/uploaded/test.csv?X-Amz-Signature=abc";

describe("importProductsFile", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.BUCKET_NAME = "test-bucket";
    mockGetSignedUrl.mockResolvedValue(SIGNED_URL);
  });

  it("returns 200 with signed URL when name param is provided", async () => {
    const event = {
      queryStringParameters: { name: "test.csv" },
    } as unknown as APIGatewayProxyEvent;

    const result = await handler(event, mockContext, () => {});

    expect(result!.statusCode).toBe(200);
    expect(result!.body).toBe(SIGNED_URL);
  });

  it("returns 400 when name query param is missing", async () => {
    const event = {
      queryStringParameters: null,
    } as unknown as APIGatewayProxyEvent;

    const result = await handler(event, mockContext, () => {});

    expect(result!.statusCode).toBe(400);
    expect(mockGetSignedUrl).not.toHaveBeenCalled();
  });

  it("uses uploaded/ prefix for the S3 key", async () => {
    const event = {
      queryStringParameters: { name: "products.csv" },
    } as unknown as APIGatewayProxyEvent;

    await handler(event, mockContext, () => {});

    expect(MockPutObjectCommand).toHaveBeenCalledWith(
      expect.objectContaining({ Key: "uploaded/products.csv" })
    );
  });

  it("uses BUCKET_NAME env var for the S3 bucket", async () => {
    const event = {
      queryStringParameters: { name: "products.csv" },
    } as unknown as APIGatewayProxyEvent;

    await handler(event, mockContext, () => {});

    expect(MockPutObjectCommand).toHaveBeenCalledWith(
      expect.objectContaining({ Bucket: "test-bucket" })
    );
  });

  it("returns CORS header", async () => {
    const event = {
      queryStringParameters: { name: "test.csv" },
    } as unknown as APIGatewayProxyEvent;

    const result = await handler(event, mockContext, () => {});

    expect(result!.headers?.["Access-Control-Allow-Origin"]).toBe("*");
  });
});
