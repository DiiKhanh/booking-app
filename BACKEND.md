# BACKEND.md — StayEase Go API

> Cập nhật: 2026-04-16
> Go 1.24 · Gin · PostgreSQL · Redis · Elasticsearch · RabbitMQ · Prometheus · Jaeger

---

## 1. Kiến Trúc Tổng Quan

### 1.1 Layered Architecture

```
HTTP Request
    │
    ▼
┌─────────────────────────────────────────────────┐
│              Middleware Chain                    │
│  Recovery → CorrelationID → MetricsMiddleware   │
│  → RequestLogger → CORS → BodyLimiter(2MB)      │
│  → RateLimiter(IP) → JWTAuth → RequireRole      │
│  → UserRateLimiter                              │
└───────────────────┬─────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────┐
│              Handler Layer                      │
│  Nhận HTTP request, validate DTO,               │
│  trích xuất context (userID, role từ JWT),      │
│  gọi Service, trả về JSON response chuẩn hóa   │
│                                                 │
│  Mỗi handler nhận vào một interface (không      │
│  phụ thuộc struct cụ thể) → dễ mock test       │
└───────────────────┬─────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────┐
│              Service Layer                      │
│  Business logic, orchestration, validation      │
│  Không biết gì về HTTP (không import gin)       │
│  Domain errors → handler map sang HTTP status   │
└───────────────────┬─────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────┐
│           Repository Layer                      │
│  Data access: PostgreSQL (sqlx), Redis,         │
│  Elasticsearch. Mỗi repo implement interface    │
│  định nghĩa trong repository/interfaces.go      │
└───────────────────┬─────────────────────────────┘
                    │
          ┌─────────┼──────────┐
          ▼         ▼          ▼
     PostgreSQL   Redis   Elasticsearch
```

### 1.2 Cấu Trúc Thư Mục

```
backend/
├── cmd/
│   ├── api/            # Entrypoint: khởi tạo DI, chạy HTTP server
│   ├── worker/         # Payment worker: consume RabbitMQ events
│   ├── migration_tool/ # Chạy migration SQL
│   └── seeder/         # Seed dữ liệu mẫu cho development
├── internal/
│   ├── config/         # Load .env, cấu hình toàn hệ thống
│   ├── domain/         # Entities, constants, domain errors
│   ├── dto/            # Request/Response DTO
│   │   ├── request/
│   │   └── response/
│   ├── handler/        # HTTP handlers (1 file per domain)
│   ├── middleware/      # Auth, RBAC, rate limiting, metrics, CORS
│   ├── repository/     # Data access layer + interfaces.go
│   ├── router/         # Route registration (router.go)
│   ├── service/        # Business logic + Saga orchestrator + Outbox worker
│   ├── infrastructure/ # External clients: Redis, ES, RabbitMQ, JWT
│   └── observability/  # Zap logger, Prometheus, Jaeger/OTEL
├── migrations/         # SQL migration files (000001–000007)
├── monitoring/         # Prometheus config + Grafana dashboards
├── docker-compose.yml  # 9 services: postgres, redis, ES, RabbitMQ, prometheus, grafana, jaeger, adminer, redis-commander
├── Makefile
└── go.mod
```

---

## 2. Danh Sách Endpoints

### 2.1 Health & Metrics (No Auth)

| Method | Path | Mô tả |
|--------|------|-------|
| GET | `/health/live` | Liveness probe |
| GET | `/health/ready` | Readiness probe (kiểm tra DB, Redis, ES) |
| GET | `/health/startup` | Startup probe |
| GET | `/metrics` | Prometheus metrics scrape |
| GET | `/ping` | Smoke test |

### 2.2 Auth

| Method | Path | Auth | Mô tả |
|--------|------|------|-------|
| POST | `/api/v1/auth/register` | Public | Đăng ký, trả về JWT + set HttpOnly cookie |
| POST | `/api/v1/auth/login` | Public | Đăng nhập |
| POST | `/api/v1/auth/refresh` | Cookie | Làm mới access token |
| POST | `/api/v1/auth/logout` | JWT | Đăng xuất, revoke refresh token |
| GET | `/api/v1/auth/me` | JWT | Lấy thông tin user hiện tại |

### 2.3 Hotels & Rooms (Public)

| Method | Path | Auth | Mô tả |
|--------|------|------|-------|
| GET | `/api/v1/hotels` | Public | Danh sách khách sạn đã approve (phân trang) |
| GET | `/api/v1/hotels/:id` | Public | Chi tiết khách sạn |
| GET | `/api/v1/hotels/:id/rooms` | Public | Danh sách phòng |
| GET | `/api/v1/hotels/search` | Public | ES geo-distance, price, amenities, availability |
| GET | `/api/v1/hotels/:id/reviews` | Public | Danh sách đánh giá |

