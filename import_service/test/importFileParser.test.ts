import { handler } from "../src/handlers/importFileParser";
import { S3Event } from "aws-lambda";
import { Readable } from "stream";
import {
  GetObjectCommand,
  CopyObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";

const mockSend = jest.fn();

jest.mock("@aws-sdk/client-s3", () => ({
  // Lazy wrapper so mockSend is not accessed at S3Client construction time
  S3Client: jest.fn().mockImplementation(() => ({
    send: (...args: unknown[]) => mockSend(...args),
  })),
  GetObjectCommand: jest.fn().mockImplementation((args) => args),
  CopyObjectCommand: jest.fn().mockImplementation((args) => args),
  DeleteObjectCommand: jest.fn().mockImplementation((args) => args),
}));

const MockGetObjectCommand = GetObjectCommand as jest.MockedClass<typeof GetObjectCommand>;
const MockCopyObjectCommand = CopyObjectCommand as jest.MockedClass<typeof CopyObjectCommand>;
const MockDeleteObjectCommand = DeleteObjectCommand as jest.MockedClass<typeof DeleteObjectCommand>;

const makeEvent = (bucket: string, key: string): S3Event =>
  ({
    Records: [{ s3: { bucket: { name: bucket }, object: { key } } }],
  } as unknown as S3Event);

describe("importFileParser", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSend.mockResolvedValue({});
  });

  it("parses CSV rows and logs each record", async () => {
    const csvData = "name,count\nApple,5\nBanana,3";
    mockSend.mockResolvedValueOnce({ Body: Readable.from([csvData]) });

    const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});

    await handler(makeEvent("test-bucket", "uploaded/products.csv"));

    const recordLogs = consoleSpy.mock.calls
      .filter(([label]) => label === "Record:")
      .map(([, row]) => JSON.parse(row));

    expect(recordLogs).toContainEqual({ name: "Apple", count: "5" });
    expect(recordLogs).toContainEqual({ name: "Banana", count: "3" });

    consoleSpy.mockRestore();
  });

  it("reads the object from correct bucket and key", async () => {
    mockSend.mockResolvedValueOnce({ Body: Readable.from([""]) });

    await handler(makeEvent("test-bucket", "uploaded/products.csv"));

    expect(MockGetObjectCommand).toHaveBeenCalledWith({
      Bucket: "test-bucket",
      Key: "uploaded/products.csv",
    });
  });

  it("copies file from uploaded/ to parsed/ after parsing", async () => {
    mockSend.mockResolvedValueOnce({ Body: Readable.from([""]) });

    await handler(makeEvent("test-bucket", "uploaded/products.csv"));

    expect(MockCopyObjectCommand).toHaveBeenCalledWith({
      Bucket: "test-bucket",
      CopySource: "test-bucket/uploaded/products.csv",
      Key: "parsed/products.csv",
    });
  });

  it("deletes original file from uploaded/ after copying", async () => {
    mockSend.mockResolvedValueOnce({ Body: Readable.from([""]) });

    await handler(makeEvent("test-bucket", "uploaded/products.csv"));

    expect(MockDeleteObjectCommand).toHaveBeenCalledWith({
      Bucket: "test-bucket",
      Key: "uploaded/products.csv",
    });
  });

  it("decodes URL-encoded keys", async () => {
    mockSend.mockResolvedValueOnce({ Body: Readable.from([""]) });

    await handler(makeEvent("test-bucket", "uploaded/my+file.csv"));

    expect(MockGetObjectCommand).toHaveBeenCalledWith(
      expect.objectContaining({ Key: "uploaded/my file.csv" })
    );
  });
});
