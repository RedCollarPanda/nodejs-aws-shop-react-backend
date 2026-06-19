# bff-service

Backend For Frontend: a single entry point that proxies requests to Product
Service and Cart Service based on the first path segment.

No web framework is used (no Express) — the proxy is built on Node's built-in
`http`/`https` modules.

## How it works

```
{bff-service-url}/{recipient-service-name}/{rest-of-path}?query=string
```

- `{recipient-service-name}` is `product` or `cart`.
- The recipient's base URL is read from the environment using
  `PRODUCT_SERVICE_URL` / `CART_SERVICE_URL`.
- The rest of the path and the query string are appended to that base URL and
  the request (method, headers, body) is forwarded as-is.
- The recipient's status code, headers and body are returned unchanged.
- If the recipient name isn't recognized, the BFF responds `502 Cannot
  process request` without making any outbound call.

## Configuration

Copy `.env.example` to `.env` and fill in the real service URLs:

```
APP_PORT=3000
PRODUCT_SERVICE_URL=https://your-api-id.execute-api.eu-north-1.amazonaws.com/prod
CART_SERVICE_URL=https://your-cart-env.eu-north-1.elasticbeanstalk.com
CACHE_TTL_MS=120000
```

## Caching

`GET /product/products` (the `getProductsList` call) responses are cached in
memory for `CACHE_TTL_MS` (default 2 minutes). Other requests are never
cached.

## Getting started

```bash
npm install
npm run build
npm start
# or, for local development:
npm run start:dev
```

### Run tests

```bash
npm test
```

## Examples

```bash
# Product Service via BFF
curl "{bff-service-url}/product/products"

# Cart Service via BFF
curl "{bff-service-url}/cart"

# createProduct via BFF
curl -X POST "{bff-service-url}/product/products" \
  -H "Authorization: Basic base64(login:password)" \
  -H "Content-Type: application/json" \
  -d '{"title":"Item","description":"desc","price":10,"count":5}'
```

## Deployment

Deployed to Elastic Beanstalk (Docker platform), same workflow as
`nodejs-aws-cart-api`:

```bash
eb init                # application: {github_login}-bff-api
eb create --cname {github_login}-bff-api-{environment_name} --single
eb setenv PRODUCT_SERVICE_URL=... CART_SERVICE_URL=...
```