### 2.4 Bookings (JWT Required)

| Method | Path | Auth | Mô tả |
|--------|------|------|-------|
| POST | `/api/v1/bookings` | JWT | Tạo booking (distributed lock Redis SETNX + Lua) |
| GET | `/api/v1/bookings` | JWT | Lịch sử booking của user |
| GET | `/api/v1/bookings/:id` | JWT | Chi tiết booking |
| GET | `/api/v1/bookings/:id/status` | JWT | Trạng thái booking (dùng để poll Saga) |
| DELETE | `/api/v1/bookings/:id` | JWT | Hủy booking |

### 2.5 Payments & Checkout (JWT Required)

| Method | Path | Auth | Mô tả |
|--------|------|------|-------|
| POST | `/api/v1/checkout` | JWT | Khởi động Payment Saga |
| GET | `/api/v1/payments/:id` | JWT | Trạng thái payment |

### 2.6 Reviews (JWT Required để write)

| Method | Path | Auth | Mô tả |
|--------|------|------|-------|
| POST | `/api/v1/hotels/:id/reviews` | JWT | Viết đánh giá (cần booking confirmed) |
| PUT | `/api/v1/reviews/:id` | JWT | Sửa đánh giá |
| DELETE | `/api/v1/reviews/:id` | JWT | Xóa đánh giá |

### 2.7 Notifications (JWT Required)

| Method | Path | Auth | Mô tả |
|--------|------|------|-------|
| GET | `/api/v1/notifications` | JWT | Danh sách thông báo (phân trang) |
| GET | `/api/v1/notifications/unread-count` | JWT | Số thông báo chưa đọc |
| PUT | `/api/v1/notifications/:id/read` | JWT | Đánh dấu đã đọc |
| PUT | `/api/v1/notifications/read-all` | JWT | Đánh dấu tất cả đã đọc |

### 2.8 Chat / Conversations (JWT Required)

| Method | Path | Auth | Mô tả |
|--------|------|------|-------|
| POST | `/api/v1/conversations` | JWT | Tạo hoặc tìm existing conversation |
| GET | `/api/v1/conversations` | JWT | Danh sách conversations của user |
| GET | `/api/v1/conversations/:id/messages` | JWT | Lịch sử tin nhắn (cursor-based) |
| POST | `/api/v1/conversations/:id/messages` | JWT | Gửi tin nhắn |
| PUT | `/api/v1/conversations/:id/read` | JWT | Đánh dấu đã đọc |
| GET | `/api/v1/chat/unread-count` | JWT | Tổng tin nhắn chưa đọc |

### 2.9 WebSocket (JWT / One-Time Ticket)

| Method | Path | Auth | Mô tả |
|--------|------|------|-------|
| POST | `/api/v1/ws/ticket` | JWT | Lấy one-time WS ticket |
| GET | `/api/v1/ws/bookings?ticket=xxx` | Ticket | Kết nối WebSocket real-time |

**WS Message Types nhận từ server:**
- `booking_status_updated` — Saga chuyển trạng thái
- `notification.new` — Thông báo mới
- `chat.message` — Tin nhắn mới
- `chat.typing` — Đối phương đang gõ

### 2.10 Owner Routes (JWT + role=owner)

| Method | Path | Mô tả |
|--------|------|-------|
| GET | `/api/v1/owner/hotels` | Danh sách khách sạn của owner |
| POST | `/api/v1/owner/hotels` | Tạo khách sạn mới |
| PUT | `/api/v1/owner/hotels/:id` | Cập nhật thông tin khách sạn |
| DELETE | `/api/v1/owner/hotels/:id` | Xóa khách sạn |
| POST | `/api/v1/owner/hotels/:id/rooms` | Tạo phòng |
| PUT | `/api/v1/owner/rooms/:id` | Cập nhật phòng |
| DELETE | `/api/v1/owner/rooms/:id` | Xóa phòng |
| PUT | `/api/v1/owner/rooms/:id/inventory` | Cập nhật tồn kho phòng |
| GET | `/api/v1/owner/rooms/:id/inventory` | Xem tồn kho phòng |
| GET | `/api/v1/owner/dashboard` | Dashboard KPI (rooms, occupancy, revenue) |

### 2.11 Admin Routes (JWT + role=admin)

