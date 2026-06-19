import * as http from "http";
import { AddressInfo } from "net";
import { createBffServer } from "../src/app";

function listen(server: http.Server): Promise<number> {
  return new Promise((resolve) => {
    server.listen(0, () => {
      resolve((server.address() as AddressInfo).port);
    });
  });
}

function close(server: http.Server): Promise<void> {
  return new Promise((resolve) => server.close(() => resolve()));
}

interface SimpleResponse {
  statusCode: number;
  headers: http.IncomingHttpHeaders;
  body: string;
}

function call(
  port: number,
  path: string,
  options: { method?: string; headers?: http.OutgoingHttpHeaders; body?: string } = {}
): Promise<SimpleResponse> {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: "127.0.0.1",
        port,
        path,
        method: options.method ?? "GET",
        headers: options.headers,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer) => chunks.push(chunk));
        res.on("end", () =>
          resolve({
            statusCode: res.statusCode ?? 0,
            headers: res.headers,
            body: Buffer.concat(chunks).toString("utf-8"),
          })
        );
      }
    );

    req.on("error", reject);

    if (options.body) {
      req.write(options.body);
    }

    req.end();
  });
}

describe("BFF server", () => {
  let recipientHits = 0;
  let recipientServer: http.Server;
  let recipientPort: number;
  let bffServer: http.Server;
  let bffPort: number;

  beforeEach(async () => {
    recipientHits = 0;

    recipientServer = http.createServer((req, res) => {
      recipientHits += 1;

      const chunks: Buffer[] = [];
      req.on("data", (chunk: Buffer) => chunks.push(chunk));
      req.on("end", () => {
        const body = Buffer.concat(chunks).toString("utf-8");

        if (req.url === "/products/missing") {
          res.writeHead(404, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ message: "Product not found" }));
          return;
        }

        if (req.url === "/echo") {
          res.writeHead(200, {
            "Content-Type": "application/json",
            "X-Echo-Auth": req.headers.authorization ?? "",
          });
          res.end(JSON.stringify({ method: req.method, body }));
          return;
        }

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ hits: recipientHits }));
      });
    });

    recipientPort = await listen(recipientServer);

    bffServer = createBffServer({
      recipients: { product: `http://127.0.0.1:${recipientPort}` },
      cacheTtlMs: 200,
    });
    bffPort = await listen(bffServer);
  });

  afterEach(async () => {
    await close(bffServer);
    await close(recipientServer);
  });

  it("returns 502 for an unknown recipient", async () => {
    const res = await call(bffPort, "/unknown/products");

    expect(res.statusCode).toBe(502);
    expect(JSON.parse(res.body)).toEqual({ message: "Cannot process request" });
    expect(recipientHits).toBe(0);
  });

  it("proxies the request to the resolved recipient", async () => {
    const res = await call(bffPort, "/product/products");

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toEqual({ hits: 1 });
    expect(recipientHits).toBe(1);
  });

  it("propagates the recipient's error status and body unchanged", async () => {
    const res = await call(bffPort, "/product/products/missing");

    expect(res.statusCode).toBe(404);
    expect(JSON.parse(res.body)).toEqual({ message: "Product not found" });
  });

  it("forwards method, body and Authorization header to the recipient", async () => {
    const res = await call(bffPort, "/product/echo", {
      method: "POST",
      headers: {
        Authorization: "Basic dXNlcjpwYXNz",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ title: "Item" }),
    });

    expect(res.statusCode).toBe(200);
    expect(res.headers["x-echo-auth"]).toBe("Basic dXNlcjpwYXNz");
    expect(JSON.parse(res.body)).toEqual({
      method: "POST",
      body: JSON.stringify({ title: "Item" }),
    });
  });

  it("answers CORS preflight requests without contacting the recipient", async () => {
    const res = await call(bffPort, "/product/products", { method: "OPTIONS" });

    expect(res.statusCode).toBe(204);
    expect(res.headers["access-control-allow-origin"]).toBe("*");
    expect(recipientHits).toBe(0);
  });

  it("caches getProductsList responses for the configured TTL", async () => {
    const first = await call(bffPort, "/product/products");
    const second = await call(bffPort, "/product/products");

    expect(JSON.parse(first.body)).toEqual({ hits: 1 });
    expect(JSON.parse(second.body)).toEqual({ hits: 1 });
    expect(recipientHits).toBe(1);

    await new Promise((resolve) => setTimeout(resolve, 250));

    const third = await call(bffPort, "/product/products");
    expect(JSON.parse(third.body)).toEqual({ hits: 2 });
    expect(recipientHits).toBe(2);
  });
});
