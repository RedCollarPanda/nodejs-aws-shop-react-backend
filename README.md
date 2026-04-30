# nodejs-aws-shop-react-backend

Backend for the AWS Developer course shop application. Built with AWS CDK, API Gateway, and Lambda.

## Architecture

```
API Gateway
├── GET /products          → getProductsList Lambda
└── GET /products/{id}     → getProductsById Lambda
```

## API

Base URL: `https://sadlzp6iak.execute-api.eu-north-1.amazonaws.com/prod`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/products` | Returns all products |
| GET | `/products/{productId}` | Returns product by id, 404 if not found |

### Product schema

| Field | Type | Description |
|-------|------|-------------|
| id | string | UUID |
| title | string | Product name |
| description | string | Short description |
| price | number | Price |
| count | number | Stock count |

## Getting started

```bash
cd product_service
npm install
```

### Run tests

```bash
npm test
```

### Deploy to AWS

```bash
# First time only
npx cdk bootstrap

npx cdk deploy
```

### Swagger

Open `product_service/openapi.yaml` at https://editor.swagger.io