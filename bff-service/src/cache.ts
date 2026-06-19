import { IncomingHttpHeaders } from "http";

export interface CacheEntry {
  statusCode: number;
  headers: IncomingHttpHeaders;
  body: Buffer;
}

interface StoredEntry extends CacheEntry {
  expiresAt: number;
}

export class TtlCache {
  private store = new Map<string, StoredEntry>();

  constructor(private readonly ttlMs: number) {}

  get(key: string): CacheEntry | undefined {
    const entry = this.store.get(key);

    if (!entry) {
      return undefined;
    }

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }

    const { statusCode, headers, body } = entry;
    return { statusCode, headers, body };
  }

  set(key: string, value: CacheEntry): void {
    this.store.set(key, { ...value, expiresAt: Date.now() + this.ttlMs });
  }
}

/**
 * Only the getProductsList call (GET /product/products) is cached, per the
 * task's optional caching requirement.
 */
export function isCacheableProductsList(
  recipient: string,
  remainder: string,
  method: string
): boolean {
  return (
    recipient === "product" &&
    method === "GET" &&
    remainder.replace(/\/+$/, "") === "/products"
  );
}
