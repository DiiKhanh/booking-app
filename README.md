<div align="center">

# StayEase

**A Production-Grade Hotel Booking Platform**

*Mastering Concurrency · Geo-spatial Search · Event-Driven Sagas*

[![Go](https://img.shields.io/badge/Go-1.24-00ADD8?logo=go)](https://golang.org)
[![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)](https://nextjs.org)
[![Expo](https://img.shields.io/badge/Expo-SDK%2054-000020?logo=expo)](https://expo.dev)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?logo=postgresql)](https://postgresql.org)
[![Redis](https://img.shields.io/badge/Redis-7-DC382D?logo=redis)](https://redis.io)
[![Elasticsearch](https://img.shields.io/badge/Elasticsearch-8-005571?logo=elasticsearch)](https://elastic.co)

</div>

---

## Table of Contents

1. [Overview](#1-overview)
2. [The Trinity Architecture](#2-the-trinity-architecture)
3. [Monorepo Structure](#3-monorepo-structure)
4. [Backend — Go API](#4-backend--go-api)
5. [Web Portal — Next.js 15](#5-web-portal--nextjs-15)
6. [Mobile App — Expo React Native](#6-mobile-app--expo-react-native)
7. [Infrastructure & DevOps](#7-infrastructure--devops)
8. [Design System](#8-design-system)
9. [API Reference](#9-api-reference)
10. [Phase Roadmap](#10-phase-roadmap)
11. [Development Guide](#11-development-guide)
12. [Key Patterns Deep Dive](#12-key-patterns-deep-dive)

---

## 1. Overview

**StayEase** is a full-stack hotel booking platform engineered to demonstrate mastery of three advanced distributed systems challenges:

| Challenge | Problem | Solution |
|---|---|---|
| **Concurrency** | Two users book the same room simultaneously | Redis distributed locking (SETNX + Lua atomic release) |
| **Search at Scale** | Geo-spatial queries on 1M+ hotels are slow in SQL | Elasticsearch + PostGIS with CDC synchronization |
| **Distributed Reliability** | Payment success but booking fails (or vice versa) | Choreography Saga Pattern via RabbitMQ |

The platform serves three roles across two clients:

| Role | Web Portal | Mobile App |
|---|---|---|
| **Guest / User** | — | Browse, search, book, pay |
| **Hotel Owner** | Manage properties, rooms, inventory, analytics | Lightweight management |
| **Admin** | Platform oversight, approvals, system health | Basic monitoring |

---

## 2. The Trinity Architecture

### 2.1 High-Level Component Diagram

```mermaid
graph TD
    Client[Web / Mobile Client] --> API[Go API Gateway :8080]

    subgraph Core Services
        API --> BookingSvc[Booking Service]
        API --> SearchSvc[Search Service]
        API --> PaymentSvc[Payment Service]
    end

    subgraph Data & State
        BookingSvc --> PG[(PostgreSQL 16\nPrimary DB)]
        BookingSvc --> Redis[(Redis 7\nLock + Cache)]
        SearchSvc  --> ES[(Elasticsearch 8\nFull-text + Geo)]
        PG -- CDC Sync --> ES
    end

    subgraph Async Workflow
        BookingSvc -- BookingCreated --> MQ[(RabbitMQ\nMessage Broker)]
        MQ --> PaymentSvc
        PaymentSvc -- PaymentProcessed --> MQ
        MQ --> NotifWorker[Notification Worker]
    end

    subgraph Observability
        API --> Prometheus[(Prometheus)]
        Prometheus --> Grafana[Grafana Dashboards]
    end
```

### 2.2 Flow 1 — Transactional Core (Concurrency)

Two simultaneous booking requests for the same room are handled without overbooking via Redis distributed locking:

```mermaid
sequenceDiagram
    participant UserA
    participant UserB
    participant API as Booking API
    participant Redis as Redis Lock
    participant DB as PostgreSQL

    UserA->>API: POST /bookings (Room 101, Jan 15)
    UserB->>API: POST /bookings (Room 101, Jan 15)

    API->>Redis: SETNX lock:room:101:2026-01-15 (UserA, TTL=5s)
    Redis-->>API: OK — lock acquired

    API->>Redis: SETNX lock:room:101:2026-01-15 (UserB)
    Redis-->>API: FAIL — already locked
    API-->>UserB: 409 Conflict → retry with backoff

    API->>DB: BEGIN TX (Serializable)
    API->>DB: SELECT count FROM inventory FOR UPDATE
    API->>DB: INSERT INTO bookings
    API->>DB: UPDATE inventory SET count = count - 1
    API->>DB: COMMIT TX

    API->>Redis: Lua script — atomic DEL if owner
    API-->>UserA: 201 Created — booking confirmed
```

**Lock key format**: `lock:room:{roomID}:{date}`
**Retry policy**: 10 attempts × 50ms exponential backoff
**Release**: Lua script ensures atomic owner-only deletion (prevents stale-lock deletion by another holder)

### 2.3 Flow 2 — Search Engine (Read Optimization)

```mermaid
graph LR
    User(Search Query) --> API(Search API)
    API --> Cache{Redis\nCache Hit?}
    Cache -- Yes --> Result(Return Cached)
    Cache -- No  --> ES(Elasticsearch\nGeo-distance Query)
    ES --> Cache
    ES --> Result

    subgraph CDC Sync
        PG(PostgreSQL) -- WAL / polling --> Worker(Go Sync Worker)
        Worker -- Bulk Index --> ES
    end
```

**Query parameters**: `lat`, `lng`, `radius`, `price_min`, `price_max`, `amenities`, `dates`, `page`
**Geo index**: PostGIS `geography(POINT)` in Postgres, mirrored as `geo_point` in Elasticsearch
**Performance**: Redis cache layer in front of Elasticsearch for hot queries

### 2.4 Flow 3 — Payment Saga (Distributed Workflow)

```mermaid
sequenceDiagram
    participant Client
    participant OrderSvc as Order Service
    participant MQ as RabbitMQ
    participant PaySvc as Payment Service
    participant InvSvc as Inventory Service

    Client->>OrderSvc: POST /checkout
    OrderSvc->>DB: Create Order (PENDING)
    OrderSvc->>MQ: Publish OrderCreated

    MQ->>PaySvc: Consume OrderCreated
    PaySvc->>Gateway: Process Charge

    alt Payment Success
        PaySvc->>MQ: Publish PaymentSuccess
        MQ->>InvSvc: Consume PaymentSuccess
        InvSvc->>DB: Reserve Inventory
        InvSvc->>MQ: Publish InventoryReserved
        MQ->>OrderSvc: Consume InventoryReserved
        OrderSvc->>DB: Order → CONFIRMED
    else Payment Failed
        PaySvc->>MQ: Publish PaymentFailed
        MQ->>OrderSvc: Consume PaymentFailed
        OrderSvc->>DB: Order → FAILED
        OrderSvc->>Client: Failure Notification
    end
```

**State machine**: `CREATED → AWAITING_PAYMENT → PROCESSING → CONFIRMED | FAILED`
**Idempotency**: Processed message IDs stored in Redis to prevent double-processing
**Resilience**: Outbox Pattern + Dead Letter Queues (DLQ) for failure recovery

---

## 3. Monorepo Structure

```
booking-app/
├── backend/                    # Go 1.24 REST API
│   ├── cmd/api/main.go         # Entrypoint — DI, server bootstrap
│   ├── internal/               # Private application code
│   │   ├── domain/             # Sentinel errors, core models
│   │   ├── handler/            # HTTP request parsing + response formatting
│   │   ├── service/            # Business logic layer
│   │   ├── repository/         # DB operations + distributed locking
│   │   ├── infrastructure/
│   │   │   ├── redis/          # Distributed lock (Lua atomic release)
│   │   │   ├── jwt/            # JWT token management
│   │   │   └── elasticsearch/  # Search indexing
│   │   ├── middleware/         # Auth, logging, metrics, CORS, rate limiting
│   │   ├── router/             # Route registration (50+ endpoints)
│   │   ├── dto/                # API response envelope
│   │   ├── config/             # 12-factor env config
│   │   └── observability/      # Zap structured logging
│   ├── docker-compose.yml      # Full local infrastructure
│   ├── Makefile                # All dev commands
│   └── go.mod
│
├── web/                        # Next.js 15 Management Portal
│   ├── app/
│   │   ├── (auth)/             # Login, forgot password
│   │   ├── (owner)/            # Hotel Owner portal (sidebar layout)
│   │   └── (admin)/            # Admin portal (sidebar layout)
│   ├── components/             # Shadcn/UI + custom components
│   ├── hooks/                  # use-auth, use-websocket, use-data-table
│   ├── services/               # Axios API clients
│   ├── stores/                 # Zustand (auth, sidebar, notifications)
│   └── types/                  # TypeScript interfaces
│
├── mobile/                     # Expo React Native App
│   ├── app/
│   │   ├── (auth)/             # Login, register, onboarding
│   │   ├── (guest)/            # 5-tab guest interface
│   │   ├── (owner)/            # 4-tab owner interface
│   │   └── (admin)/            # 4-tab admin interface
│   ├── components/             # UI, hotel, search, booking, owner, admin
│   ├── hooks/                  # useSearchHotels, useBookingFlow, useConflictRetry
│   ├── services/               # API clients
│   ├── stores/                 # Zustand (auth, search, booking)
│   └── constants/              # Theme tokens, endpoints
│
└── docs/                       # Architecture & planning
    ├── PROJECT_ROADMAP.md      # 4-phase high-level roadmap
    ├── PROJECT_RULES.md        # Development guidelines
    ├── MASTER_FLOW.md          # End-to-end execution flows
    ├── tasks/
    │   ├── task_plan_concurrency.md
    │   ├── task_plan_search.md
    │   ├── task_plan_saga.md
    │   └── backend/1-10.json   # Task tracking (status per phase)
    ├── web/PLAN-web-booking-app.md
    └── mobile/PLAN-mobile-booking-app.md
```

---

## 4. Backend — Go API

### 4.1 Stack

| Concern | Technology |
|---|---|
| HTTP framework | `github.com/gin-gonic/gin` |
| Database | PostgreSQL 16 via `github.com/lib/pq` |
| Caching / Locking | Redis 7 via `github.com/redis/go-redis/v9` |
| Search | Elasticsearch 8 via `github.com/elastic/go-elasticsearch/v8` |
| Authentication | JWT via `github.com/golang-jwt/jwt/v5` |
| Password hashing | `golang.org/x/crypto/bcrypt` |
| Structured logging | `go.uber.org/zap` |
| Metrics | `github.com/prometheus/client_golang` |

### 4.2 Layered Architecture

```
HTTP Request
     │
     ▼
┌──────────────────────────────────────────────────────────┐
│  Middleware Layer                                         │
│  Recovery · CorrelationID · RequestLogger · Auth · RBAC  │
│  RateLimit (Redis) · Prometheus metrics                   │
└──────────────────────────────────────────────────────────┘
     │
     ▼
┌──────────────────────────────────────────────────────────┐
│  Handler Layer                                           │
│  Parse request → validate → call service → format response│
└──────────────────────────────────────────────────────────┘
     │
     ▼
┌──────────────────────────────────────────────────────────┐
│  Service Layer (Business Logic)                          │
│  Pricing rules · Inventory checks · Conflict resolution   │
└──────────────────────────────────────────────────────────┘
     │
     ▼
┌──────────────────────────────────────────────────────────┐
│  Repository Layer (Data Access)                          │
│  SQL queries · Distributed locks · Cache read/write       │
└──────────────────────────────────────────────────────────┘
     │
     ▼
┌──────────────────────────────────────────────────────────┐
│  Domain Layer                                            │
│  Models (Hotel, Room, Booking) · Sentinel errors          │
└──────────────────────────────────────────────────────────┘
```

### 4.3 Standard API Response Envelope

Every endpoint returns the same envelope — never raw data or raw errors:

```json
{
  "success": true,
  "data": { "id": "abc123", "status": "confirmed" },
  "error": null,
  "meta": { "total": 500, "page": 1, "limit": 20 }
}
```

### 4.4 Error Hierarchy

```go
// Domain sentinel errors — map to HTTP status codes in the handler layer
ErrNotFound      → 404 Not Found
ErrConflict      → 409 Conflict  (concurrent booking attempt)
ErrLockFailed    → 409 Conflict  (Redis lock acquisition failure)
ErrUnauthorized  → 401 Unauthorized
ErrForbidden     → 403 Forbidden
ErrBadRequest    → 400 Bad Request
```

### 4.5 Available Commands

```bash
cd backend

# Infrastructure
make infra-up         # Start Postgres, Redis, Elasticsearch, Prometheus, Grafana
make infra-down       # Stop all containers

# Database
make createdb         # Create booking_db
make migrate          # Run all migrations (up)
make reset-db         # Full tear-down and rebuild

# Development
make server           # Start API server on :8080
make tidy             # go mod tidy

# Testing & Load
make test             # Run Go unit tests
make load-test        # k6 load test (proves 0 overbookings under concurrency)
```

Run a single test file:

```bash
cd backend && go test ./internal/service/... -run TestBookingService -v
```

### 4.6 Route Map (50+ Endpoints)

| Group | Endpoints |
|---|---|
| `POST /auth/register` `POST /auth/login` `POST /auth/refresh` `GET /auth/me` | Authentication |
| `GET /hotels` `GET /hotels/search` `GET /hotels/:id` `GET /hotels/:id/rooms` | Public hotel & search |
| `GET /rooms/:id` `GET /rooms/:id/reviews` | Public room & reviews |
| `POST /bookings` `GET /bookings` `GET /bookings/:id` `DELETE /bookings/:id` | Guest booking |
| `POST /reviews` `PUT /reviews/:id` `DELETE /reviews/:id` | Guest reviews |
| `GET /owner/hotels` `POST /owner/hotels` `PUT /owner/hotels/:id` `DELETE /owner/hotels/:id` | Owner hotel CRUD |
| `GET/POST/PUT /owner/hotels/:id/rooms` | Owner room management |
| `PUT /owner/rooms/:id/inventory` | Owner inventory |
| `GET /owner/reservations` `PUT /owner/reservations/:id/status` | Owner reservations |
| `GET /admin/users` `PUT /admin/users/:id/role` `PUT /admin/users/:id/ban` | Admin users |
| `GET /admin/hotels/pending` `PUT /admin/hotels/:id/approve` | Admin hotel approval |
| `GET /admin/bookings` `GET /admin/analytics` | Admin oversight |
| `GET /health` `GET /health/live` `GET /health/ready` `GET /metrics` | Health & observability |

---

## 5. Web Portal — Next.js 15

The web app is a **management portal** for Hotel Owners and Admins — desktop-optimized with wide dashboards, data tables, and real-time monitoring.

### 5.1 Stack

| Concern | Technology |
|---|---|
| Framework | Next.js 15 (App Router, React Server Components) |
| Styling | TailwindCSS v4 + CSS custom properties |
| Component library | Shadcn/UI (Radix primitives) |
| State — server | TanStack React Query v5 |
| State — client | Zustand v5 |
| Charts | Recharts v2 (CSS variable-driven for dark mode) |
| Tables | TanStack Table v8 (sorting, filtering, virtual scroll) |
| Forms | React Hook Form + Zod v4 |
| Theme | next-themes (Light / Dark / System) |
| HTTP | Axios v1 with JWT interceptors + auto-refresh |
| Real-time | Native WebSocket + reconnecting-websocket |
| Toast | Sonner |
| Command palette | cmdk (⌘+K) |

### 5.2 Route Structure

```
app/
├── (auth)/
│   └── login/                  → /login
│
├── (owner)/                    ← Sidebar layout — Owner nav
│   ├── dashboard/              → /dashboard
│   ├── properties/             → /properties
│   │   ├── new/                → /properties/new
│   │   └── [id]/
│   │       ├── rooms/          → /properties/:id/rooms
│   │       │   └── [roomId]/
│   │       │       └── inventory/ → /properties/:id/rooms/:roomId/inventory
│   │       └── settings/
│   ├── reservations/           → /reservations
│   ├── analytics/              → /analytics
│   ├── messages/               → /messages
│   └── settings/               → /settings
│
└── (admin)/                    ← Sidebar layout — Admin nav
    ├── dashboard/              → /dashboard
    ├── hotels/                 → /hotels (approval queue)
    ├── users/                  → /users
    ├── bookings/               → /bookings
    ├── analytics/              → /analytics
    ├── system/
    │   ├── logs/               → /system/logs
    │   └── dlq/                → /system/dlq
    └── settings/               → /settings
```

### 5.3 Owner Dashboard Layout

```
┌─────────┬──────────────────────────────────────────────────────┐
│         │  Breadcrumb · Search (⌘K) · 🔔 · ☀️/🌙 · 👤        │
│ S I D E ├──────────────────────────────────────────────────────┤
│ B A R   │  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐            │
│         │  │Total │  │Occup.│  │Rev.  │  │New   │  ← KPIs    │
│ 📊 Dash │  │Rooms │  │Rate  │  │Today │  │Books │            │
│ 🏨 Prop │  └──────┘  └──────┘  └──────┘  └──────┘            │
│ 📋 Resv │  ┌──────────────────────┐  ┌───────────────────┐    │
│ 📈 Ana  │  │  Revenue Chart       │  │  Recent Activity   │    │
│ 💬 Chat │  │  (Recharts Composed) │  │  · Booking #123   │    │
│ ⚙️ Set  │  │  Line + Bar + Toggle │  │  · Room edited    │    │
│         │  └──────────────────────┘  └───────────────────┘    │
└─────────┴──────────────────────────────────────────────────────┘
```

### 5.4 Admin Dashboard Layout

```
┌─────────┬──────────────────────────────────────────────────────┐
│         │  Breadcrumb · Search (⌘K) · 🔔 · ☀️/🌙 · 👤        │
│ S I D E ├──────────────────────────────────────────────────────┤
│ B A R   │  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐            │
│         │  │Active│  │Total │  │Today │  │System│  ← Live    │
│ 📊 Dash │  │Users │  │Hotels│  │Trans.│  │Load  │  Counters  │
│ 🏨 Hot  │  └──────┘  └──────┘  └──────┘  └──────┘            │
│ 👥 User │  ┌──────────────────────────────────────────────┐    │
│ 📋 Book │  │ System Health                                 │    │
│ 📈 Ana  │  │  ┌──────────┐ ┌──────┐ ┌──────────┐ ┌──────┐ │    │
│ 🖥️ Sys  │  │  │PostgreSQL│ │Redis │ │RabbitMQ  │ │Elast.│ │    │
│ ⚙️ Set  │  │  │   ✅     │ │  ✅  │ │  ⚠️      │ │  ✅  │ │    │
│         │  └──────────────────────────────────────────────┘    │
└─────────┴──────────────────────────────────────────────────────┘
```

### 5.5 Key Implementation Details

- **Dark mode**: Zero hardcoded colors — every component uses CSS custom properties (`--primary`, `--chart-1`, etc.). Charts use `--chart-*` variables. No FOUC via `next-themes` + `suppressHydrationWarning`.
- **JWT flow**: Axios interceptor catches 401, calls `/auth/refresh`, queues failed requests, replays on success.
- **Role routing**: `middleware.ts` reads JWT `role` claim and redirects to the appropriate portal.
- **Mock data**: All pages include `placeholderData` in `useQuery` for development without a live backend.
- **WebSocket channels**: `ws://api/ws/owner/{ownerId}` for bookings, `ws://api/ws/admin` for real-time dashboard, `ws://api/ws/chat/{userId}` for messaging.

---

## 6. Mobile App — Expo React Native

The mobile app is the **primary guest experience** — plus lightweight owner and admin views.

### 6.1 Stack

| Concern | Technology |
|---|---|
| Framework | Expo SDK 54 (Managed Workflow) |
| Navigation | Expo Router v6 (file-based, mirrors Next.js) |
| Styling | NativeWind v4 (Tailwind for React Native) |
| State — server | TanStack React Query v5 |
| State — client | Zustand v5 |
| Maps | react-native-maps + react-native-map-clustering |
| Animations | react-native-reanimated v4 + moti |
| Bottom sheet | @gorhom/bottom-sheet v5 |
| Token storage | expo-secure-store (encrypted, not AsyncStorage) |
| Push notifications | expo-notifications |
| Forms | React Hook Form + Zod |
| HTTP | Axios (same interceptor pattern as web) |

### 6.2 Navigation Structure

**Guest (5 tabs)**
```
🏠 Home    🔍 Search    📋 Bookings    🔔 Notifications    👤 Profile
   │            │             │
   ├ Explore    ├ Filters     ├ My Bookings
   ├ Hotel[id]  ├ Map View    └ Booking[id]
   ├ Room[id]   └ Results
   └ Booking Flow
      ├ Select Dates & Guests
      ├ Review & Pay
      ├ Processing (Saga status with animation)
      └ Confirmation
```

**Hotel Owner (4 tabs)**
```
📊 Dashboard    🏨 Properties    📬 Reservations    👤 Profile
      │               │                 │
      └ Analytics     ├ Hotel List      ├ Booking List
                      ├ Hotel[id]       └ Booking[id]
                      ├ Create Hotel
                      ├ Rooms[hotelId]
                      └ Inventory[roomId]
```

**Admin (4 tabs)**
```
📊 Overview    👥 Users    🏨 Hotels    🖥️ System
                  │           │             │
                  ├ List       ├ Approval    ├ Health Monitor
                  └ User[id]   └ Hotel[id]   └ Event Logs
```

### 6.3 Booking Conflict UX (409 Handling)

When a user hits the distributed lock (race condition), the app does not show a raw error:

```
User taps "Book Now"
        │
        ▼
 Optimistic loading state (spin)
        │
   ┌────┴─────┐
   │          │
  201        409
   │          │
   ▼          ▼
Confirmation  ConflictRetryModal:
              "This room was just booked"
              ┌────────────────────────────────┐
              │ 🔄 Try Again (auto backoff)     │
              │ 🏨 View Similar Rooms           │
              │ 📅 Change Dates                 │
              └────────────────────────────────┘
```

### 6.4 Payment Saga Status Screen

```
PENDING         → Pulsing dots
AWAITING_PAYMENT → Credit card animation
PROCESSING      → Spinning gears
CONFIRMED       → Confetti burst 🎉
FAILED          → Shake animation + error message
```

Real-time updates via WebSocket (`ws://api/ws/bookings`), with a 5-second polling fallback if disconnected.

### 6.5 Map & Search Performance

- **Clustering**: `react-native-map-clustering` (supercluster algorithm) — critical for 10K+ hotels
- **Viewport search**: `useMapViewport` hook sends NE/SW bounds on map move → calls `GET /hotels/search` with geo params
- **Debounce**: 300ms on text input before triggering search
- **Optimization**: `tracksViewChanges={false}` on markers, limit visible pins to 100, memoized `MapMarker`

---

## 7. Infrastructure & DevOps

### 7.1 Docker Compose Services

```bash
cd backend && make infra-up
```

| Service | Port | Purpose |
|---|---|---|
| PostgreSQL 16 | 5432 | Primary database |
| Adminer | 8081 | DB GUI |
| Redis 7 | 6379 | Lock + cache |
| Redis Commander | 8082 | Redis GUI |
| Elasticsearch 8 | 9200 | Full-text + geo search |
| RabbitMQ | 5672 / 15672 | Message broker (management UI) |
| Prometheus | 9090 | Metrics scraping |
| Grafana | 3001 | Dashboards |

All services include health checks and proper `depends_on: condition: service_healthy` ordering.

### 7.2 Observability Stack

```
Go API → Prometheus /metrics endpoint
              │
              ▼
         Prometheus
              │
              ▼
         Grafana Dashboards
         ├─ Request rate & latency (P95, P99)
         ├─ Active bookings & conflicts (409 rate)
         ├─ Lock acquisition time
         ├─ Redis hit/miss ratio
         └─ Error rates by endpoint
```

Structured logging via `go.uber.org/zap`:
- Correlation IDs propagated through middleware → service → repository
- Request/response logged with duration, status code, method, path
- Error context wrapped with `fmt.Errorf("%w", err)` at every layer

### 7.3 Database Migrations

All schema changes via versioned migration files — never manual DDL:

```bash
# Files live in backend/migrations/
migrations/
├── 001_create_users.up.sql        / .down.sql
├── 002_create_hotels_rooms.up.sql / .down.sql
├── 003_create_inventory.up.sql    / .down.sql
├── 004_create_bookings.up.sql     / .down.sql
└── 005_create_reviews.up.sql      / .down.sql
```

Rules enforced:
- Index on every foreign key
- Index on `status`, `created_at`, and frequently filtered columns
- Transactions for all multi-table writes (booking + inventory update must be atomic)

### 7.4 Rate Limiting

Redis-backed sliding window rate limiter applied globally and per-route:

```
Guest endpoints    → 100 req/min
Auth endpoints     → 10 req/min (brute-force protection)
Owner/Admin APIs   → 300 req/min
Search endpoint    → 60 req/min
```

---

## 8. Design System

Both web and mobile share a consistent brand palette and typography system.

### 8.1 Color Palette

| Token | Hex | Usage |
|---|---|---|
| `primary-500` | `#1A3A6B` | Deep Navy — trust, primary actions |
| `accent-500` | `#FF5733` | Coral Sunset — CTAs, energy |
| `success-500` | `#10B981` | Emerald — confirmed, available |
| `warning-500` | `#F59E0B` | Amber — limited availability, caution |
| `error-500` | `#EF4444` | Rose — errors, sold out, failed |
| `neutral-900` | `#0F172A` | Near-black text |
| `neutral-50` | `#F8FAFC` | Off-white backgrounds |

### 8.2 Web CSS Variables (Light / Dark)

```css
/* Light Mode */
--primary: 217 60% 26%;       /* Deep Navy */
--accent:  14 100% 60%;       /* Coral Sunset */
--background: 0 0% 100%;
--foreground: 222 47% 11%;

/* Dark Mode (.dark) */
--primary: 217 60% 50%;       /* Brighter Navy for dark backgrounds */
--accent:  14 100% 60%;       /* Coral stays vibrant */
--background: 224 71% 4%;     /* Near-black with blue tint */
--foreground: 213 31% 91%;
```

All Recharts components use `--chart-1` through `--chart-5` variables, ensuring automatic dark mode adaptation without any JS theme checks.

### 8.3 Typography

| Font | Variable | Usage |
|---|---|---|
| Plus Jakarta Sans | `--font-heading` | Headings — modern, premium |
| Inter | `--font-body` | Body text — highly readable |
| DM Sans | `--font-mono` | Prices, numbers — distinctive |

### 8.4 Mobile Micro-Animations

| Animation | Trigger | Library |
|---|---|---|
| Card press scale (0.97) | `onPressIn` | `reanimated` |
| Bottom sheet spring | Drag gesture | `@gorhom/bottom-sheet` |
| Skeleton shimmer | Loading state | `moti` |
| Saga status pulse | State change | `reanimated` |
| Confetti burst | Booking confirmed | `react-native-confetti-cannon` |
| Shake on error | 409 Conflict | `reanimated` |
| Map marker bounce | New results | `reanimated` |

---

## 9. API Reference

### 9.1 Authentication

All protected endpoints require: `Authorization: Bearer <jwt_token>`

```http
POST /auth/register
POST /auth/login
POST /auth/refresh
GET  /auth/me
```

### 9.2 Search

```http
GET /hotels/search?lat=10.78&lng=106.69&radius=5&price_min=50&price_max=200&amenities=wifi,pool&check_in=2026-03-01&check_out=2026-03-05&page=1&limit=20
```

Returns: Ranked list of hotels with distance, availability, and pricing.

### 9.3 Booking

```http
POST   /bookings          # Creates booking — 201 on success, 409 on conflict
GET    /bookings          # List authenticated user's bookings
GET    /bookings/:id      # Single booking detail
GET    /bookings/:id/status  # Saga FSM state (for polling)
DELETE /bookings/:id      # Cancel booking (restores inventory)
```

### 9.4 WebSocket Events

| Endpoint | Event | Payload |
|---|---|---|
| `ws://api/ws/bookings` | `booking.status.changed` | `{ bookingId, status, timestamp }` |
| `ws://api/ws/notifications` | `notification.new` | `{ type, title, body, data }` |
| `ws://api/ws/owner/:id` | `booking.new`, `booking.status` | `{ booking }` |
| `ws://api/ws/admin` | `system.health`, `user.activity` | `{ services[], activeUsers, txVolume }` |
| `ws://api/ws/chat/:userId` | `message.new`, `message.read` | `{ conversationId, message }` |

---

## 10. Phase Roadmap

### Backend Phases

```mermaid
graph LR
    P1[1 Foundation\n✅] --> P2[2 Auth JWT\n✅]
    P2 --> P3[3 Hotel CRUD\n✅]
    P3 --> P4[4 Bookings\n✅]
    P1 --> P5[5 Metrics\n✅]
    P3 --> P6[6 Reviews\n✅]
    P3 --> P7[7 Search\n✅]
    P4 --> P8[8 Saga\n⏳]
    P8 --> P9[9 WebSocket\n⏳]
    P5 --> P10[10 Admin+Tracing\n⏳]
    P6 --> P10
    P7 --> P10
    P8 --> P10
    P9 --> P10
```

| Phase | Subject | Status |
|---|---|---|
| 1 | Foundational refactoring — layered architecture, Zap logging, response envelope | ✅ Done |
| 2 | Authentication & Authorization — JWT + RBAC (guest, owner, admin) | ✅ Done |
| 3 | Hotel & Room CRUD — owner management, admin approval (17 endpoints) | ✅ Done |
| 4 | Enhanced booking flow — dynamic pricing, inventory restoration on cancel | ✅ Done |
| 5 | Metrics & health — Prometheus, Grafana, Redis-backed rate limiting | ✅ Done |
| 6 | Reviews system — CRUD with completed-booking validation | ✅ Done |
| 7 | Search engine — Elasticsearch + PostGIS geo-search, Redis cache, 10K seeder | ✅ Done |
| 8 | Payment saga — RabbitMQ, FSM, outbox pattern (2 endpoints) | ⏳ Pending |
| 9 | Notifications & WebSocket — real-time saga status (5 endpoints) | ⏳ Pending |
| 10 | Admin APIs, OpenTelemetry tracing, Jaeger, Grafana polish (8 endpoints) | ⏳ Pending |

### Web Portal Phases

| Phase | Subject | Status |
|---|---|---|
| W-1 | Foundation — Next.js scaffold, sidebar, auth, theme, Zustand, Axios | ✅ Done |
| W-2 | Owner dashboard — KPI cards, revenue chart, property & room CRUD, inventory calendar | ✅ Done |
| W-3 | Reservations & analytics — booking table, WebSocket, occupancy chart, CSV export | ⏳ Planned |
| W-4 | Admin portal — real-time counters, hotel approval queue, user management | ⏳ Planned |
| W-5 | System monitoring & chat — DLQ viewer, log viewer, real-time messaging | ⏳ Planned |
| W-6 | Polish — keyboard shortcuts, skeleton states, E2E tests, Lighthouse > 90 | ⏳ Planned |

### Mobile App Phases

| Phase | Subject | Status |
|---|---|---|
| M-1 | Foundation — Expo scaffold, auth screens, Zustand, Axios, design system | ✅ Done |
| M-2 | Search & discovery — SearchBar, FilterSheet, MapView, clustering, hotel detail | 🔄 In Progress |
| M-3 | Booking & concurrency — booking form, 409 ConflictRetryModal, my bookings | 🔄 In Progress |
| M-4 | Payment saga — PaymentForm, SagaStatusTracker, WebSocket, push notifications | ⏳ Planned |
| M-5 | Owner portal — dashboard, property CRUD, inventory calendar, reservations | ⏳ Planned |
| M-6 | Admin panel — overview, user management, hotel approvals, system health | ⏳ Planned |
| M-7 | Polish — haptics, skeletons, offline mode, deep links, Maestro E2E tests | ⏳ Planned |

---

## 11. Development Guide

### 11.1 Prerequisites

- Go 1.24+
- Node.js 20+ / npm
- Docker & Docker Compose
- Expo CLI (`npm install -g @expo/cli`)

### 11.2 Quick Start

```bash
# 1. Clone the repo
git clone https://github.com/yourorg/booking-app && cd booking-app

# 2. Start infrastructure
cd backend
cp .env.example .env          # Fill in secrets
make infra-up                 # Postgres, Redis, Elasticsearch, RabbitMQ, Grafana
make createdb && make migrate  # Bootstrap database

# 3. Start backend
make server                   # API running at http://localhost:8080

# 4. Start web portal (new terminal)
cd web
npm install
npm run dev                   # http://localhost:3000

# 5. Start mobile app (new terminal)
cd mobile
npm install
npm start                     # Expo dev server
# Press 'i' for iOS simulator, 'a' for Android emulator
```

### 11.3 Environment Variables

```bash
# backend/.env.example
DB_URL=postgres://postgres:password@localhost:5432/booking_db?sslmode=disable
REDIS_URL=redis://localhost:6379
ELASTICSEARCH_URL=http://localhost:9200
RABBITMQ_URL=amqp://guest:guest@localhost:5672/
JWT_SECRET=your-secret-key-min-32-chars
JWT_REFRESH_SECRET=another-secret-key
SERVER_PORT=8080
```

### 11.4 Git Workflow

```
feat:     New feature
fix:      Bug fix
refactor: Code restructuring without behavior change
test:     Adding or updating tests
docs:     Documentation only
perf:     Performance improvement
ci:       CI/CD pipeline changes
chore:    Maintenance tasks
```

Branch naming: `feature/concurrency-fix`, `fix/search-bug`, `refactor/repo-layer`

### 11.5 Testing

| Layer | Tool | Target Coverage |
|---|---|---|
| Backend unit | `go test ./...` | 80% |
| Backend integration | Go test + test DB | Service + repository layer |
| Backend load | k6 (`make load-test`) | 0 overbookings under 100 concurrent users |
| Web unit | Vitest + React Testing Library | 80% components & hooks |
| Web E2E | Playwright | 100% critical flows |
| Web visual | Chromatic (Storybook) | All components |
| Mobile unit | Jest + RNTL | 80% components & hooks |
| Mobile E2E | Maestro | 100% critical flows |

---

## 12. Key Patterns Deep Dive

### 12.1 Distributed Locking

```go
// internal/infrastructure/redis/distributed_lock.go

// Acquire: SETNX with TTL — atomic via Redis single-threaded model
func (l *Lock) Acquire(ctx context.Context, key string, ttl time.Duration) (bool, error) {
    return l.client.SetNX(ctx, key, l.ownerID, ttl).Result()
}

// Release: Lua script — atomically check owner then delete
// Prevents lock deletion by a different holder (e.g., after TTL extension race)
const releaseScript = `
    if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
    else
        return 0
    end
`
```

**Why Lua?** A `GET` + conditional `DEL` in application code has a race window. The Lua script executes atomically on the Redis server — no other command can interleave between the check and the delete.

### 12.2 Repository Pattern

```go
// Interfaces defined in domain layer — implementations in repository layer
type HotelRepository interface {
    FindAll(ctx context.Context, filters HotelFilters) ([]Hotel, int, error)
    FindByID(ctx context.Context, id string) (*Hotel, error)
    Create(ctx context.Context, hotel *Hotel) (*Hotel, error)
    Update(ctx context.Context, id string, updates HotelUpdates) (*Hotel, error)
    Delete(ctx context.Context, id string) error
}
```

Services depend on the interface — not the concrete type. This enables:
- Easy substitution of storage backends (Postgres → mock in tests)
- Clean boundary between business logic and data access
- Testability without a live database

### 12.3 Context Propagation

Every database and Redis call receives a `context.Context`:

```go
// Correct — context flows from HTTP handler down to DB
func (s *BookingService) Create(ctx context.Context, req CreateBookingRequest) (*Booking, error) {
    locked, err := s.lock.Acquire(ctx, lockKey, 5*time.Second)
    // ...
    result, err := s.repo.Create(ctx, booking)
    // ...
}
```

This enables:
- Request cancellation — if the client disconnects, in-flight DB queries abort
- Deadline propagation — timeouts set at the handler level are respected all the way down
- Correlation ID propagation — middleware adds `X-Correlation-ID` to context, logger reads it

### 12.4 Outbox Pattern (Phase 8)

Prevents the dual-write problem (write to DB and publish to MQ are not atomic):

```
1. Service writes Booking + OutboxEvent in ONE DB transaction
2. Background worker polls outbox table
3. Worker publishes event to RabbitMQ
4. Worker marks event as published
5. On failure: event remains unpublished → retry next poll
```

This guarantees **at-least-once delivery** — consumers must be idempotent (deduplicate by message ID stored in Redis).

### 12.5 Shared Client Patterns (Web & Mobile)

Both web and mobile use the same Axios interceptor pattern:

```typescript
// Attach token
api.interceptors.request.use((config) => {
  const token = authStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto-refresh on 401
api.interceptors.response.use(null, async (error) => {
  if (error.response?.status === 401 && !error.config._retry) {
    error.config._retry = true;
    const newToken = await authService.refresh();
    error.config.headers.Authorization = `Bearer ${newToken}`;
    return api(error.config);
  }
  return Promise.reject(error);
});
```

Tokens stored in:
- **Web**: `localStorage` (via Zustand persist middleware)
- **Mobile**: `expo-secure-store` (hardware-encrypted on device)

---

## Performance Targets

| Metric | Target |
|---|---|
| API P95 latency (non-search) | < 100ms |
| Search with geo-filter | < 300ms |
| Concurrent booking (0 overbookings) | Proven by k6 load test |
| Web Lighthouse score | > 90 (Performance, Accessibility) |
| Web First Contentful Paint | < 1.2s |
| Web bundle size (gzipped) | < 200KB initial |
| Mobile cold start | < 2s |
| Mobile map (1000 markers) | 60 FPS |
| Mobile bundle (compressed) | < 15MB |

---

## Documentation

| Document | Description |
|---|---|
| [`docs/PROJECT_ROADMAP.md`](docs/PROJECT_ROADMAP.md) | High-level 4-phase architecture roadmap |
| [`docs/PROJECT_RULES.md`](docs/PROJECT_RULES.md) | Development guidelines for all stacks |
| [`docs/MASTER_FLOW.md`](docs/MASTER_FLOW.md) | End-to-end execution flows with diagrams |
| [`docs/tasks/task_plan_concurrency.md`](docs/tasks/task_plan_concurrency.md) | Distributed locking implementation plan |
| [`docs/tasks/task_plan_search.md`](docs/tasks/task_plan_search.md) | Elasticsearch + PostGIS search plan |
| [`docs/tasks/task_plan_saga.md`](docs/tasks/task_plan_saga.md) | Payment saga & event-driven architecture plan |
| [`docs/web/PLAN-web-booking-app.md`](docs/web/PLAN-web-booking-app.md) | Next.js web portal — 6-phase build plan |
| [`docs/mobile/PLAN-mobile-booking-app.md`](docs/mobile/PLAN-mobile-booking-app.md) | Expo mobile app — 7-phase build plan |

---

<div align="center">

**StayEase** — Built to master Golang, distributed systems, and full-stack engineering.

*Scale-Adaptive: Start Simple (Monolith) → Evolve to Resilient (Saga)*

</div>
