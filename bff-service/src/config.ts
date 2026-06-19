import * as dotenv from "dotenv";

dotenv.config();

export interface BffConfig {
  port: number;
  cacheTtlMs: number;
  recipients: Record<string, string>;
}

function buildRecipients(): Record<string, string> {
  const recipients: Record<string, string> = {};

  if (process.env.PRODUCT_SERVICE_URL) {
    recipients.product = process.env.PRODUCT_SERVICE_URL;
  }

  if (process.env.CART_SERVICE_URL) {
    recipients.cart = process.env.CART_SERVICE_URL;
  }

  return recipients;
}

export const config: BffConfig = {
  port: Number(process.env.APP_PORT) || 3000,
  cacheTtlMs: Number(process.env.CACHE_TTL_MS) || 120000,
  recipients: buildRecipients(),
};
