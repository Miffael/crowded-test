# Crowded Test - BaaS Payments Monorepo

This repository contains the backend infrastructure for a Banking-as-a-Service (BaaS) Payments system. The project is structured as a NestJS monorepo containing microservices for API Gateway and Auth processing.

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher recommended)
- Docker and Docker Compose
- npm (Node Package Manager)

### 1. Start Docker Instances

The project relies on MongoDB, Redis, and PostgreSQL. To start all necessary Docker containers, run:

```bash
npm run docker:up
```

After the containers are up, initialize the databases with the required schemas and users:

```bash
npm run db:init:all
```

To stop and remove the containers later, you can run:
```bash
npm run docker:down
```

### 2. Install Dependencies

Install the project dependencies using npm:

```bash
npm install
```

### 3. Start the Projects

The monorepo consists of two main applications. You need to start both of them. It is recommended to run them in separate terminal windows:

**Start Auth Service (Microservice):**
```bash
npm run start:auth-service
```
*The Auth Service runs via TCP on port 3001.*

**Start API Gateway:**
```bash
npm run start:api-gateway
```
*The API Gateway runs on HTTP port 3000.*

---

## 📖 Using Swagger UI

The API Gateway is documented using Swagger. Once the `api-gateway` is running, you can access the Swagger UI at:

**[http://localhost:3000/api](http://localhost:3000/api)**

### Authentication in Swagger
Many endpoints require authentication. To use them:
1. Obtain a JWT token (e.g., through an authentication endpoint or generated for testing).
2. Click the **Authorize** button at the top right of the Swagger UI.
3. Enter your JWT token in the Bearer token field and click **Authorize**.

---

## 🧪 Testing and Coverage

The project uses Jest for testing. You can run all tests to verify the integrity of the application.

### Running Tests
To run all tests:
```bash
npm run test:all
```

To run tests with coverage report:
```bash
npm run test:all -- --coverage
```

### Current Test Coverage

The project maintains a good level of test coverage across the core modules:
- **Overall Coverage:** ~76% of Lines, ~76% of Statements.
- **API Gateway:** Tests cover the `Accounts`, `Payments`, and `Webhooks` modules. This includes testing Controllers, Services, and the background Dispatch Workers.
- **Auth Service:** Tests cover the core Authentication logic and entity structures.
- **Shared Schemas and DTOs:** 100% coverage on data transfer objects and database schemas.

Key areas currently covered by tests:
- Webhook Ingestion Service
- Dispatch Worker
- Payments & Accounts Controllers
- Auth Service
- Payment Providers Adapters

