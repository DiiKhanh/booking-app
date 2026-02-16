# Plan: Complete Backend APIs for Booking App + Monitoring & Logging

## Context

The booking app has a Go + Gin backend with Phase 1 (concurrency/distributed locking) completed. The backend currently has only 3 routes (`GET /ping`, `POST /api/bookings`, `POST /api/admin/init`) with no service layer, no auth, no middleware, no tests, and no structured logging. This plan builds out **all 51 API endpoints** across 12 domains to support the mobile app (guest, owner, admin roles), plus a full monitoring/observability stack.

**Current state**: `backend/internal/service/` is empty. Handler calls repository directly. No interfaces defined.

---

## Phase 1: Foundational Refactoring & Observability

**Goal**: Restructure to layered architecture (handler -> service -> repository), add structured logging, standard response envelope. Zero behavior change.

### Files to Create/Modify
| Action | File | Purpose |
|---|---|---|
| Create | `internal/dto/response/envelope.go` | Standard `APIResponse{Success, Data, Error, Meta}` envelope |
| Create | `internal/domain/errors.go` | Domain error types: `ErrNotFound`, `ErrConflict`, `ErrUnauthorized`, etc. |
| Create | `internal/domain/hotel.go`, `room.go`, `inventory.go`, `booking.go` | Move models from `internal/models/models.go` into separate domain files |
| Create | `internal/repository/interfaces.go` | All repository interfaces (`BookingRepository`, `HotelRepository`, etc.) |
| Create | `internal/infrastructure/redis/distributed_lock.go` | Extract `AcquireLock`/`ReleaseLock` from `booking_repo.go` into `Locker` interface |
| Create | `internal/service/booking_service.go` | Business logic extracted from handler. Remove `time.Sleep(200ms)` demo code |
| Create | `internal/observability/logger.go` | Zap structured logger (JSON output, context-aware) |
| Create | `internal/middleware/correlation_id.go` | `X-Correlation-ID` header injection/propagation |
| Create | `internal/middleware/request_logger.go` | Structured request logging (replaces Gin default) |
| Create | `internal/middleware/recovery.go` | Panic recovery returning standard error envelope |
| Create | `internal/router/router.go` | Extract route registration from `main.go` |
| Modify | `internal/config/config.go` | Add JWT, ES, RabbitMQ, OTEL, rate limiter config fields |
| Modify | `cmd/api/main.go` | Slim down: config -> infra -> repos -> services -> handlers -> router -> graceful shutdown |

**New deps**: `go.uber.org/zap`, `github.com/google/uuid`

### Tests
- Unit test envelope helpers, domain errors, distributed lock, booking service, all middleware
- Integration test: existing `POST /api/v1/bookings` still returns 201/409

---

## Phase 2: Authentication & Authorization (JWT + RBAC)

**Goal**: Users can register, login, get JWT tokens. Routes protected by role (guest, owner, admin).

### Migration: `000002_users_and_auth.up.sql`
```sql
CREATE TYPE user_role AS ENUM ('guest', 'owner', 'admin');
CREATE TABLE users (id UUID PK, email UNIQUE, password_hash, full_name, phone, avatar_url, role user_role, is_active, created_at, updated_at);
CREATE TABLE refresh_tokens (id UUID PK, user_id FK, token_hash UNIQUE, expires_at, revoked_at);
```

### Files to Create
| File | Purpose |
|---|---|
| `internal/domain/user.go` | User, Role, RefreshToken domain types |
| `internal/infrastructure/jwt/token.go` | `TokenManager`: generate/validate access+refresh tokens (HMAC-SHA256) |
| `internal/repository/user_repo.go` | User CRUD + RefreshToken storage |
| `internal/service/auth_service.go` | Register (bcrypt), Login, Refresh (rotate), Logout (revoke), Profile |
| `internal/handler/auth_handler.go` | HTTP handlers for auth endpoints |
| `internal/dto/request/auth.go` | `RegisterRequest`, `LoginRequest`, `RefreshRequest` |
| `internal/dto/response/auth.go` | `AuthTokensResponse`, `UserProfileResponse` |
| `internal/middleware/auth.go` | JWT validation middleware (Bearer token -> context) |
| `internal/middleware/rbac.go` | `RequireRole(roles...)` middleware |
| `internal/middleware/cors.go` | CORS configuration |

