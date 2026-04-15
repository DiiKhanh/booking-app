# PLAN.md — StayEase Hotel Booking System

> **Cập nhật**: 2026-04-16
> Tài liệu này giúp bạn định hướng lại toàn bộ dự án, hiểu rõ những gì đã xây dựng,
> và biết chính xác phải làm gì tiếp theo.

---

## 1. Mục Tiêu Học Tập

Dự án này lấy cảm hứng từ [System Design Handbook — Hotel Booking System](https://www.systemdesignhandbook.com/guides/design-hotel-booking-system/).
Mục tiêu **không phải** là chỉ ship một app, mà là **hiểu sâu từng bài toán kỹ thuật** bên dưới.

| Bài Toán | Khái Niệm Cần Học | Áp Dụng Trong Dự Án |
|---|---|---|
| Đặt phòng không bị double-booking | Distributed Locking, Optimistic Concurrency | Redis SETNX + Lua script trong `booking_repo.go` |
| Xử lý thanh toán không đồng bộ | Saga Pattern, Outbox Pattern, FSM | `SagaOrchestrator`, `OutboxWorker`, RabbitMQ |
| Tìm khách sạn theo vị trí | Elasticsearch geo_distance, Search cache | `ESSearchRepo`, `SearchCache` (Redis) |
| Thông báo real-time | WebSocket, Pub/Sub | `Hub` + RabbitMQ consumer → WebSocket broadcast |
| Phân quyền nhiều role | RBAC, JWT, Middleware | `RequireRole`, `JWTAuth`, roles: guest/owner/admin |
| Giới hạn request | Rate Limiting (IP + per-user) | `RateLimiter` + `UserRateLimiter` middleware |
| Quan sát hệ thống | Prometheus metrics, Jaeger tracing | `/metrics`, `InitTracer`, Grafana dashboards |
| Triển khai sản xuất | Docker, CI/CD, graceful shutdown | `docker-compose.yml`, GitHub Actions, Dockerfile |

---

## 2. Trạng Thái Hiện Tại

### 2.1 Backend — ĐÃ HOÀN THÀNH

Backend là phần **hoàn chỉnh nhất** trong dự án. Tất cả 10 phase đã được triển khai:

**Auth & User (Phase 2)**
- `POST /api/v1/auth/register` — Đăng ký (trả về JWT + HttpOnly cookie)
- `POST /api/v1/auth/login` — Đăng nhập
- `POST /api/v1/auth/refresh` — Làm mới token
- `POST /api/v1/auth/logout` — Đăng xuất
- `GET /api/v1/auth/me` — Lấy profile

**Hotel & Room (Phase 3)**
- `GET /api/v1/hotels` — Danh sách khách sạn (public)
- `GET /api/v1/hotels/:id` — Chi tiết khách sạn (public)
- `GET /api/v1/hotels/:id/rooms` — Danh sách phòng (public)
- `POST /api/v1/owner/hotels` — Tạo khách sạn (owner)
- `PUT /api/v1/owner/hotels/:id` — Cập nhật (owner)
- `DELETE /api/v1/owner/hotels/:id` — Xóa (owner)
- `POST /api/v1/owner/hotels/:id/rooms` — Tạo phòng
- `PUT /api/v1/owner/rooms/:id` / `DELETE` — Quản lý phòng
- `PUT /api/v1/owner/rooms/:id/inventory` — Cập nhật tồn kho
- `GET /api/v1/owner/rooms/:id/inventory` — Xem tồn kho

**Booking (Phase 1 — Core)**
- `POST /api/v1/bookings` — Tạo đặt phòng (có distributed lock)
- `GET /api/v1/bookings` — Lịch sử đặt phòng của user
- `GET /api/v1/bookings/:id` — Chi tiết
- `GET /api/v1/bookings/:id/status` — Trạng thái (dùng để poll)
- `DELETE /api/v1/bookings/:id` — Hủy đặt phòng

**Payment Saga (Phase 5)**
- `POST /api/v1/checkout` — Khởi động saga thanh toán
- `GET /api/v1/payments/:id` — Trạng thái payment
- FSM đầy đủ: pending → awaiting_payment → processing → confirmed/failed/cancelled
- Outbox Pattern + RabbitMQ publisher/consumer
- Inventory rollback khi payment thất bại

**Search (Phase 4)**
- `GET /api/v1/hotels/search` — Tìm kiếm với geo-distance, price filter, amenities, availability
- Elasticsearch indexing + Redis cache tầng 2

**Reviews (Phase 6)**
- `GET /api/v1/hotels/:id/reviews` — Xem đánh giá (public)
- `POST /api/v1/hotels/:id/reviews` — Viết đánh giá (cần booking confirmed)
- `PUT /api/v1/reviews/:id` / `DELETE` — Sửa/Xóa đánh giá

**Notifications (Phase 7)**
- `GET /api/v1/notifications` — Danh sách thông báo
- `GET /api/v1/notifications/unread-count`
- `PUT /api/v1/notifications/:id/read`
- `PUT /api/v1/notifications/read-all`

**WebSocket (Phase 8)**
- `POST /api/v1/ws/ticket` — Lấy one-time ticket (tránh JWT trong URL)
- `GET /api/v1/ws/bookings` — Kết nối WebSocket real-time
- RabbitMQ consumer broadcast booking status updates tới clients

**Chat (Phase 9)**
- `POST /api/v1/conversations` — Tạo cuộc trò chuyện
- `GET /api/v1/conversations` — Danh sách
- `GET /api/v1/conversations/:id/messages` — Lịch sử tin nhắn
- `POST /api/v1/conversations/:id/messages` — Gửi tin
- `PUT /api/v1/conversations/:id/read` — Đánh dấu đã đọc
- `GET /api/v1/chat/unread-count`

**Admin (Phase 10)**
- `GET /api/v1/admin/hotels/pending` — Danh sách khách sạn chờ duyệt
- `PUT /api/v1/admin/hotels/:id/approve` / `reject`
- `GET /api/v1/admin/users` / `/:id` — Quản lý users
- `PUT /api/v1/admin/users/:id/role` — Đổi role
- `PUT /api/v1/admin/users/:id/deactivate`
- `GET /api/v1/admin/bookings` — Tất cả bookings
- `GET /api/v1/admin/system/health` — Sức khỏe hệ thống
- `GET /api/v1/admin/events/dlq` + `POST /:id/retry` — Dead Letter Queue
- `POST /api/v1/admin/broadcast` — Broadcast announcement

**Infrastructure hoàn chỉnh:**
- PostgreSQL (7 migrations), Redis (lock + cache), Elasticsearch, RabbitMQ
- Prometheus metrics tại `/metrics`, Jaeger distributed tracing
- Grafana dashboards trong `backend/monitoring/`
- GitHub Actions CI/CD cho cả 3 stack
- Rate limiter (IP-level + per-user), CORS middleware
- Graceful shutdown, health probes (`/health/live`, `/health/ready`, `/health/startup`)

---

### 2.2 Web (Next.js) — TRẠNG THÁI

**Đã có cấu trúc trang và UI, nhưng phần lớn dùng dữ liệu mock, chưa kết nối backend thật.**

| Trang | Trạng thái | Ghi chú |
|---|---|---|
| `/login`, `/register` | Kết nối thật | `authService.login/register` hoạt động |
| `/owner/dashboard` | UI mock | KPI cards dùng số cứng, chưa gọi `GET /owner/dashboard` |
| `/owner/properties` | UI + mock data | `useQuery(hotelService.getMyHotels)` có nhưng MOCK_HOTELS override |
| `/owner/properties/new` | Kết nối thật | Form gọi `hotelService.createHotel` |
| `/owner/properties/:id` | Một phần | Kết nối đọc nhưng update dùng mock |
| `/owner/properties/:id/rooms` | Một phần | Gọi `hotelService.getRooms` |
| `/owner/properties/:id/rooms/:roomId/inventory` | Kết nối thật | Gọi `hotelService.getInventory` + `updateInventory` |
| `/owner/reservations` | Mock | Dùng endpoint không tồn tại trong backend |
| `/owner/analytics` | Mock hoàn toàn | Backend không có analytics endpoint |
| `/owner/messages` | Có service | `chatService` đầy đủ nhưng UI chưa wire |
| `/admin/hotels` | Mock + service | Có `adminService.getPendingHotels` nhưng dùng MOCK_PENDING |
| `/admin/hotels/:id` | Một phần | Có approve/reject actions |
| `/admin/users` | Kết nối thật | `adminService.getUsers` hoạt động |
| `/admin/users/:id` | Kết nối thật | `adminService.getUser` + `updateUserRole` |
| `/admin/bookings` | Kết nối thật | `bookingService.getAllBookings` |
| `/admin/system` (health) | Mock | Dữ liệu cứng, `systemService.getHealth` chưa wire |
| `/admin/system/dlq` | Mock | MOCK_DLQ, chưa gọi `systemService.getDLQ` |
| `/admin/system/logs` | Mock | Không có backend endpoint logs |
| `/admin/broadcast` | Kết nối thật | `chatService.broadcast` hoạt động |
| `/admin/messages` | Có service | Chat service OK nhưng UI chưa đầy đủ |
| `/admin/analytics` | Mock | Không có backend analytics |

**Chưa có:**
- Trang tìm kiếm / đặt phòng cho Guest (web không phục vụ role guest)
- Notification panel kết nối thật với `GET /api/v1/notifications`
- WebSocket client kết nối thật với `GET /api/v1/ws/bookings`
- Owner dashboard kết nối `GET /api/v1/owner/dashboard`

---

### 2.3 Mobile (Expo) — TRẠNG THÁI

**Mobile hoàn chỉnh hơn Web về mặt kết nối backend.**

| Màn hình | Trạng thái | Ghi chú |
|---|---|---|
| Welcome/Onboarding | Hoàn chỉnh | UI tốt |
| Login/Register | Kết nối thật | `auth.service` hoạt động |
| Home (Guest) | Kết nối thật | `useTrendingHotels` gọi backend |
| Tìm kiếm | Kết nối thật + mock fallback | `useSearchHotels` gọi ES search, có MOCK_HOTELS dự phòng |
| Bản đồ (search/map.tsx) | Có file | Cần kết nối react-native-maps với ES geo search |
| Hotel detail | Kết nối thật | `useHotelDetail`, `useHotelRooms` |
| Chọn ngày booking | Hoàn chỉnh | Calendar custom, lưu vào `booking.store` |
| Review & Checkout | Kết nối thật | Gọi `bookingService.create` + `paymentService.checkout` |
| Processing (Saga) | Kết nối thật | Polling `bookingService.getStatus` + WebSocket hook |
| Confirmation | Hoàn chỉnh | Màn hình xác nhận |
| Danh sách booking | Kết nối thật | `bookingService.list` |
| Chi tiết booking | Kết nối thật | `bookingService.getById` |
| Notifications | Kết nối thật | `GET /api/v1/notifications` |
| Messages (guest) | Kết nối thật | `chatService` đầy đủ |
| Profile | UI hoàn chỉnh | Chưa gọi update profile endpoint |
| Owner Dashboard | Kết nối thật | `useOwnerDashboard` hook |
| Owner Properties | Kết nối thật | `useSearchHotels` với owner filter |
| Owner Create Property | Kết nối thật | Gọi owner service |
| Owner Rooms | Kết nối thật | `owner.service.getRooms` |
| Owner Inventory | Kết nối thật | `owner.service.getInventory` |
| Owner Reservations | Kết nối thật | owner reservations |
| Owner Messages | Kết nối thật | Chat service |
| Admin Hotels | Kết nối thật | `admin.service` |
| Admin Users | Kết nối thật | `admin.service` |
| Admin System | UI mock | Chưa gọi `GET /admin/system/health` |

**Chưa có:**
- Map view kết nối thật với backend geo search
- Profile update gọi API
- Admin system health kết nối thật
- Forgot password (màn hình có nhưng backend chưa có endpoint reset password)

---

## 3. Kiến Trúc Hệ Thống

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENTS                                         │
│                                                                              │
│   ┌──────────────────────────┐        ┌──────────────────────────────────┐  │
│   │   Web (Next.js :3001)    │        │   Mobile (Expo - iOS/Android)    │  │
│   │                          │        │                                  │  │
│   │   Role: Owner + Admin    │        │   Role: Guest + Owner + Admin    │  │
│   │   ┌────────┬───────────┐ │        │   ┌────────┬────────┬──────────┐│  │
│   │   │Zustand │React Query│ │        │   │Zustand │  RQ    │NativeWind││  │
│   │   └────────┴───────────┘ │        │   └────────┴────────┴──────────┘│  │
│   └──────────────────────────┘        └──────────────────────────────────┘  │
│              │  HTTPS / WSS                         │  HTTPS / WSS          │
└──────────────┼──────────────────────────────────────┼───────────────────────┘
               │                                      │
┌──────────────▼──────────────────────────────────────▼───────────────────────┐
│                     BACKEND (Go + Gin :8080)                                 │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │                         Middleware Layer                                │ │
│  │  CORS │ RateLimit(IP) │ UserRateLimit │ JWTAuth │ RequireRole │ OTEL   │ │
│  └──────────────────────────────┬──────────────────────────────────────────┘ │
│                                 │                                            │
│  ┌──────────┬──────────┬────────┴──┬──────────┬────────┬──────┬──────────┐  │
│  │  Auth    │  Hotel   │  Booking  │  Search  │Payment │ Chat │Notif/WS  │  │
│  │ Handler  │ Handler  │  Handler  │  Handler │Handler │Hndlr │ Handler  │  │
│  └────┬─────┴────┬─────┴────┬──────┴────┬─────┴───┬────┴──┬───┴────┬─────┘  │
│       │          │          │           │         │       │        │         │
│  ┌────▼──────────▼──────────▼───────────▼─────────▼───────▼────────▼──────┐  │
│  │                         Service Layer                                   │  │
│  │  AuthSvc│HotelSvc│BookingSvc│SearchSvc│SagaOrchestrator│ChatSvc│Notif  │  │
│  └────┬──────────┬──────────┬──────────────┬───────────────────────┬──────┘  │
│       │          │          │              │                       │         │
│  ┌────▼──────────▼──────────▼──────────────▼───────────────────────▼──────┐  │
│  │                       Repository Layer                                  │  │
│  └─────────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────────┘
        │           │              │                │               │
┌───────▼───┐ ┌─────▼──────┐ ┌────▼──────┐ ┌───────▼────┐ ┌───────▼──────────┐
│PostgreSQL │ │   Redis    │ │Elasticsearch│ │  RabbitMQ  │ │    Jaeger        │
│           │ │            │ │             │ │            │ │   (Tracing)      │
│ 7 schemas │ │ Lock +     │ │ hotels      │ │ Exchanges: │ │                  │
│ bookings  │ │ SearchCache│ │ index +     │ │ booking.*  │ │ + Prometheus     │
│ payments  │ │ WS Tickets │ │ geo_point   │ │ payment.*  │ │ + Grafana        │
│ outbox    │ │            │ │             │ │ DLQ        │ │                  │
│ chat      │ └────────────┘ └─────────────┘ └────────────┘ └──────────────────┘
└───────────┘
```

**Luồng Real-time (WebSocket):**
```
User → POST /ws/ticket (JWT) → nhận one-time token
User → GET /ws/bookings?ticket=xxx → WebSocket connection
RabbitMQ consumer → PaymentBroadcastHandler → Hub.Broadcast(userID)
Hub → send JSON frame tới tất cả kết nối của userID
```

**Luồng Payment Saga:**
```
Client → POST /checkout → SagaOrchestrator.StartCheckout()
  → tạo Payment (pending) + OutboxEvent (BookingPaymentInitiated)
  → booking status: awaiting_payment
OutboxWorker (polling) → đọc outbox → publish lên RabbitMQ
PaymentWorker (cmd/worker) → consume → xử lý → publish result event
API consumer → SagaOrchestrator.HandlePaymentSuccess/Failure/Timeout()
  → cập nhật booking + notification → broadcast qua WebSocket
```

---

## 4. Khoảng Cách Cần Lấp (Gap Analysis)

So sánh với System Design Handbook:

| Chủ đề Handbook | Trạng thái | Ghi chú |
|---|---|---|
| Hotel inventory management | DONE (backend), PARTIAL (frontend) | Backend đầy đủ; Web/Mobile còn mock data |
| Concurrent booking + distributed locking | ✅ DONE | Redis SETNX + Lua + retry logic |
| Payment saga (orchestrated) | ✅ DONE | SagaOrchestrator + Outbox + RabbitMQ |
| Compensating transaction (rollback inventory) | ✅ DONE | RestoreInventory khi payment fail |
| Real-time via WebSocket | DONE (backend), PARTIAL (mobile) | Web chưa có WS client; Mobile đang polling |
| Elasticsearch geo-search | ✅ DONE | geo_point + geo_distance query |
| Search caching (Redis) | ✅ DONE | SearchCache 5 phút TTL |
| Rate limiting | ✅ DONE | IP-level + per-user |
| RBAC (guest/owner/admin) | ✅ DONE | RequireRole middleware |
| JWT + Refresh Token | ✅ DONE | HttpOnly cookie + token rotation |
| Observability (Prometheus) | ✅ DONE | /metrics endpoint |
| Distributed tracing (Jaeger) | ✅ DONE | OpenTelemetry OTLP exporter |
| CI/CD (GitHub Actions) | ✅ DONE | backend.yml, web.yml, mobile.yml |
| Docker | ✅ DONE | docker-compose với 9 containers |
| CDC Sync (Postgres → ES) | ❌ MISSING | Hiện tại index chỉ khi hotel được tạo/update; không có WAL/CDC |
| Kubernetes deployment | ❌ MISSING | docker-compose.prod.yml có nhưng không có K8s manifests |
| Map view (frontend) | PARTIAL | Mobile có màn hình map nhưng chưa kết nối ES geo search |
| Guest booking flow (Web) | ❌ MISSING | Web chỉ có Owner/Admin portal; không có guest search/book |
| Email/SMS notifications | ❌ MISSING | Backend notification store OK nhưng không gửi email thật |
| Profile update API | ❌ MISSING | `PUT /auth/me` chưa tồn tại |
| Forgot password | ❌ MISSING | Màn hình có nhưng backend chưa có endpoint |
| Analytics/Reporting | PARTIAL | `GET /owner/dashboard` có nhưng thiếu `/owner/analytics` |

---

## 5. Kế Hoạch Phát Triển Tiếp Theo

### 5.1 Backend — Các phần còn thiếu (ưu tiên thấp, backend đã solid)

| Task | Endpoint | Priority |
|---|---|---|
| Profile update | `PUT /api/v1/auth/me` | Medium |
| Forgot/reset password | `POST /api/v1/auth/forgot-password`, `POST /api/v1/auth/reset-password` | Low |
| Owner analytics | `GET /api/v1/owner/analytics?period=7d|30d|90d` | Low |
| CDC sync Postgres → ES | Background worker đọc bảng hotels khi có thay đổi | Low |

---

### 5.2 Web (Next.js) — Danh sách cụ thể

**Ưu tiên cao — loại bỏ mock data, kết nối backend thật:**

1. **Owner Dashboard thật**
   - Xóa số cứng trong `/owner/dashboard/page.tsx`
   - Gọi `GET /api/v1/owner/dashboard` → hiển thị KPI thật
   - Endpoint sẵn có: `ownerHandler.Dashboard`

2. **Owner Properties list thật**
   - Xóa `MOCK_HOTELS` trong `/owner/properties/page.tsx`
   - Dùng `useQuery(() => hotelService.getMyHotels())` thuần

3. **Admin Hotels thật**
   - Xóa `MOCK_PENDING` trong `/admin/hotels/page.tsx`
   - Gọi `adminService.getPendingHotels()` → approve/reject kết nối thật
   - Endpoint: `GET /api/v1/admin/hotels/pending`, `PUT /api/v1/admin/hotels/:id/approve`

4. **Admin System Health thật**
   - Xóa `INITIAL_SERVICES` cứng trong `/admin/system/page.tsx`
   - Gọi `systemService.getHealth()` → `GET /api/v1/admin/system/health`
   - Auto-refresh mỗi 30 giây

5. **Admin DLQ thật**
   - Xóa `MOCK_DLQ` trong `/admin/system/dlq/page.tsx`
   - Gọi `systemService.getDLQ()` → `GET /api/v1/admin/events/dlq`
   - Nút retry gọi `POST /api/v1/admin/events/dlq/:id/retry`

**Ưu tiên trung — tính năng học được quan trọng:**

6. **WebSocket client (real-time booking status)**
   - Tạo hook `useWebSocket` trong `web/hooks/useWebSocket.ts`
   - Luồng: `POST /api/v1/ws/ticket` → kết nối `wss://.../api/v1/ws/bookings?ticket=xxx`
   - Hiển thị badge "Live" khi WebSocket connected
   - Đây là phần quan trọng để demo Saga real-time

7. **Notifications panel thật**
   - Fetch từ `GET /api/v1/notifications` khi load
   - Gọi `PUT /api/v1/notifications/:id/read` khi click
   - Gọi `GET /api/v1/notifications/unread-count` cho badge header

8. **Owner Reservations thật**
   - Trang dùng endpoint không tồn tại
   - Sửa lại: gọi `GET /api/v1/admin/bookings?owner_id=xxx` hoặc thêm `GET /api/v1/owner/bookings`

9. **Owner Messages (Chat) thật**
   - Kết nối `chatService.listConversations()`
   - Hiển thị conversation list, gửi message qua `chatService.sendMessage()`

---

### 5.3 Mobile (Expo) — Danh sách cụ thể

**Ưu tiên cao:**

1. **WebSocket kết nối thật (processing screen)**
   - `/booking/processing.tsx` đang dùng polling — chuyển sang WebSocket thật
   - Luồng: `POST /api/v1/ws/ticket` → kết nối WSS → nhận `booking_status_updated`
   - Khi nhận event → `updateSagaStatus()` → chuyển màn hình tự động
   - **Bài học cốt lõi về real-time + Saga pattern**

2. **Bản đồ tìm kiếm thật (map.tsx)**
   - Kết nối `expo-location` → `hotelService.search({ lat, lng, radius_km })`
   - Render markers trên `react-native-maps`
   - Khi drag bản đồ → re-search với bounds mới
   - **Bài học: Geo-spatial search + Elasticsearch geo_distance**

3. **Notification real-time**
   - Khi WebSocket nhận notification event → thêm vào `notification.store`
   - Badge count trên tab bar cập nhật real-time

4. **Profile update**
   - Thêm form edit, gọi `PUT /api/v1/auth/me` (cần thêm backend endpoint trước)

**Ưu tiên trung:**

5. **Admin System Health thật** — kết nối `GET /api/v1/admin/system/health`
6. **Booking cancel flow** — nút "Cancel" gọi `bookingService.cancel(id)`
7. **Conflict retry UX (409)** — đảm bảo `ConflictRetryModal` hiện đúng khi nhận 409

---

## 6. Thứ Tự Ưu Tiên

Sắp xếp theo **giá trị học tập** và **dependency order**:

```
 1. [WEB]    Xóa mock data Owner Dashboard → kết nối GET /owner/dashboard
 2. [WEB]    Xóa mock data Admin Hotels pending → kết nối approve/reject thật
 3. [WEB]    Admin System Health thật → GET /admin/system/health
 4. [WEB]    Admin DLQ thật → GET /admin/events/dlq + retry
 5. [MOBILE] Hoàn thiện WebSocket hook → xem Saga flow real-time
 6. [WEB]    Xây WebSocket client → notification live trên web
 7. [MOBILE] Bản đồ geo search thật → Elasticsearch geo_distance
 8. [WEB]    Notifications panel thật → GET /notifications + mark read
 9. [MOBILE] Notification real-time → WebSocket + notification store
10. [WEB]    Owner Reservations → sửa endpoint hoặc thêm owner/bookings backend
11. [WEB]    Owner Chat/Messages → wire chatService vào UI
12. [BACKEND] Thêm PUT /auth/me (profile update)
13. [MOBILE] Profile update form → gọi PUT /auth/me
14. [BACKEND] Thêm GET /owner/analytics (revenue/occupancy theo period)
15. [WEB]    Owner Analytics thật
16. [MOBILE] Owner Analytics thật
17. [BACKEND] Forgot/reset password endpoints
18. [MOBILE] Forgot password flow kết nối thật
19. [BACKEND] CDC sync worker (Postgres WAL → Elasticsearch real-time)
```

---

## 7. Định Nghĩa Hoàn Thành

Dự án được coi là **hoàn chỉnh như một hệ thống học tập** khi:

### Backend
- [x] Distributed locking ngăn double-booking (đã có + load test k6)
- [x] Payment Saga FSM với Outbox Pattern và DLQ
- [x] Elasticsearch geo-search với Redis cache
- [x] WebSocket real-time notifications
- [x] RBAC với 3 roles
- [x] Rate limiting (IP + per-user)
- [x] Prometheus + Jaeger observability
- [x] CI/CD GitHub Actions
- [ ] CDC sync worker (Postgres → ES)
- [ ] Profile update endpoint (`PUT /auth/me`)

### Web
- [x] Auth (login/register) kết nối thật
- [ ] Owner Dashboard dùng data thật (không mock)
- [ ] Owner Properties quản lý đầy đủ không mock
- [ ] Admin hotel approval workflow hoạt động thật
- [ ] Admin DLQ retry thật
- [ ] WebSocket client hiển thị booking status live
- [ ] Notifications kết nối backend thật

### Mobile
- [x] Toàn bộ booking flow end-to-end kết nối thật
- [x] Saga processing screen (polling)
- [x] 409 Conflict retry modal
- [ ] WebSocket kết nối thật (thay polling hoàn toàn)
- [ ] Bản đồ geo search thật
- [ ] Notification real-time qua WebSocket

### Demo Scenarios (phải demo được)
1. Mở 2 client cùng book 1 phòng → 1 thành công, 1 nhận 409 + retry modal
2. Checkout → xem processing screen → trạng thái chuyển real-time qua WebSocket
3. Admin duyệt khách sạn → owner nhận notification
4. Tìm kiếm khách sạn với geo filter → kết quả sorted by distance từ Elasticsearch
5. Mở DLQ page → thấy failed events → retry → xem event xử lý lại

---

*PLAN.md được tạo dựa trên phân tích toàn bộ source code tại thời điểm 2026-04-16.*
*Backend: Go + Gin | Web: Next.js 15 | Mobile: Expo (React Native)*
