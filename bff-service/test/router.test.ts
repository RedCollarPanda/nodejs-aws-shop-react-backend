import { parseRecipient, resolveRecipientUrl } from "../src/router";

describe("parseRecipient", () => {
  it("splits recipient and remainder for a nested path", () => {
    expect(parseRecipient("/product/products/123")).toEqual({
      recipient: "product",
      remainder: "/products/123",
    });
  });

  it("splits recipient and remainder for a single-level path", () => {
    expect(parseRecipient("/product/products")).toEqual({
      recipient: "product",
      remainder: "/products",
    });
  });

  it("returns '/' as remainder when only the recipient is present", () => {
    expect(parseRecipient("/cart")).toEqual({
      recipient: "cart",
      remainder: "/",
    });
  });

  it("returns an empty recipient for the root path", () => {
    expect(parseRecipient("/")).toEqual({
      recipient: "",
      remainder: "/",
    });
  });
});

describe("resolveRecipientUrl", () => {
  const recipients = {
    product: "https://product.example.com/prod",
    cart: "https://cart.example.com",
  };

  it("returns the configured URL for a known recipient", () => {
    expect(resolveRecipientUrl(recipients, "product")).toBe(
      "https://product.example.com/prod"
    );
  });

  it("returns undefined for an unknown recipient", () => {
    expect(resolveRecipientUrl(recipients, "unknown")).toBeUndefined();
  });
});