**New deps**: `github.com/golang-jwt/jwt/v5`, `golang.org/x/crypto/bcrypt`, `github.com/gin-contrib/cors`

### API Endpoints (5)
| Method | Path | Auth |
|---|---|---|
| `POST` | `/api/v1/auth/register` | No |
| `POST` | `/api/v1/auth/login` | No |
| `POST` | `/api/v1/auth/refresh` | No |
| `POST` | `/api/v1/auth/logout` | Yes |
| `GET` | `/api/v1/auth/me` | Yes |

### Tests: 90% coverage (auth is security-critical)

---

## Phase 3: Hotel & Room CRUD + Owner Management

**Goal**: Owners create/manage hotels+rooms. Admin approves hotels. Public views approved hotels.

### Migration: `000003_hotels_extend.up.sql`
- ALTER hotels: add `owner_id`, `address`, `city`, `country`, `latitude`, `longitude`, `amenities[]`, `images[]`, `star_rating`, `status` (pending/approved/rejected), timestamps
- ALTER rooms: add `description`, `amenities[]`, `images[]`, `is_active`, timestamps
- Indexes on owner_id, status, city, lat/lng, hotel_id

### Files to Create
| File | Purpose |
|---|---|
| `internal/repository/hotel_repo.go` | Hotel CRUD + ListByOwner, ListApproved, ListPending, UpdateStatus |
| `internal/repository/room_repo.go` | Room CRUD + ListByHotel, ListAvailableByHotel |
| `internal/service/hotel_service.go` | Ownership verification, approval workflow |
| `internal/service/room_service.go` | Room CRUD with hotel ownership check |
| `internal/service/inventory_service.go` | Bulk set/get inventory calendar |
| `internal/handler/hotel_handler.go` | Public hotel endpoints |
| `internal/handler/room_handler.go` | Room endpoints |
| `internal/handler/inventory_handler.go` | Inventory endpoints |
| `internal/handler/owner_handler.go` | Owner dashboard, reservations |

### API Endpoints (17)
| Method | Path | Auth | Roles |
|---|---|---|---|
| `GET` | `/api/v1/hotels` | No | - |
| `GET` | `/api/v1/hotels/:id` | No | - |
| `GET` | `/api/v1/hotels/:id/rooms` | No | - |
| `POST` | `/api/v1/owner/hotels` | Yes | owner |
| `PUT` | `/api/v1/owner/hotels/:id` | Yes | owner |
| `DELETE` | `/api/v1/owner/hotels/:id` | Yes | owner |
| `GET` | `/api/v1/owner/hotels` | Yes | owner |
| `POST` | `/api/v1/owner/hotels/:id/rooms` | Yes | owner |
| `PUT` | `/api/v1/owner/rooms/:id` | Yes | owner |
| `DELETE` | `/api/v1/owner/rooms/:id` | Yes | owner |
| `PUT` | `/api/v1/owner/rooms/:id/inventory` | Yes | owner |
| `GET` | `/api/v1/owner/rooms/:id/inventory` | Yes | owner |
| `GET` | `/api/v1/owner/dashboard` | Yes | owner |
| `GET` | `/api/v1/owner/reservations` | Yes | owner |
| `GET` | `/api/v1/admin/hotels/pending` | Yes | admin |
| `PUT` | `/api/v1/admin/hotels/:id/approve` | Yes | admin |
| `PUT` | `/api/v1/admin/hotels/:id/reject` | Yes | admin |

---

## Phase 4: Enhanced Booking Flow

**Goal**: Authenticated bookings with dynamic pricing, list/detail/cancel, inventory restoration on cancel.

### Files to Modify/Create
- Refactor `internal/repository/booking_repo.go` -- implement interface, add `FindByID`, `ListByUser`, `UpdateStatus`, `Cancel`
- Extend `internal/service/booking_service.go` -- `GetBooking`, `ListMyBookings`, `CancelBooking`, `GetBookingStatus`; compute price from room data (replace hardcoded `100.0`)
- Refactor `internal/handler/booking_handler.go` -- read `user_id` from JWT claims, add new endpoints

