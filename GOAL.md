# GOAL.md — StayEase Dev Journal

> Ghi chú quá trình phát triển: tính năng đã làm, bài học, quyết định kỹ thuật.

---

## Tổng Quan Dự Án

**StayEase** — Hotel Booking Platform (monorepo)

| Layer | Stack | Port |
|-------|-------|------|
| Backend | Go 1.24 · Gin · PostgreSQL · Redis · Elasticsearch · RabbitMQ | `:8080` |
| Web | Next.js 15 · App Router · Zustand v5 · React Query v5 · Shadcn/UI · TailwindCSS v4 | `:3001` |
| Mobile | Expo SDK 54 · React Native · Expo Router v4 · NativeWind v4 | Expo Go |
| DevOps | Prometheus · Grafana · Loki · Jaeger · Alertmanager | `:9090` `:3000` |

---

## Session Log

### 2026-05-19 — Owner Bookings (Full-stack)

**Vấn đề:** Web `/owner/reservations` và Mobile owner reservations screen đều gọi endpoint không tồn tại (`/owner/reservations`). Backend chưa có route nào cho owner xem bookings của khách sạn mình.

**Giải pháp:** Implement từ dưới lên (repo → service → handler → router → client).

#### Backend

| File | Thay đổi |
|------|---------|
| `internal/repository/interfaces.go` | Thêm `ListBookingsByOwner(ownerID, status, page, limit)` vào `BookingRepository` |
| `internal/repository/booking_repo.go` | Implement với JOIN query: `bookings → rooms → hotels WHERE owner_id` |
| `internal/service/booking_service.go` | Thêm `ListOwnerBookings` method |
| `internal/handler/booking_handler.go` | Thêm vào interface + `ListOwnerBookings` handler |
| `internal/router/router.go` | Đăng ký `GET /owner/bookings` trong owner group |
| `internal/service/booking_service_test.go` | 4 tests: no filter, status filter, empty, repo error |
| `internal/handler/booking_handler_test.go` | 4 tests: 200, status filter, 401 no auth, 500 service error |

**Query SQL core:**
```sql
SELECT b.*
FROM bookings b
JOIN rooms rm ON rm.id = b.room_id
JOIN hotels h  ON h.id  = rm.hotel_id
WHERE h.owner_id = $1 [AND b.status = $2]
ORDER BY b.created_at DESC
LIMIT $n OFFSET $m
```

#### Web

| File | Thay đổi |
|------|---------|
| `services/booking.service.ts` | Fix endpoint: `/owner/reservations` → `/owner/bookings` |
| | Fix `getReservation`: `/owner/reservations/:id` → `/bookings/:id` |

#### Mobile

| File | Thay đổi |
|------|---------|
| `constants/api.ts` | Fix `OWNER.RESERVATIONS`: `/owner/reservations` → `/owner/bookings` |
| `services/owner.service.ts` | Thêm `listReservations(status?, page, limit)` method |
| `hooks/useBookings.ts` | Thêm `useOwnerReservations(status?)` hook |
| `app/(owner)/(reservations)/index.tsx` | Switch từ `useBookingsList` (guest) → `useOwnerReservations` |

**Kết quả:** `go test ./...` — tất cả pass. TypeScript — không có lỗi mới.

---

## Tính Năng Đã Implement (Toàn Dự Án)

### Backend (10 Phases — COMPLETE)

| Phase | Tính năng |
|-------|-----------|
| 1 | Distributed Lock (Redis SETNX + Lua), layered architecture, Zap logging |
| 2 | JWT auth, RBAC (guest/owner/admin), refresh tokens, HttpOnly cookie |
| 3 | Hotels/Rooms CRUD, owner management, admin approval workflow |
| 4 | Booking flow (create/list/detail/cancel), pricing, inventory |
| 5 | Prometheus metrics, health checks (live/ready/startup), Redis rate limiting |
| 6 | Reviews system (create/update/delete, yêu cầu booking confirmed) |
| 7 | Elasticsearch geo-search + Redis cache |
| 8 | Payment Saga + RabbitMQ + Outbox pattern |
| 9 | Notifications CRUD + WebSocket Hub (gorilla/websocket) |
| 10 | Admin APIs + OpenTelemetry/Jaeger + Grafana dashboards |
| +  | Production: WS ticket, per-user rate limit, body limiter, CORS, Dockerfiles, CI/CD |

**Endpoints còn thiếu:**
- `PUT /api/v1/auth/me` — profile update (Medium)
- `GET /api/v1/owner/analytics` — analytics theo period (Low)
- `POST /api/v1/auth/forgot-password` — cần email service (Low)
- CDC sync worker (WAL → Elasticsearch) — Low

### Web (6 Phases — Phase 6 chưa bắt đầu)

| Phase | Tính năng |
|-------|-----------|
| 1 | Foundation: App Router, sidebar, auth, theme (light/dark), providers, middleware |
| 2 | Services layer, types, hooks, owner pages, admin pages, shared components |
| 3 | `/owner/reservations/[id]`, WebSocket hook với exponential backoff |
| 4 | `/admin/hotels/[id]`, `/admin/users/[id]`, `/admin/bookings`, `/admin/analytics` |
| 5 | `/admin/system/logs`, `/admin/system/dlq`, `system.service.ts` |
| 6 | Polish — chưa bắt đầu |

