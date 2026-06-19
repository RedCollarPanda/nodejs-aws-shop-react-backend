import { TtlCache, isCacheableProductsList } from "../src/cache";

describe("TtlCache", () => {
  it("returns undefined for a missing key", () => {
    const cache = new TtlCache(1000);
    expect(cache.get("missing")).toBeUndefined();
  });

  it("returns a stored value before it expires", () => {
    const cache = new TtlCache(1000);
    const entry = { statusCode: 200, headers: {}, body: Buffer.from("ok") };

    cache.set("key", entry);

    expect(cache.get("key")).toEqual(entry);
  });

  it("expires entries after the configured TTL", () => {
    jest.useFakeTimers();
    const cache = new TtlCache(2 * 60 * 1000);
    const entry = { statusCode: 200, headers: {}, body: Buffer.from("ok") };

    cache.set("key", entry);
    expect(cache.get("key")).toEqual(entry);

    jest.advanceTimersByTime(2 * 60 * 1000 + 1);

    expect(cache.get("key")).toBeUndefined();
    jest.useRealTimers();
  });
});

describe("isCacheableProductsList", () => {
  it("is true only for GET /product/products", () => {
    expect(isCacheableProductsList("product", "/products", "GET")).toBe(true);
  });

  it("is false for other recipients", () => {
    expect(isCacheableProductsList("cart", "/products", "GET")).toBe(false);
  });

  it("is false for other paths", () => {
    expect(isCacheableProductsList("product", "/products/123", "GET")).toBe(
      false
    );
  });

  it("is false for non-GET methods", () => {
    expect(isCacheableProductsList("product", "/products", "POST")).toBe(
      false
    );
  });
});