### API Endpoints (5)
| Method | Path | Auth |
|---|---|---|
| `POST` | `/api/v1/bookings` | Yes |
| `GET` | `/api/v1/bookings` | Yes |
| `GET` | `/api/v1/bookings/:id` | Yes |
| `GET` | `/api/v1/bookings/:id/status` | Yes |
| `DELETE` | `/api/v1/bookings/:id` | Yes |

### Tests: Re-run k6 load tests to verify no regression

---

## Phase 5: Metrics, Health Checks & Rate Limiting

**Goal**: Prometheus metrics, Grafana dashboards, health endpoints, Redis-backed rate limiting.

### Files to Create
| File | Purpose |
|---|---|
| `internal/observability/metrics.go` | Prometheus metrics: `http_requests_total`, `http_request_duration_seconds`, `bookings_created_total`, `cache_hit_ratio` |
| `internal/middleware/metrics.go` | Auto-collect HTTP metrics per request |
| `internal/handler/health_handler.go` | `/health/live`, `/health/ready`, `/health/startup` |
| `internal/middleware/rate_limiter.go` | Redis sliding window: 100 req/min public, 30 req/min auth |
| `monitoring/prometheus/prometheus.yml` | Scrape config |
| `monitoring/grafana/provisioning/datasources/datasource.yml` | Prometheus datasource |
| `monitoring/grafana/dashboards/system-health.json` | Request rate, error rate, latency p50/p95/p99 |
| `monitoring/grafana/dashboards/booking-flow.json` | Bookings created, conflict rate, avg duration |

### docker-compose additions
- **prometheus** (prom/prometheus:v2.50.0) -- port 9090
- **grafana** (grafana/grafana:10.3.0) -- port 3000

**New dep**: `github.com/prometheus/client_golang`

### API Endpoints (4)
| Method | Path |
|---|---|
| `GET` | `/health/live` |
| `GET` | `/health/ready` |
| `GET` | `/health/startup` |
| `GET` | `/metrics` |

---

## Phase 6: Reviews System

### Migration: `000004_reviews.up.sql`
```sql
CREATE TABLE reviews (id SERIAL PK, user_id FK, hotel_id FK, booking_id FK UNIQUE, rating 1-5, title, comment, timestamps);
ALTER TABLE hotels ADD COLUMN avg_rating, review_count;
```

### API Endpoints (4)
| Method | Path | Auth |
|---|---|---|
| `POST` | `/api/v1/hotels/:id/reviews` | Yes (guest) |
| `GET` | `/api/v1/hotels/:id/reviews` | No |
| `PUT` | `/api/v1/reviews/:id` | Yes (guest) |
| `DELETE` | `/api/v1/reviews/:id` | Yes (guest/admin) |

**Validation**: User must have completed booking at hotel. One review per booking.

---

## Phase 7: Search Engine (Elasticsearch + PostGIS)

**Goal**: Geo-spatial search < 200ms for 10K hotels.

### docker-compose addition
- **elasticsearch** (elasticsearch:8.12.0) -- port 9200

### Files to Create
| File | Purpose |
|---|---|
| `internal/infrastructure/elasticsearch/client.go` | ES client + hotel index mapping (geo_point) |
| `internal/infrastructure/elasticsearch/indexer.go` | `IndexHotel`, `BulkIndex`, `FullReindex` (sync Postgres -> ES) |
| `internal/repository/search_repo.go` | ES query builder: geo_distance, range, terms filters |
| `internal/service/search_service.go` | Search with Redis caching (5 min TTL by query hash) |
| `internal/handler/search_handler.go` | Search handler |
| `cmd/seeder/main.go` | Generate 10K dummy hotels |

**New dep**: `github.com/elastic/go-elasticsearch/v8`

### API Endpoint (1)
| Method | Path | Params |
|---|---|---|
| `GET` | `/api/v1/hotels/search` | `lat`, `lng`, `radius`, `price_min`, `price_max`, `amenities`, `check_in`, `check_out`, `guests`, `page`, `limit`, `sort` |