**Trang vẫn dùng mock data (P1):**
- `/owner/dashboard` — cần `GET /owner/dashboard` (KPI)
- `/owner/properties` — xóa `MOCK_HOTELS`
- `/admin/hotels` — xóa `MOCK_PENDING`
- `/admin/system` — xóa `INITIAL_SERVICES`
- `/admin/system/dlq` — xóa `MOCK_DLQ`

### Mobile (7 Phases — Phase 8 pending)

| Phase | Tính năng |
|-------|-----------|
| 1 | Expo scaffold, auth screens, routing, design system, stores, API layer |
| 2 | Search + FilterSheet, HotelCard, Map với price markers, hotel detail |
| 3 | Booking form (MiniCalendar), Review & Pay, ConflictRetryModal |
| 4 | Processing screen (animated saga steps + polling), confirmation |
| 5 | Owner dashboard, Properties, Reservations, Analytics với bar chart |
| 6 | Admin: overview + health banner, hotel approvals, user management, system health |
| 7 | `useRealtimeConnection` hook + WebSocket wiring (guest layout) |
| +  | UI Polish: gradient login, Momo-style bottom nav, haptic feedback |

**Còn thiếu (Phase 8):**
- Dark mode (NativeWind theming)
- Map geo search thật (`expo-location` + ES)
- Notification real-time badge từ WS store
- E2E tests (Maestro)

---

## Kiến Trúc & Quyết Định Kỹ Thuật

### Distributed Lock (chống double-booking)
```
Redis SETNX key: "lock:room:{roomID}:{date}"
TTL: 5s, retry: 10 lần × 50ms
Release: Lua atomic check-and-delete
HTTP 409 → Mobile hiển thị ConflictRetryModal
```

### Payment Saga (FSM + Outbox)
```
pending → awaiting_payment → processing → confirmed
                                       ↘ failed / cancelled(timeout)

Outbox polling 2s → RabbitMQ → PaymentWorker (80% success/15% fail/5% timeout)
→ SagaOrchestrator → update booking + notification + WS broadcast
```

### WebSocket (One-Time Ticket)
```
Client: POST /ws/ticket (JWT) → UUID (Redis TTL 30s)
Client: GET /ws/bookings?ticket=xxx → ticket consumed (GetDel atomic)
Hub: userID → []WebSocket connections (per-conn write mutex)
```

### Auth (Web vs Mobile)
```
Web:    HttpOnly cookie (withCredentials: true), không lưu token trong JS
Mobile: SecureStore (expo-secure-store), Bearer header, key: "auth_access_token"
```

---

## Bài Học Kỹ Thuật

### Go
- Interface nhỏ định nghĩa ở nơi sử dụng (handler định nghĩa `BookingServiceInterface`, không phải service)
- Mock struct với function fields: mỗi test case customize từng method độc lập
- Table-driven tests là convention chuẩn của Go
- `defer tx.Rollback()` an toàn kể cả khi commit thành công (no-op)
- Lua script atomic cho Redis: check-and-delete trong 1 round trip

### Next.js / React
- `placeholderData` trong useQuery để show mock khi API chưa có → dễ test UI
- `"use client"` chỉ cần khi dùng hooks, event handlers, state
- CSS variables (`var(--primary)`) thay vì hardcode màu → hỗ trợ dark mode dễ
- Zustand v5: persist middleware cho auth state, không lưu tokens

### React Native / Expo
- `expo-secure-store` thay vì AsyncStorage cho JWT (không có HttpOnly cookie)
- Reanimated `withSpring` cho animated bottom nav (Momo-style pill)
- `expo-haptics` trên mọi interactive element
- Exponential backoff WebSocket reconnect: 1s → 30s cap

### Monorepo Patterns
- Endpoint path phải đồng bộ giữa 3 nơi: backend router, web service, mobile constants
- Lỗi điển hình: frontend gọi endpoint chưa tồn tại (`/owner/reservations` vs `/owner/bookings`)
- Fix theo thứ tự: backend trước → client sau

---

## Next Steps (Ưu Tiên)

### P1 — Backend missing endpoints
- [ ] `PUT /api/v1/auth/me` — profile update (unblock web + mobile profile screens)

### P2 — Web mock data removal
- [ ] Wire `/owner/dashboard` → `GET /owner/dashboard`
- [ ] Wire `/owner/properties` → xóa MOCK_HOTELS
- [ ] Wire `/admin/hotels` → xóa MOCK_PENDING
- [ ] Wire `/admin/system` → xóa INITIAL_SERVICES, MOCK_DLQ

### P3 — Mobile features
- [ ] Map geo search (`expo-location` + ES geo_distance)
- [ ] Notification real-time badge
- [ ] Dark mode

### P4 — Testing
- [ ] E2E Maestro: auth → search → book → confirm flow
- [ ] Playwright E2E cho web critical flows
