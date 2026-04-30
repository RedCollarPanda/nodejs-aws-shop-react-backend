import { handler } from "../src/handlers/getProductsById";
import { products } from "../src/products";
import { APIGatewayProxyEvent, Context } from "aws-lambda";

const mockContext = {} as Context;

function makeEvent(productId: string | null): APIGatewayProxyEvent {
  return {
    pathParameters: productId ? { productId } : null,
  } as unknown as APIGatewayProxyEvent;
}

describe("getProductsById", () => {
  it("returns 200 with the matching product", async () => {
    const product = products[0];
    const result = await handler(makeEvent(product.id), mockContext, () => {});

    expect(result!.statusCode).toBe(200);
    expect(JSON.parse(result!.body)).toEqual(product);
  });

  it("returns 404 when product is not found", async () => {
    const result = await handler(
      makeEvent("non-existent-id"),
      mockContext,
      () => {}
    );

    expect(result!.statusCode).toBe(404);
    expect(JSON.parse(result!.body)).toEqual({ message: "Product not found" });
  });

  it("returns CORS headers", async () => {
    const result = await handler(makeEvent(products[0].id), mockContext, () => {});

    expect(result!.headers?.["Access-Control-Allow-Origin"]).toBe("*");
  });
});
