import * as http from "http";
import * as https from "https";
import { IncomingMessage } from "http";
import { URL } from "url";

export function buildTargetUrl(
  baseUrl: string,
  remainder: string,
  search: string
): URL {
  const target = new URL(baseUrl);
  const basePath = target.pathname.replace(/\/+$/, "");
  const suffix = remainder === "/" ? "" : remainder;

  target.pathname = `${basePath}${suffix}` || "/";
  target.search = search;

  return target;
}

function collectBody(req: IncomingMessage): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

function buildForwardHeaders(
  req: IncomingMessage,
  targetUrl: URL
): http.OutgoingHttpHeaders {
  const headers: http.OutgoingHttpHeaders = { ...req.headers };

  delete headers.host;
  delete headers.connection;
  headers.host = targetUrl.host;

  return headers;
}

export interface ProxyResult {
  statusCode: number;
  headers: http.IncomingHttpHeaders;
  body: Buffer;
}

export async function forwardRequest(
  req: IncomingMessage,
  targetUrl: URL
): Promise<ProxyResult> {
  const body = await collectBody(req);

  return new Promise((resolve, reject) => {
    const client = targetUrl.protocol === "https:" ? https : http;

    const outgoing = client.request(
      targetUrl,
      {
        method: req.method,
        headers: buildForwardHeaders(req, targetUrl),
      },
      (proxyRes) => {
        const chunks: Buffer[] = [];
        proxyRes.on("data", (chunk: Buffer) => chunks.push(chunk));
        proxyRes.on("end", () => {
          resolve({
            statusCode: proxyRes.statusCode ?? 502,
            headers: proxyRes.headers,
            body: Buffer.concat(chunks),
          });
        });
        proxyRes.on("error", reject);
      }
    );

    outgoing.on("error", reject);

    if (body.length > 0) {
      outgoing.write(body);
    }

    outgoing.end();
  });
}
