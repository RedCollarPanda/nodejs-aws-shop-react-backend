import * as http from "http";
import { URL } from "url";
import { parseRecipient, resolveRecipientUrl } from "./router";
import { buildTargetUrl, forwardRequest } from "./proxy";
import { applyCorsHeaders, handlePreflight, isPreflightRequest } from "./cors";
import { TtlCache, isCacheableProductsList, CacheEntry } from "./cache";

export interface AppOptions {
  recipients: Record<string, string>;
  cacheTtlMs: number;
}

function sendJson(
  res: http.ServerResponse,
  statusCode: number,
  payload: unknown
): void {
  applyCorsHeaders(res);
  res.writeHead(statusCode, { "Content-Type": "application/json" });
  res.end(JSON.stringify(payload));
}

function writeProxiedResponse(
  res: http.ServerResponse,
  result: CacheEntry
): void {
  applyCorsHeaders(res);

  for (const [key, value] of Object.entries(result.headers)) {
    if (value === undefined) continue;
    if (key.toLowerCase() === "transfer-encoding") continue;
    res.setHeader(key, value);
  }

  res.writeHead(result.statusCode);
  res.end(result.body);
}

export function createBffServer(options: AppOptions): http.Server {
  const cache = new TtlCache(options.cacheTtlMs);

  return http.createServer(async (req, res) => {
    if (isPreflightRequest(req)) {
      handlePreflight(res);
      return;
    }

    const url = new URL(
      req.url ?? "/",
      `http://${req.headers.host ?? "localhost"}`
    );
    const { recipient, remainder } = parseRecipient(url.pathname);
    const recipientUrl = resolveRecipientUrl(options.recipients, recipient);

    if (!recipientUrl) {
      sendJson(res, 502, { message: "Cannot process request" });
      return;
    }

    const method = req.method ?? "GET";
    const cacheable = isCacheableProductsList(recipient, remainder, method);
    const cacheKey = `${recipient}:${remainder}${url.search}`;

    if (cacheable) {
      const cached = cache.get(cacheKey);
      if (cached) {
        writeProxiedResponse(res, cached);
        return;
      }
    }

    try {
      const targetUrl = buildTargetUrl(recipientUrl, remainder, url.search);
      const result = await forwardRequest(req, targetUrl);

      writeProxiedResponse(res, result);

      if (cacheable && result.statusCode === 200) {
        cache.set(cacheKey, result);
      }
    } catch (error) {
      console.error("BFF proxy error", error);
      sendJson(res, 502, { message: "Cannot process request" });
    }
  });
}
