# HOTEL BOOKING PROJECT: CONCURRENCY, SEARCH & SAGA (The "Trinity" System)

> **Goal**: Build a scalable Hotel Booking System to master Golang, DevOps, Web, and Mobile development.
> **Philosophy**: Scale-Adaptive. Start simple (Monolith), evolve to Microservices (Saga), and optimize for specific problems (Search & Concurrency).

---

## 🏗️ 1. ARCHITECTURE & FLOW

### 1.1 The High-Level Flow (The "Trinity" Architecture)
The system is designed around 3 core pillars, each solving a specific implementation challenge:

1.  **Transactional Core (Booking)**: Strong consistency, ACID compliance.
    *   *Challenge*: Concurrency & Race Conditions.
    *   *Solution*: Distributed Locking (Redlock) & Optimistic Concurrency.
2.  **Read-Heavy Layer (Search)**: Eventual consistency, high performance.
    *   *Challenge*: Geo-spatial queries & Latency.
    *   *Solution*: Elasticsearch + PostGIS with CDC (Change Data Capture) synchronization.
3.  **Distributed Workflow (Payment/Saga)**: Asynchronous processing, resilience.
    *   *Challenge*: Distributed transactions & Failure recovery.
    *   *Solution*: Choreography Saga Pattern with RabbitMQ/Kafka.

### 1.2 Component Diagram
```mermaid
graph TD
    Client[Web/Mobile Client] --> API_Gateway[Go API Gateway]
    
    subgraph "Core Services"
        API_Gateway --> Booking_Svc[Booking Service (Go)]
        API_Gateway --> Search_Svc[Search Service (Go)]
        API_Gateway --> Payment_Svc[Payment Service (Go)]
    end
    
    subgraph "Data & State"
        Booking_Svc --> Postgres[(PostgreSQL Primary)]
        Booking_Svc --> Redis[(Redis Lock/Cache)]
        Search_Svc --> Elastic[(Elasticsearch)]
        Postgres -- CDC/Sync --> Elastic
    end
    
    subgraph "Async Workflow"
        Booking_Svc -- Event:BookingCreated --> MQ[(RabbitMQ/Kafka)]
        MQ --> Payment_Svc
        Payment_Svc -- Event:PaymentProcessed --> MQ
        MQ --> Notification_Svc[Notification Worker]
    end
```

---

## 📏 2. PROJECT RULES

### 2.1 General Rules (All stacks)
- **Repo Structure**: Monorepo for simplicity initially, or clearly separated repositories. Recommended: Monorepo with `backend/`, `web/`, `mobile/`.
- **Language**: English for code (variables, commits), Vietnamese/English mixed for documentation is acceptable personally, but stick to English for professional practice.
- **Docker First**: Every service (Backend, DB, Redis, MQ) must run via `docker-compose`.

### 2.2 Backend (Golang) Rules
- **Standard Lib First**: Use standard library where possible, `Gin` or `Echo` for HTTP.
- **Error Handling**: No `panic` allowed in HTTP handlers. Wrap errors with context.
- **Config**: 12-factor app principles. Configuration via Environment Variables (`.env`).
- **Testing**: TDD for core logic (Pricing, Inventory Check).

### 2.3 Frontend (Web - Next.js) Rules
- **Server Components**: Default to Server Components for data fetching.
- **State Management**: URL-based state for Search/Filters (shareable links).
- **UI Lib**: TailwindCSS + Shadcn/UI (standard for speed & aesthetics).

### 2.4 Mobile (React Native) Rules
- **Eco-system**: Expo (Managed Workflow) for ease of setup.
- **Navigation**: Expo Router (file-based routing similar to Next.js).
- **Styling**: NativeWind (Tailwind for RN) to share styles with Web.

### 2.5 DevOps Rules
- **CI/CD**: GitHub Actions for linting and testing on every push.
- **Observability**: OpenTelemetry/Jaeger must be integrated for the Saga flow.

---

## 🗺️ 3. ROADMAP (The Learning Path)

### 🟢 Phase 1: The Foundation (Monolith & Concurrency)
**Goal**: Get a working API that doesn't break under load.
1.  **Setup**: Go Module, Docker (Postgres, Redis), Makefiles.
2.  **Core Domain**: Hotels, Rooms, Inventory.
3.  **The Challenge**: Implement `POST /bookings` and simulate race conditions.
4.  **The Fix**: Implement Distributed Locking (Redlock) or Optimistic Locking.
5.  **Verify**: Load test with `k6` to prove 0 overbookings.

### 🟡 Phase 2: The Search Engine (Read Optimization)
**Goal**: Make it fast and geo-spatial.
1.  **Infrastructure**: Add Elasticsearch and PostGIS to Docker.
2.  **Sync**: Build a worker to sync Postgres -> Elasticsearch.
3.  **API**: Implement `GET /hotels/search` with geo-filters.
4.  **Frontend**: Build the Map View (Web/Mobile) with clustering.

### 🔵 Phase 3: The Saga (Distributed Reliability)
**Goal**: Handle payments & notifications without losing data.
1.  **Infrastructure**: Add RabbitMQ to Docker.
2.  **Decompose**: Split "Booking" and "Payment" logic (logical separation or microservices).
3.  **Orchestration**: Implement `BookingCreated` -> `PaymentSuccess` -> `ConfirmBooking`.
4.  **Resilience**: Implement Outbox Pattern and Dead Letter Queues (DLQ).

### 🔴 Phase 4: Production Polish (DevOps)
**Goal**: Metrics, logs, and deployment.
1.  **Observability**: Add Prometheus (metrics) and Jaeger (tracing).
2.  **CI/CD**: Build pipelines.
3.  **Deployment**: Kubernetes (optional, for "Advanced" badge).

---

## 📁 Recommended Directory Structure (Monorepo)

```text
/booking-app
├── .github/                # CI/CD Workflows
├── backend/                # Golang Services
│   ├── cmd/                # Entrypoints (api, workers)
│   ├── internal/           # Private code
│   │   ├── core/           # Domain logic
│   │   ├── adapter/        # DB, Redis, MQ adapters
│   │   └── port/           # Interfaces
│   ├── pkg/                # Public shared code
│   └── docker-compose.yml  # Local dev infra
├── web/                    # Next.js Application
├── mobile/                 # React Native (Expo) App
├── docs/                   # Architecture plans & ADRs
└── Makefile                # Global automation
```