---

## Phase 8: Payment Saga & Event-Driven Architecture

**Goal**: Async payment with RabbitMQ, saga orchestration, FSM, outbox pattern, mock payment gateway.

### docker-compose addition
- **rabbitmq** (rabbitmq:3.13-management) -- ports 5672, 15672

### Migration: `000005_payments_saga.up.sql`
```sql
CREATE TABLE payments (id UUID PK, booking_id FK, amount, currency, status, idempotency_key UNIQUE, gateway_ref, failed_reason, timestamps);
CREATE TABLE outbox_events (id UUID PK, aggregate_type, aggregate_id, event_type, payload JSONB, published_at, retry_count);
CREATE TABLE processed_events (event_id UUID PK, processed_at);
-- ALTER bookings status to support: pending, awaiting_payment, processing, confirmed, failed, cancelled, refunded
```

### Files to Create
| File | Purpose |
|---|---|
| `internal/infrastructure/rabbitmq/connection.go` | Connection with reconnection logic |
| `internal/infrastructure/rabbitmq/publisher.go` | Publish with confirm mode |
| `internal/infrastructure/rabbitmq/consumer.go` | Consume with manual ack |
| `internal/domain/payment.go` | Payment, OutboxEvent domain types |
| `internal/repository/payment_repo.go` | Payment CRUD + outbox operations |
| `internal/service/saga_orchestrator.go` | FSM: `StartCheckout` -> `HandlePaymentSuccess/Failure/Timeout` with compensation |
| `internal/service/payment_service.go` | Mock gateway (80% success, 15% fail, 5% timeout), idempotency keys |
| `internal/service/outbox_worker.go` | Poll outbox -> publish to RabbitMQ -> mark published -> DLQ after 5 retries |
| `cmd/worker/main.go` | Standalone consumer: processes saga events |
| `internal/handler/payment_handler.go` | Checkout + payment status handlers |

**New dep**: `github.com/rabbitmq/amqp091-go`

### Saga Flow
```
BookingCreated -> PaymentProcessing -> PaymentSuccess -> BookingConfirmed
                                   -> PaymentFailed  -> BookingFailed + Inventory Restored
                                   -> Timeout (10min) -> BookingCancelled + Inventory Restored
```

### API Endpoints (2)
| Method | Path | Auth |
|---|---|---|
| `POST` | `/api/v1/checkout` | Yes |
| `GET` | `/api/v1/payments/:id` | Yes |

---

## Phase 9: Notifications & WebSocket

### Migration: `000006_notifications.up.sql`
```sql
CREATE TABLE notifications (id UUID PK, user_id FK, type, title, message, data JSONB, is_read, created_at);
```

### Files to Create
| File | Purpose |
|---|---|
| `internal/domain/notification.go` | Notification domain type |
| `internal/repository/notification_repo.go` | CRUD + unread count |
| `internal/service/notification_service.go` | Consume saga events -> create notifications |
| `internal/handler/notification_handler.go` | Notification list, mark read |
| `internal/handler/ws_handler.go` | WebSocket `/ws/bookings` -- auth via `?token=`, connection registry, real-time saga status |

**New dep**: `github.com/gorilla/websocket`

### API Endpoints (5)
| Method | Path | Auth |
|---|---|---|
| `GET` | `/api/v1/notifications` | Yes |
| `GET` | `/api/v1/notifications/unread-count` | Yes |
| `PUT` | `/api/v1/notifications/:id/read` | Yes |
| `PUT` | `/api/v1/notifications/read-all` | Yes |
| `GET` | `/api/v1/ws/bookings` | Yes (query param) |

---

## Phase 10: Admin APIs, Distributed Tracing & Final Polish

### docker-compose addition
- **jaeger** (jaegertracing/all-in-one:1.54) -- ports 16686, 4318

