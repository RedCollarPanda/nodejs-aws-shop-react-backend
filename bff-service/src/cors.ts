import { IncomingMessage, ServerResponse } from "http";

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export function applyCorsHeaders(res: ServerResponse): void {
  for (const [key, value] of Object.entries(CORS_HEADERS)) {
    res.setHeader(key, value);
  }
}

export function isPreflightRequest(req: IncomingMessage): boolean {
  return req.method === "OPTIONS";
}

export function handlePreflight(res: ServerResponse): void {
  applyCorsHeaders(res);
  res.writeHead(204);
  res.end();
}
