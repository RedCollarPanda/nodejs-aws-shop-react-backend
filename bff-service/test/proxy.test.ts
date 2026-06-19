import { buildTargetUrl } from "../src/proxy";

describe("buildTargetUrl", () => {
  it("appends the remainder to the base path", () => {
    const url = buildTargetUrl(
      "https://api.example.com/prod",
      "/products/123",
      ""
    );

    expect(url.toString()).toBe("https://api.example.com/prod/products/123");
  });

  it("keeps the base path untouched when remainder is '/'", () => {
    const url = buildTargetUrl("https://api.example.com/prod", "/", "");

    expect(url.toString()).toBe("https://api.example.com/prod");
  });

  it("forwards the query string", () => {
    const url = buildTargetUrl(
      "https://api.example.com/prod",
      "/products",
      "?limit=10"
    );

    expect(url.toString()).toBe(
      "https://api.example.com/prod/products?limit=10"
    );
  });

  it("works when the base URL has no extra path segments", () => {
    const url = buildTargetUrl("https://cart.example.com", "/", "");

    expect(url.toString()).toBe("https://cart.example.com/");
  });
});
