import { handler } from "../src/handlers/getProductsList";
import { products } from "../src/products";
import { APIGatewayProxyEvent, Context } from "aws-lambda";

const mockEvent = {} as APIGatewayProxyEvent;
const mockContext = {} as Context;

describe("getProductsList", () => {
  it("returns 200 with all products", async () => {
    const result = await handler(mockEvent, mockContext, () => {});

    expect(result).toBeDefined();
    expect(result!.statusCode).toBe(200);

    const body = JSON.parse(result!.body);
    expect(body).toEqual(products);
    expect(body).toHaveLength(products.length);
  });

  it("returns CORS headers", async () => {
    const result = await handler(mockEvent, mockContext, () => {});

    expect(result!.headers?.["Access-Control-Allow-Origin"]).toBe("*");
  });
});