### Files to Create
| File | Purpose |
|---|---|
| `internal/handler/admin_handler.go` | User mgmt, booking oversight, system health, DLQ monitoring |
| `internal/service/admin_service.go` | Admin business logic |
| `internal/observability/tracer.go` | OpenTelemetry SDK + Jaeger exporter |
| `monitoring/grafana/dashboards/db-performance.json` | Query latency, connection pool |
| `monitoring/grafana/dashboards/cache-metrics.json` | Redis hit/miss ratio |

**New deps**: `go.opentelemetry.io/otel`, `go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracehttp`

### API Endpoints (8)
| Method | Path | Auth |
|---|---|---|
| `GET` | `/api/v1/admin/users` | Yes (admin) |
| `GET` | `/api/v1/admin/users/:id` | Yes (admin) |
| `PUT` | `/api/v1/admin/users/:id/role` | Yes (admin) |
| `PUT` | `/api/v1/admin/users/:id/deactivate` | Yes (admin) |
| `GET` | `/api/v1/admin/bookings` | Yes (admin) |
| `GET` | `/api/v1/admin/system/health` | Yes (admin) |
| `GET` | `/api/v1/admin/events/dlq` | Yes (admin) |
| `POST` | `/api/v1/admin/events/dlq/:id/retry` | Yes (admin) |

---

## Phase Dependency Graph

```
Phase 1 (Foundation) --> Phase 2 (Auth) --> Phase 3 (Hotels/Rooms) --> Phase 4 (Bookings)
                                       |                           |         |
                                       +-> Phase 5 (Metrics) <----+         |
                                                                            |
Phase 6 (Reviews) <-- Phase 3 + Phase 4                                    |
Phase 7 (Search) <-- Phase 3                                               |
Phase 8 (Saga) <-- Phase 4                                                 |
Phase 9 (Notifications) <-- Phase 8
Phase 10 (Admin/Tracing) <-- All Phases
```

**Parallelizable**: Phase 5 + Phase 3 can overlap. Phase 6 + Phase 7 can overlap.

---

## Middleware Stack Order (all `/api/v1/` routes)

1. Recovery (Phase 1)
2. Correlation ID (Phase 1)
3. Request Logger (Phase 1)
4. Metrics (Phase 5)
5. Rate Limiter (Phase 5)
6. CORS (Phase 2)
7. Auth (Phase 2, protected routes)
8. RBAC (Phase 2, role-specific routes)

---

## Infrastructure Summary (docker-compose)

| Service | Ports | Phase |
|---|---|---|
| postgres | 5432 | Existing |
| redis | 6379 | Existing |
| adminer | 8081 | Existing |
| redis-commander | 8082 | Existing |
| prometheus | 9090 | Phase 5 |
| grafana | 3000 | Phase 5 |
| elasticsearch | 9200 | Phase 7 |
| rabbitmq | 5672, 15672 | Phase 8 |
| jaeger | 16686, 4318 | Phase 10 |

---

## Verification

1. **Per phase**: Run `make test` after each phase, verify 80%+ coverage
2. **Phase 1**: Existing k6 load test passes (zero overbookings)
3. **Phase 2**: Register -> Login -> access protected route -> refresh -> logout
4. **Phase 3**: Owner creates hotel -> admin approves -> public views
5. **Phase 4**: Book -> list -> detail -> cancel -> inventory restored
6. **Phase 5**: `/metrics` returns Prometheus format; Grafana dashboards at localhost:3000
7. **Phase 7**: Search 10K hotels < 200ms
8. **Phase 8**: Checkout -> payment -> confirmed/failed; compensation on failure
9. **Phase 9**: WebSocket delivers real-time saga status
10. **Phase 10**: Traces visible in Jaeger UI at localhost:16686
11. **Final**: All 51 endpoints respond correctly; `make docker-up` starts everything

---

## Risks

| Risk | Severity | Mitigation |
|---|---|---|
| Refactoring breaks booking flow | High | Write integration test BEFORE refactoring |
| Double payment | Critical | Idempotency keys with UNIQUE constraint |
| Saga event loss | High | Outbox pattern guarantees at-least-once delivery |
| ES sync lag | Medium | Accept eventual consistency; Postgres fallback |
| WebSocket memory leak | Medium | Heartbeat + idle timeout + pool limits |
| JWT secret leak | High | Never log tokens; env-only secrets |