| Method | Path | Mô tả |
|--------|------|-------|
| GET | `/api/v1/admin/hotels/pending` | Danh sách khách sạn chờ duyệt |
| PUT | `/api/v1/admin/hotels/:id/approve` | Duyệt khách sạn |
| PUT | `/api/v1/admin/hotels/:id/reject` | Từ chối khách sạn |
| GET | `/api/v1/admin/users` | Danh sách users (phân trang) |
| GET | `/api/v1/admin/users/:id` | Chi tiết user |
| PUT | `/api/v1/admin/users/:id/role` | Thay đổi role user |
| PUT | `/api/v1/admin/users/:id/deactivate` | Vô hiệu hóa account |
| GET | `/api/v1/admin/bookings` | Tất cả bookings (phân trang) |
| GET | `/api/v1/admin/system/health` | Kiểm tra sức khỏe toàn hệ thống |
| GET | `/api/v1/admin/events/dlq` | Danh sách Dead Letter Queue events |
| POST | `/api/v1/admin/events/dlq/:id/retry` | Retry một DLQ event |
| POST | `/api/v1/admin/broadcast` | Broadcast announcement tới tất cả users |

---

## 3. Các Patterns Quan Trọng

### 3.1 Distributed Lock (Chống Double-Booking)

**File:** `internal/repository/booking_repo.go`

**Cơ chế:** Redis SETNX + Lua script — atomic check-and-set.

**Luồng:**
```
POST /bookings → BookingHandler.CreateBooking
  → BookingService.CreateBooking
    → Redis SETNX key: "lock:room:{roomID}:{date}"
    → TTL: 5 giây, retry 10 lần với 50ms interval
    → Nếu lock fail: trả về 409 Conflict (domain.ErrConflict)
    → Nếu lấy được lock: kiểm tra availability trong DB
    → Tạo booking record
    → Release lock (Lua atomic check-and-delete)
```

**Behavior khi conflict:** HTTP 409 → Mobile hiển thị `ConflictRetryModal`.

### 3.2 Payment Saga (FSM + Outbox Pattern)

**Files:** `internal/service/saga_orchestrator.go`, `internal/service/outbox_worker.go`

**Trạng thái FSM:**
```
pending → awaiting_payment → processing → confirmed
                                       ↘ failed
                                       ↘ cancelled (timeout)
```

**Luồng đầy đủ:**
```
Client → POST /checkout
  → SagaOrchestrator.StartCheckout()
    → Tạo Payment record (status: pending)
    → Tạo OutboxEvent: BookingPaymentInitiated
    → Cập nhật Booking: awaiting_payment
    → Tất cả trong 1 DB transaction

OutboxWorker (polling mỗi 2s, batch 50)
  → ListUnpublishedEvents() → filter retry < 5
  → Publish lên RabbitMQ exchange: payment.events
  → MarkPublished()

PaymentWorker (cmd/worker)
  → Consume từ queue: payment.processing
  → Xử lý thanh toán (80% success / 15% fail / 5% timeout)
  → Publish kết quả: PaymentSucceeded / PaymentFailed / PaymentTimedOut

API Consumer (trong cmd/api)
  → SagaOrchestrator.HandlePaymentSuccess/Failure/Timeout()
    → Cập nhật Payment + Booking status
    → Nếu failed/timeout: RestoreInventory (hoàn lại tồn kho)
    → Gửi Notification tới user
    → Broadcast qua WebSocket Hub
```

**DLQ:** Event có retry_count >= 5 bị đánh dấu DLQ, admin có thể reset và retry.

### 3.3 WebSocket Hub

**File:** `internal/handler/ws_handler.go`

**Cơ chế One-Time Ticket:**
1. Client gọi `POST /ws/ticket` với JWT → nhận `ticket` (UUID, Redis TTL 30s)
2. Client kết nối `GET /ws/bookings?ticket=<ticket>` — ticket consumed ngay (GetDel atomic)
3. Hub map `userID → []WebSocket connections`
4. Khi Saga hoàn thành: `Hub.Broadcast(userID, message)` gửi tới tất cả kết nối của user
5. `connEntry` per-connection write mutex tránh concurrent writes

### 3.4 RBAC (Role-Based Access Control)

**File:** `internal/middleware/rbac.go`

**3 Roles:** `guest`, `owner`, `admin`

```go
// Owner routes:
ownerGroup.Use(middleware.JWTAuth(tokenMgr))
ownerGroup.Use(middleware.RequireRole(domain.RoleOwner))

// Admin routes:
adminGroup.Use(middleware.JWTAuth(tokenMgr))
adminGroup.Use(middleware.RequireRole(domain.RoleAdmin))
```

`JWTAuth` reads Bearer header OR HttpOnly cookie fallback.

### 3.5 Rate Limiting (3 lớp)

**File:** `internal/middleware/rate_limiter.go`

- **Lớp 1 — IP public routes:** `rl:public:<clientIP>`
- **Lớp 2 — IP auth routes:** `rl:auth:<clientIP>`
- **Lớp 3 — Per-user booking:** `rl:user:<userID>`

Lua script atomic (INCR + EXPIRE). Fail-open nếu Redis unavailable.

### 3.6 Observability

- **Prometheus:** `http_requests_total`, `http_request_duration_seconds` tại `/metrics`
- **Jaeger/OTEL:** OTLP HTTP exporter gửi traces tới Jaeger container
- **Zap logger:** `observability.Global()` singleton, structured JSON
- **Correlation ID:** UUID per request, gắn vào `X-Correlation-ID` header
- **Grafana:** Dashboards trong `monitoring/grafana/provisioning/`

---

## 4. Setup Local Development

### 4.1 Prerequisites

- Go 1.21+
- Docker Desktop
- Make

### 4.2 Khởi Động Infrastructure

```bash
cd backend

# Khởi động 9 services
make infra-up

# Chờ elasticsearch healthy (~30s), sau đó migrate
make migrate

# Tùy chọn: seed dữ liệu mẫu
go run cmd/seeder/main.go
```

### 4.3 Cấu Hình Environment

Copy `.env.example` → `.env`:

```env
DB_DSN=postgres://user:password@localhost:5432/booking_db?sslmode=disable
JWT_SECRET=your-secret-key-here
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL=7d
REDIS_URL=redis://localhost:6379
ES_URL=http://localhost:9200
ES_INDEX=hotels
RABBITMQ_URL=amqp://guest:guest@localhost:5672/
JAEGER_ENDPOINT=http://localhost:4318/v1/traces
CORS_ALLOWED_ORIGINS=http://localhost:3001,http://localhost:8081
```

### 4.4 Chạy Server

```bash
# Terminal 1: API server (port 8080)
make server

# Terminal 2: Payment worker
go run cmd/worker/main.go
```

### 4.5 Chạy Tests

```bash
# Toàn bộ tests
make test

# Với race detector (khuyến nghị)
go test -race ./...

# Chỉ một package
go test -v ./internal/service/...

# Load test k6
make load-test
```

### 4.6 UI Monitoring

| Service | URL | Credentials |
|---------|-----|-------------|
| Grafana | http://localhost:3000 | admin/admin |
| Prometheus | http://localhost:9090 | — |
| Jaeger UI | http://localhost:16686 | — |
| RabbitMQ | http://localhost:15672 | guest/guest |
| Adminer | http://localhost:8081 | user/password |
| Redis Commander | http://localhost:8082 | — |

---

## 5. Testing Strategy

### 5.1 Handler Tests — Mock Service Pattern

```go
type mockBookingSvc struct {
    createBookingFn func(ctx context.Context, input domain.CreateBookingInput) (*domain.Booking, error)
    // ... function fields khác
}

// Mỗi test case customize riêng từng method
svc := &mockBookingSvc{
    createBookingFn: func(_ context.Context, _ domain.CreateBookingInput) (*domain.Booking, error) {
        return &domain.Booking{ID: 1, Status: "pending"}, nil
    },
}
```

### 5.2 Table-Driven Tests (Go convention)

```go
tests := []struct {
    name       string
    input      domain.CreateBookingInput
    wantStatus int
}{
    { name: "success", wantStatus: 201 },
    { name: "conflict returns 409", wantStatus: 409 },
}
for _, tt := range tests {
    t.Run(tt.name, func(t *testing.T) { ... })
}
```

### 5.3 Repository Tests

- Dùng `miniredis` (in-memory Redis) cho Lua script tests
- Dùng `go-sqlmock` cho PostgreSQL-dependent tests

---

## 6. Tasks Còn Thiếu

| Task | Endpoint | Priority | Ghi chú |
|------|----------|----------|---------|
| Profile update | `PUT /api/v1/auth/me` | **Medium** | Cần trước khi làm Mobile profile update |
| Owner bookings | `GET /api/v1/owner/bookings` | **Medium** | Web owner/reservations đang dùng endpoint sai |
| Forgot password | `POST /api/v1/auth/forgot-password` | Low | Cần email service (SendGrid/SES) |
| Reset password | `POST /api/v1/auth/reset-password` | Low | Đi kèm forgot password |
| Owner analytics | `GET /api/v1/owner/analytics?period=7d\|30d\|90d` | Low | Revenue + occupancy theo period |
| CDC sync worker | WAL → Elasticsearch | Low | Hiện chỉ index khi hotel tạo/update thủ công |

---

## 7. API Response Format

Mọi response đều dùng envelope chuẩn:

```json
{
  "success": true,
  "data": { ... },
  "error": null,
  "meta": { "total": 100, "page": 1, "limit": 20 }
}
```

Error response:
```json
{
  "success": false,
  "data": null,
  "error": "room is not available for the selected dates"
}
```

Domain errors map tới HTTP status:
- `ErrNotFound` → 404
- `ErrConflict` → 409
- `ErrLockFailed` → 409
- `ErrUnauthorized` → 401
- `ErrForbidden` → 403
