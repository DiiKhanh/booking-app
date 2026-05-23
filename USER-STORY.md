# USER-STORY.md — StayEase Demo & Test Scenarios

> Mục đích: Hướng dẫn test và demo từng tính năng của StayEase trên Web + Mobile.
> Mỗi story gắn với 1 concept trong System Design bài viết và ánh xạ đến API thực tế.
>
> **Cách đọc:**
> - `[Web]` → Next.js portal tại `localhost:3001`
> - `[Mobile]` → Expo app
> - `[API]` → curl/Postman trực tiếp vào `localhost:8080`
> - **SD Concept** → Concept System Design mà story này demonstrate

---

## Mục lục

1. [Setup & Seeding](#1-setup--seeding)
2. [Epic A — Authentication & Identity](#epic-a--authentication--identity)
3. [Epic B — Hotel Discovery & Search Service](#epic-b--hotel-discovery--search-service)
4. [Epic C — Inventory Service](#epic-c--inventory-service)
5. [Epic D — Booking Service & Concurrency](#epic-d--booking-service--concurrency)
6. [Epic E — Payment Saga](#epic-e--payment-saga)
7. [Epic F — Real-time Notifications & WebSocket](#epic-f--real-time-notifications--websocket)
8. [Epic G — Reviews System](#epic-g--reviews-system)
9. [Epic H — Owner Management Portal](#epic-h--owner-management-portal)
10. [Epic I — Admin Platform Oversight](#epic-i--admin-platform-oversight)
11. [Epic J — Chat & Messaging](#epic-j--chat--messaging)
12. [Epic K — Observability & System Health](#epic-k--observability--system-health)
13. [Kịch bản End-to-End](#kịch-bản-end-to-end)

---

## 1. Setup & Seeding

Chạy toàn bộ stack trước khi bắt đầu bất kỳ story nào.

```bash
# 1. Infra + monitoring
cd devops && docker compose up -d

# 2. Backend
cd backend && make migrate && make server

# 3. Seed dữ liệu mẫu (hotels, rooms, users)
cd backend && go run cmd/seeder/main.go

# 4. Web
cd web && npm run dev        # localhost:3001

# 5. Mobile
cd mobile && npm start       # Expo Go
```

### Tài khoản mẫu sau khi seed

| Role  | Email                  | Password   | Dùng để demo               |
|-------|------------------------|------------|----------------------------|
| Guest | guest@stayease.com     | Guest123!  | Search, Book, Pay          |
| Owner | owner@stayease.com     | Owner123!  | Manage hotels, view reservations |
| Admin | admin@stayease.com     | Admin123!  | Approve hotels, manage users |

---

## Epic A — Authentication & Identity

> **SD Concept**: API Gateway — Authentication, Authorization, RBAC

### A-1: Đăng ký tài khoản Guest

**Nền tảng:** `[Web]` `[Mobile]`

**User Story:** Là khách du lịch, tôi muốn tạo tài khoản để có thể đặt phòng và theo dõi booking.

**Bước thực hiện (Mobile):**
1. Mở app → màn hình Login
2. Nhấn "Sign Up"
3. Điền: tên, email, password (min 8 ký tự, có chữ hoa + số)
4. Submit → redirect về màn hình Home (guest tabs)

**Verify:**
- [ ] Nhận response `201 Created` với `{ user, access_token }`
- [ ] Token được lưu trong `expo-secure-store` (không phải AsyncStorage)
- [ ] Bottom nav hiển thị: Home / Search / Bookings / Messages / Profile

**API:** `POST /api/v1/auth/register`

---

### A-2: Đăng nhập và JWT Refresh

**Nền tảng:** `[Web]` `[Mobile]`

**User Story:** Là người dùng quay lại app, tôi muốn đăng nhập và session của tôi không bị mất sau khi token hết hạn.

**Bước thực hiện:**
1. Đăng nhập với tài khoản guest mẫu
2. Đợi 15 phút (hoặc expire token thủ công)
3. Thực hiện bất kỳ action nào (xem booking, search)

**Verify:**
- [ ] `[Web]` Axios interceptor tự gọi `POST /auth/refresh` khi nhận 401
- [ ] `[Mobile]` Tương tự — token được refresh transparent
- [ ] Nếu refresh cũng fail → redirect về Login
- [ ] `[Web]` Token lưu trong HttpOnly cookie (không xem được trong JS)
- [ ] `[Mobile]` Token lưu trong SecureStore

**API:** `POST /api/v1/auth/login` → `POST /api/v1/auth/refresh`

---

### A-3: RBAC — Role-based redirect

**Nền tảng:** `[Web]`

**User Story:** Là Owner, khi tôi mở web app, tôi muốn được redirect thẳng đến Owner portal, không phải màn hình guest.

**Bước thực hiện:**
1. Mở `localhost:3001` (chưa đăng nhập)
2. Đăng nhập với tài khoản `owner@stayease.com`

**Verify:**
- [ ] Redirect đến `/owner/dashboard` (không phải `/`)
- [ ] Sidebar hiển thị menu Owner: Dashboard, Properties, Reservations, Analytics, Messages
- [ ] Truy cập `/admin/dashboard` → bị redirect về `/owner/dashboard`

**API:** `GET /api/v1/auth/me` (middleware đọc role claim từ JWT)

---

### A-4: Đăng xuất

**Nền tảng:** `[Web]` `[Mobile]`

**Bước thực hiện:**
1. Đăng nhập bất kỳ role
2. Nhấn Logout

**Verify:**
- [ ] `[Web]` Cookie bị xóa (HttpOnly), redirect về `/login`
- [ ] `[Mobile]` SecureStore bị clear, redirect về Login screen
- [ ] Gọi lại `GET /auth/me` → 401

---

## Epic B — Hotel Discovery & Search Service

> **SD Concept**: Search Service (tách biệt khỏi Booking), Caching Layer (Redis), Elasticsearch

### B-1: Tìm kiếm khách sạn theo tên / địa điểm

**Nền tảng:** `[Mobile]`

**User Story:** Là khách du lịch, tôi muốn tìm khách sạn ở Đà Nẵng để lựa chọn nơi lưu trú.

**Bước thực hiện:**
1. Tab Search
2. Nhập "Da Nang" vào search box
3. Quan sát debounce (500ms) trước khi gọi API
4. Xem danh sách kết quả với price markers trên map

**Verify:**
- [ ] Kết quả hiển thị trong vòng < 200ms (lần đầu: Elasticsearch, lần 2: Redis cache)
- [ ] Mỗi card hiển thị: tên, rating, giá/đêm, ảnh
- [ ] Map pins cập nhật theo kết quả

**API:** `GET /api/v1/hotels/search?q=Da+Nang`

---

### B-2: Filter nâng cao — ngày / loại phòng / giá

**Nền tảng:** `[Mobile]`

**User Story:** Là khách du lịch, tôi muốn lọc khách sạn theo ngày check-in/out và ngân sách để tìm phòng phù hợp.

**Bước thực hiện:**
1. Nhấn icon filter (FilterSheet)
2. Chọn check-in: ngày mai, check-out: 3 ngày sau
3. Kéo price range slider: 500k–2M VND
4. Chọn room type: "Deluxe"
5. Apply filter

**Verify:**
- [ ] Kết quả chỉ show hotel có phòng available trong date range đó
- [ ] Price filter hoạt động đúng
- [ ] "0 results" nếu không có phòng phù hợp

**API:** `GET /api/v1/hotels/search?check_in=...&check_out=...&min_price=...&max_price=...`

---

### B-3: Xem chi tiết khách sạn

**Nền tảng:** `[Mobile]`

**User Story:** Là khách du lịch, tôi muốn xem đầy đủ thông tin khách sạn và danh sách phòng trước khi đặt.

**Bước thực hiện:**
1. Tap vào hotel card từ search results
2. Xem hotel detail screen

**Verify:**
- [ ] Hiển thị: tên, địa chỉ, rating, mô tả, ảnh
- [ ] Danh sách phòng với giá, loại, số lượng còn trống
- [ ] Nút "Select Room" sticky ở bottom
- [ ] Reviews section (nếu có)

**API:** `GET /api/v1/hotels/:id` + `GET /api/v1/hotels/:id/rooms`

---

### B-4: Cache hit — tốc độ tìm kiếm lần 2

**Nền tảng:** `[API]`

**SD Concept:** Caching Layer — Redis TTL cache cho search results

**Bước thực hiện:**
```bash
# Lần 1 — hit Elasticsearch
curl "localhost:8080/api/v1/hotels/search?q=Hanoi" -w "\nTime: %{time_total}s\n"

# Lần 2 — hit Redis cache (same query trong 5 phút)
curl "localhost:8080/api/v1/hotels/search?q=Hanoi" -w "\nTime: %{time_total}s\n"
```

**Verify:**
- [ ] Lần 2 nhanh hơn rõ rệt (Redis ~1ms vs Elasticsearch ~20-50ms)
- [ ] Kiểm tra Redis Commander (`localhost:8082`) — key `search:...` tồn tại với TTL

---

## Epic C — Inventory Service

> **SD Concept**: Inventory Service — theo dõi room availability real-time

### C-1: Owner set inventory cho phòng

**Nền tảng:** `[API]` `[Web]`

**User Story:** Là hotel owner, tôi muốn set số lượng phòng available cho từng ngày để kiểm soát overbooking.

**Bước thực hiện:**
```bash
# Login lấy token owner
TOKEN=$(curl -s -X POST localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"owner@stayease.com","password":"Owner123!"}' \
  | jq -r '.data.access_token')

# Set inventory: phòng 1, ngày mai, 3 phòng available
curl -X PUT localhost:8080/api/v1/owner/rooms/1/inventory \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"date":"2026-05-24","total_rooms":3,"available_rooms":3}'
```

**Verify:**
- [ ] `200 OK` với inventory record
- [ ] `GET /owner/rooms/1/inventory` phản ánh số mới

---

### C-2: Inventory giảm sau khi booking thành công

**SD Concept:** Inventory Service — atomic inventory deduction

**Bước thực hiện:**
1. Set 3 phòng available cho ngày mai (C-1)
2. Đặt 1 phòng (D-1 bên dưới)
3. Check inventory lại

**Verify:**
- [ ] Inventory giảm từ 3 → 2 (transaction atomic)
- [ ] Nếu cancel booking → inventory tăng lại về 3

---

## Epic D — Booking Service & Concurrency

> **SD Concept**: Booking Service (ACID), Distributed Locking, Double-booking Prevention

### D-1: Đặt phòng thông thường

**Nền tảng:** `[Mobile]`

**User Story:** Là khách du lịch, tôi muốn đặt phòng và nhận xác nhận booking để có chỗ lưu trú.

**Bước thực hiện:**
1. Từ hotel detail → chọn phòng → "Select Room"
2. Booking form: chọn ngày (MiniCalendar), số khách
3. Nhấn "Continue to Review"
4. Review & Pay screen: xác nhận thông tin, nhập card (mock)
5. Nhấn "Confirm Booking"

**Verify:**
- [ ] `201 Created` — booking với `status: pending`
- [ ] Redirect sang Processing screen
- [ ] Animated steps: Confirming → Processing Payment → Finalizing
- [ ] Status poll `GET /bookings/:id/status` mỗi 2s
- [ ] Cuối cùng: `confirmed` → Confirmation screen

**API:** `POST /api/v1/bookings` → `POST /api/v1/checkout` → `GET /api/v1/bookings/:id/status`

---

### D-2: Xem danh sách booking của tôi

**Nền tảng:** `[Mobile]`

**User Story:** Là khách du lịch, tôi muốn xem lại tất cả booking đã đặt với trạng thái hiện tại.

**Bước thực hiện:**
1. Tab "Bookings" (My Bookings)
2. Xem tab filter: All / Upcoming / Past

**Verify:**
- [ ] Booking vừa tạo xuất hiện với status badge
- [ ] Filter "Upcoming" chỉ show booking trong tương lai
- [ ] Mỗi item có: tên hotel, ngày, status-colored left strip

**API:** `GET /api/v1/bookings`

---

### D-3: Huỷ booking

**Nền tảng:** `[Mobile]`

**User Story:** Là khách du lịch, tôi muốn hủy booking khi kế hoạch thay đổi.

**Bước thực hiện:**
1. Vào booking detail
2. Nhấn "Cancel Booking"
3. Xác nhận dialog

**Verify:**
- [ ] Status chuyển thành `cancelled`
- [ ] Inventory được hoàn lại (C-2)
- [ ] Notification xuất hiện: "Booking #xxx đã được hủy"

**API:** `DELETE /api/v1/bookings/:id`

---

### D-4: Double-booking Prevention — Concurrent requests

**SD Concept:** Distributed Locking (Redis SETNX + Lua), Database ACID Transaction

**Đây là core system design demo — quan trọng nhất.**

**Bước thực hiện (Terminal):**
```bash
# Login lấy 2 token khác nhau (guest1, guest2)
T1="<token_guest1>"
T2="<token_guest2>"

# Gửi 2 request đặt CÙNG phòng, CÙNG ngày, ĐỒNG THỜI
curl -s -X POST localhost:8080/api/v1/bookings \
  -H "Authorization: Bearer $T1" \
  -H "Content-Type: application/json" \
  -d '{"room_id":1,"check_in":"2026-06-01","check_out":"2026-06-03","guests":2}' &

curl -s -X POST localhost:8080/api/v1/bookings \
  -H "Authorization: Bearer $T2" \
  -H "Content-Type: application/json" \
  -d '{"room_id":1,"check_in":"2026-06-01","check_out":"2026-06-03","guests":2}' &

wait
```

**Verify:**
- [ ] 1 request nhận `201 Created`
- [ ] 1 request nhận `409 Conflict` — `{"error": "room not available"}`
- [ ] Database chỉ có 1 booking record cho room+date đó
- [ ] Redis lock key `lock:room:1:2026-06-01` bị xóa sau khi xử lý xong
- [ ] `[Mobile]` Guest 2 thấy `ConflictRetryModal` với nút "Try Again" / "Find Alternative"

**Xem lock trong Redis:**
```bash
redis-cli -h localhost monitor | grep "lock:room"
```

---

### D-5: Load test concurrent bookings

**SD Concept:** Rate Limiting, Concurrency at Scale

**Bước thực hiện:**
```bash
cd backend && make load-test
```

**Verify:**
- [ ] k6 report: error rate < 1% (409 không tính là error)
- [ ] Không có duplicate booking nào trong DB
- [ ] Grafana "Business Metrics" dashboard: `booking_conflicts_total` tăng theo đúng số lần conflict
- [ ] Rate limiter: sau 100 req/min → 429 Too Many Requests

---

## Epic E — Payment Saga

> **SD Concept**: Payment Service, Choreography Saga, Event-Driven Architecture, Outbox Pattern

### E-1: Happy path — Payment thành công

**Nền tảng:** `[Mobile]` `[API]`

**User Story:** Là khách du lịch, tôi muốn thanh toán và nhận xác nhận ngay lập tức.

**Bước thực hiện:**
1. Sau khi tạo booking (D-1) với `status: pending`
2. `POST /checkout` để khởi động saga
3. Quan sát status transitions trên Processing screen

**Verify — State Machine:**
```
pending → awaiting_payment → confirmed
```
- [ ] `POST /checkout` → booking.status = `awaiting_payment`
- [ ] Worker nhận event `payment.initiated` từ RabbitMQ
- [ ] Worker xử lý (80% success) → publish `payment.succeeded`
- [ ] SagaOrchestrator cập nhật booking.status = `confirmed`
- [ ] WebSocket push `booking_status_updated` về mobile
- [ ] Processing screen hiển thị "Booking Confirmed!" với confetti

**API:** `POST /api/v1/checkout` → `GET /api/v1/bookings/:id/status`

---

### E-2: Payment thất bại — Compensating transaction

**SD Concept:** Saga Compensation — rollback khi payment fail

**Bước thực hiện:**
```bash
# Gọi checkout nhiều lần cho đến khi gặp fail (15% chance)
# Hoặc mock fail bằng cách tắt worker giữa chừng
```

**Verify — State Machine:**
```
pending → awaiting_payment → failed
```
- [ ] booking.status = `failed`
- [ ] Inventory được hoàn lại (compensation)
- [ ] Notification: "Payment failed. Please try again."
- [ ] `[Mobile]` Processing screen hiển thị "Payment Failed" với retry option

---

### E-3: Payment timeout — Saga timeout handling

**SD Concept:** Saga Timeout, Eventual Consistency

**Verify — State Machine:**
```
pending → awaiting_payment → cancelled (timeout)
```
- [ ] 5% chance worker xử lý quá lâu → saga timeout
- [ ] booking.status = `cancelled`
- [ ] Inventory compensation xảy ra
- [ ] Notification timeout gửi đến user

---

### E-4: Xem payment detail

**Nền tảng:** `[API]`

**Bước thực hiện:**
```bash
curl localhost:8080/api/v1/payments/:id \
  -H "Authorization: Bearer $TOKEN"
```

**Verify:**
- [ ] Trả về payment record với: amount, status, gateway_ref, timestamps
- [ ] `GET /bookings/:id` cũng include payment summary

---

## Epic F — Real-time Notifications & WebSocket

> **SD Concept**: Notification Service, WebSocket, Event-Driven Push

### F-1: Nhận booking status update real-time

**Nền tảng:** `[Mobile]`

**User Story:** Là khách du lịch, tôi muốn biết ngay khi booking được xác nhận mà không cần reload app.

**Bước thực hiện:**
1. Đặt phòng (D-1)
2. Quan sát Processing screen — không reload thủ công

**Verify:**
- [ ] WS message `booking_status_updated` nhận được trong < 3s sau khi worker xử lý
- [ ] Processing screen tự cập nhật từ "Processing Payment" → "Confirmed"
- [ ] Notification badge (+1) xuất hiện trên bell icon

**Debug WS:**
```bash
# Xem WS messages trong browser
# Chrome DevTools → Network → WS → /ws/bookings
```

---

### F-2: Xem danh sách notifications

**Nền tảng:** `[Mobile]`

**User Story:** Là người dùng, tôi muốn xem lại tất cả thông báo để không bỏ lỡ update nào.

**Bước thực hiện:**
1. Tap bell icon hoặc Notifications tab
2. Xem danh sách notifications

**Verify:**
- [ ] Hiển thị: type icon, tiêu đề, thời gian relative ("2 minutes ago")
- [ ] Unread notifications có background khác biệt
- [ ] Tap notification → mark as read, unread count giảm
- [ ] "Mark all as read" button

**API:** `GET /api/v1/notifications` + `PUT /api/v1/notifications/read-all`

---

### F-3: WebSocket One-Time Ticket (Production security)

**SD Concept:** Secure WebSocket without exposing JWT in URL

**Bước thực hiện:**
```bash
# Step 1: Get ticket
TICKET=$(curl -s -X POST localhost:8080/api/v1/ws/ticket \
  -H "Authorization: Bearer $TOKEN" | jq -r '.data.ticket')

# Step 2: Connect WS với ticket (không dùng JWT trực tiếp)
wscat -c "ws://localhost:8080/api/v1/ws/bookings?ticket=$TICKET"
```

**Verify:**
- [ ] Ticket chỉ dùng được 1 lần (30s TTL trong Redis)
- [ ] Dùng lại ticket → `401 Unauthorized`
- [ ] JWT không lộ trong URL (không bị log bởi server, proxy, browser history)

---

## Epic G — Reviews System

> **SD Concept**: Post-stay engagement, verified reviews (chỉ booking confirmed)

### G-1: Viết review sau khi ở

**Nền tảng:** `[Mobile]`

**User Story:** Là khách du lịch, tôi muốn để lại đánh giá sau khi ở để giúp khách khác.

**Điều kiện:** Booking phải có status `confirmed`.

**Bước thực hiện:**
1. Booking detail screen → "Leave a Review"
2. Rating: 1–5 sao (tap)
3. Comment: tối thiểu 10 ký tự
4. Submit

**Verify:**
- [ ] `201 Created` — review được tạo
- [ ] Hotel average rating cập nhật ngay
- [ ] Guest KHÔNG có booking confirmed → `403 Forbidden`

**API:** `POST /api/v1/hotels/:id/reviews`

---

### G-2: Xem reviews của khách sạn

**Nền tảng:** `[Mobile]`

**Bước thực hiện:**
1. Hotel detail screen → Reviews section

**Verify:**
- [ ] Danh sách reviews với: tên khách, rating, comment, ngày
- [ ] Average rating hiển thị đúng (trung bình của tất cả reviews)
- [ ] Public API — không cần đăng nhập

**API:** `GET /api/v1/hotels/:id/reviews`

---

### G-3: Sửa / Xoá review của mình

**Nền tảng:** `[API]`

```bash
# Update
curl -X PUT localhost:8080/api/v1/reviews/:id \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"rating":4,"comment":"Updated review"}'

# Delete
curl -X DELETE localhost:8080/api/v1/reviews/:id \
  -H "Authorization: Bearer $TOKEN"
```

**Verify:**
- [ ] Chỉ author mới update/delete được review của mình
- [ ] Người khác → `403 Forbidden`

---

## Epic H — Owner Management Portal

> **SD Concept**: Hotel Inventory Management, Revenue Analytics

### H-1: Tạo khách sạn mới

**Nền tảng:** `[Web]` `[API]`

**User Story:** Là hotel owner, tôi muốn đăng ký khách sạn của mình lên platform để tiếp cận khách hàng.

**Bước thực hiện (Web):**
1. Login với `owner@stayease.com`
2. Sidebar → Properties → "Add New Property"
3. Điền: tên, địa chỉ, thành phố, mô tả, số sao
4. Submit

**Verify:**
- [ ] Hotel tạo xong với `status: pending` (cần Admin duyệt)
- [ ] Xuất hiện trong danh sách Properties với badge "Pending Approval"
- [ ] Admin nhận notification có hotel mới cần duyệt

**API:** `POST /api/v1/owner/hotels`

---

### H-2: Quản lý phòng

**Nền tảng:** `[Web]`

**User Story:** Là hotel owner, tôi muốn thêm/sửa/xóa phòng và set giá để quản lý inventory.

**Bước thực hiện:**
1. Properties → chọn hotel → Rooms tab
2. "Add Room": type, price_per_night, description, max_guests
3. Set inventory: chọn date range → số phòng available

**Verify:**
- [ ] Room created → `201 Created`
- [ ] Inventory set cho từng ngày
- [ ] `PUT /owner/rooms/:id` update thành công
- [ ] `DELETE /owner/rooms/:id` → room bị xóa

---

### H-3: Xem danh sách reservations

**Nền tảng:** `[Web]` `[Mobile]`

**User Story:** Là hotel owner, tôi muốn xem tất cả đặt phòng tại khách sạn của mình để chuẩn bị đón khách.

**Bước thực hiện (Web):**
1. Sidebar → Reservations
2. Filter theo status: All / Pending / Confirmed / Cancelled
3. Phân trang

**Verify:**
- [ ] Chỉ thấy bookings của hotel mình (JOIN query: booking → room → hotel WHERE owner_id)
- [ ] Filter status hoạt động đúng
- [ ] Pagination: 10 items/trang
- [ ] Click vào row → reservation detail với timeline, guest info

**API:** `GET /api/v1/owner/bookings?status=confirmed&page=1&limit=10`

---

### H-4: Owner Dashboard — KPIs

**Nền tảng:** `[Web]`

**User Story:** Là hotel owner, tôi muốn xem tổng quan doanh thu và tình trạng hoạt động của khách sạn.

**Bước thực hiện:**
1. Sidebar → Dashboard

**Verify:**
- [ ] KPI cards: Total Bookings, Revenue, Occupancy Rate, Avg Rating
- [ ] Charts: booking trend, revenue by month
- [ ] Recent reservations list

---

## Epic I — Admin Platform Oversight

> **SD Concept**: Admin Control Plane, Platform Health Monitoring, DLQ Management

### I-1: Duyệt / Từ chối khách sạn

**Nền tảng:** `[Web]` `[Mobile]`

**User Story:** Là admin, tôi muốn review và approve các khách sạn mới trước khi chúng xuất hiện trên platform.

**Bước thực hiện (Web):**
1. Login với `admin@stayease.com`
2. Sidebar → Hotels → "Pending Approval" tab
3. Click vào hotel → Hotel Review page
4. Kiểm tra thông tin, approval checklist
5. Nhấn "Approve" hoặc "Reject with reason"

**Verify:**
- [ ] Approve → hotel.status = `active` → xuất hiện trong search
- [ ] Reject → hotel.status = `rejected` + reason lưu lại
- [ ] Owner nhận notification về kết quả

**API:** `GET /api/v1/admin/hotels/pending` → `PUT /api/v1/admin/hotels/:id/approve`

---

### I-2: Quản lý users

**Nền tảng:** `[Web]`

**User Story:** Là admin, tôi muốn quản lý users (đổi role, deactivate) để kiểm soát platform.

**Bước thực hiện:**
1. Sidebar → Users
2. Tìm user theo email
3. Xem user detail: role, activity history
4. Đổi role: Guest → Owner (cấp quyền đăng khách sạn)
5. Deactivate user vi phạm

**Verify:**
- [ ] `PUT /admin/users/:id/role` → role thay đổi ngay
- [ ] `PUT /admin/users/:id/deactivate` → user không đăng nhập được nữa (401)
- [ ] Danh sách users có pagination + search

---

### I-3: Xem tất cả bookings trên platform

**Nền tảng:** `[Web]`

**User Story:** Là admin, tôi muốn có cái nhìn tổng quan toàn bộ giao dịch trên platform.

**Bước thực hiện:**
1. Sidebar → Bookings
2. Filter: status, date range, hotel

**Verify:**
- [ ] Thấy bookings của TẤT CẢ users (khác với owner chỉ thấy của mình)
- [ ] Filter combinations hoạt động
- [ ] Export data (nếu có)

**API:** `GET /api/v1/admin/bookings`

---

### I-4: Quản lý Dead Letter Queue (DLQ)

**Nền tảng:** `[Web]`

**SD Concept:** DLQ — xử lý event failures, Idempotency

**User Story:** Là admin, tôi muốn xem và retry các event xử lý thất bại để đảm bảo không mất dữ liệu.

**Bước thực hiện:**
1. Sidebar → System → Dead Letter Queue
2. Xem danh sách failed events
3. Click vào event → xem payload
4. Nhấn "Retry" để reprocess

**Verify:**
- [ ] DLQ list: event_type, error_message, retry_count, created_at
- [ ] Payload viewer (JSON formatted)
- [ ] Retry thành công → event biến mất khỏi DLQ
- [ ] Idempotency: retry cùng event không tạo duplicate booking

**API:** `GET /api/v1/admin/events/dlq` → `POST /api/v1/admin/events/dlq/:id/retry`

---

### I-5: System Health Monitor

**Nền tảng:** `[Web]` `[Mobile]`

**SD Concept:** Health Checks — live/ready/startup probes (Kubernetes-ready)

**Bước thực hiện (Web):**
1. Sidebar → System → Health

**Verify:**
- [ ] Services status: PostgreSQL, Redis, Elasticsearch, RabbitMQ
- [ ] Response time cho từng service
- [ ] `/health/live` → 200 OK (liveness probe)
- [ ] `/health/ready` → 200 OK (readiness probe — check DB/Redis connections)
- [ ] Tắt Redis → `/health/ready` trả về 503

**API:** `GET /api/v1/admin/system/health`

---

### I-6: Platform Analytics

**Nền tảng:** `[Web]`

**User Story:** Là admin, tôi muốn xem metrics tổng quan để đưa ra quyết định kinh doanh.

**Bước thực hiện:**
1. Sidebar → Analytics

**Verify:**
- [ ] User growth chart (theo tháng)
- [ ] Booking volume trend
- [ ] Geographic distribution (pie chart)
- [ ] ADR (Average Daily Rate) trend
- [ ] Revenue metrics

---

## Epic J — Chat & Messaging

> **SD Concept**: Real-time messaging, WebSocket broadcast

### J-1: Guest nhắn tin hỏi Owner

**Nền tảng:** `[Mobile]`

**User Story:** Là khách du lịch, tôi muốn hỏi trực tiếp owner về tiện ích phòng trước khi đặt.

**Bước thực hiện:**
1. Tab Messages → "New Conversation"
2. Chọn khách sạn/owner
3. Gửi tin nhắn

**Verify:**
- [ ] Tin nhắn xuất hiện real-time (WebSocket)
- [ ] Owner nhận notification + unread badge
- [ ] Conversation list sorted by latest message

**API:** `POST /api/v1/conversations` → `POST /api/v1/conversations/:id/messages`

---

### J-2: Owner reply cho Guest

**Nền tảng:** `[Web]`

**Bước thực hiện:**
1. Owner login web
2. Sidebar → Messages
3. Thấy tin nhắn mới từ guest
4. Reply

**Verify:**
- [ ] ChatPanel split-pane: conversation list bên trái, messages bên phải
- [ ] Guest nhận reply real-time trên mobile
- [ ] Read receipts (mark as read khi mở conversation)

---

### J-3: Admin broadcast thông báo toàn platform

**Nền tảng:** `[Web]`

**SD Concept:** Broadcast — 1 message đến tất cả connected users

**Bước thực hiện:**
1. Admin login web
2. Messages → Broadcast
3. Nhập nội dung thông báo hệ thống
4. Send

**Verify:**
- [ ] Tất cả user đang online nhận được message qua WS
- [ ] Message type: `system_announcement`

**API:** `POST /api/v1/admin/broadcast`

---

## Epic K — Observability & System Health

> **SD Concept**: Monitoring, Distributed Tracing, Log Aggregation — production-grade observability

### K-1: Prometheus Metrics — Business KPIs

**Nền tảng:** Grafana `localhost:3000`

**Bước thực hiện:**
1. Mở Grafana → Dashboard "Business Metrics"
2. Thực hiện một vài bookings và conflicts (D-1, D-4)
3. Quan sát metrics tăng real-time

**Verify:**
- [ ] `booking_created_total` tăng theo số booking
- [ ] `booking_conflicts_total` tăng khi có 409 Conflict
- [ ] Grafana auto-refresh mỗi 10s

---

### K-2: API Performance Dashboard

**Nền tảng:** Grafana `localhost:3000`

**Bước thực hiện:**
1. Dashboard "API Overview"
2. Gửi nhiều requests (search, booking)

**Verify:**
- [ ] Request rate (req/min)
- [ ] P50/P95/P99 latency
- [ ] Error rate (4xx, 5xx)
- [ ] Active goroutines

---

### K-3: Distributed Tracing với Jaeger

**Nền tảng:** Jaeger `localhost:16686`

**SD Concept:** Distributed Tracing — trace request qua nhiều services

**Bước thực hiện:**
1. Tạo 1 booking (D-1)
2. Mở Jaeger UI → Service: `stayease-api`
3. Tìm trace của request đó

**Verify:**
- [ ] Trace hiển thị: HTTP handler → Service → Repository → DB
- [ ] Duration từng bước
- [ ] Trace ID khớp với `X-Correlation-ID` header trong response

---

### K-4: Log Aggregation với Loki

**Nền tảng:** Grafana → Explore → Loki

**Bước thực hiện:**
1. Grafana → Explore → chọn datasource Loki
2. Query: `{container="stayease-api"} |= "booking"`

**Verify:**
- [ ] Structured JSON logs (Zap)
- [ ] Mỗi log có: level, timestamp, correlation_id, user_id, method, path
- [ ] Filter theo level: `|= "ERROR"` để tìm lỗi

---

### K-5: Rate Limiting Demo

**SD Concept:** API Gateway Rate Limiting

**Bước thực hiện:**
```bash
# Gửi 101 requests liên tiếp (limit: 100/min cho public)
for i in {1..101}; do
  curl -s -o /dev/null -w "%{http_code}\n" \
    "localhost:8080/api/v1/hotels/search?q=test"
done | sort | uniq -c
```

**Verify:**
- [ ] 100 requests: `200 OK`
- [ ] Request 101+: `429 Too Many Requests`
- [ ] Per-user rate limit: booking endpoint có thêm 1 lớp limit theo userID

---

## Kịch bản End-to-End

> Chạy toàn bộ flow từ đầu đến cuối để demo system design hoàn chỉnh.

### E2E-1: Full Booking Journey (Guest)

```
[Mobile] Guest → Login → Search hotel → View detail → Select room
       → Booking form → Review & Pay → Processing screen (WebSocket)
       → Confirmed → Notification received → View in My Bookings
       → Write review
```

**SD Concepts covered:** Search Service, Inventory Service, Booking Service,
Distributed Locking, Payment Saga, WebSocket Notification, Reviews

---

### E2E-2: Concurrent Booking Race Condition

```
[Terminal] 2 users đặt cùng phòng cùng ngày đồng thời
         → 1 user: 201 Created + payment flow → confirmed
         → 1 user: 409 Conflict → [Mobile] ConflictRetryModal
         → User 2 retry → lần này available (user 1 cancel) → success
```

**SD Concepts covered:** Distributed Locking, Double-booking Prevention,
Concurrency Control, Graceful Conflict UX

---

### E2E-3: Hotel Onboarding (Owner → Admin → Guest)

```
[Web/Owner] Owner login → Create hotel → Add rooms → Set inventory
[Web/Admin] Admin login → Pending hotels → Review → Approve
[Mobile/Guest] Search → Hotel now visible → Book room
```

**SD Concepts covered:** RBAC, Approval Workflow, Inventory Service,
Real-time Notifications

---

### E2E-4: Payment Failure Recovery

```
[Mobile] Guest books room → checkout → payment fails (15% probability)
       → Notification: "Payment failed"
       → Guest sees failed status in My Bookings
       → Inventory đã được hoàn lại (check via owner inventory view)
       → Guest đặt lại → success
```

**SD Concepts covered:** Saga Compensation, Eventual Consistency,
Inventory Rollback, Notification Service

---

### E2E-5: System Observability

```
[Terminal] Run load test: make load-test
[Grafana]  Watch real-time: booking_created_total, conflicts, latency P95
[Jaeger]   Trace một booking request
[Loki]     Search logs: "ErrConflict"
[Grafana]  Alert firing khi error rate > 5%
```

**SD Concepts covered:** Monitoring, Distributed Tracing, Log Aggregation,
Alerting, SLA tracking

---

## Ma trận System Design vs Implementation

| System Design Concept       | Implemented | Demo ở Story     |
|-----------------------------|-------------|------------------|
| Prevent double-booking      | ✅ Redis Lock + ACID | D-4, D-5    |
| Search Service (tách biệt)  | ✅ Elasticsearch    | B-1, B-2, B-4 |
| Caching Layer               | ✅ Redis TTL        | B-4           |
| Inventory Service           | ✅ Atomic deduction | C-1, C-2      |
| Booking Service (ACID)      | ✅ database/sql Tx  | D-1, D-4      |
| Payment Processing          | ✅ Saga Pattern     | E-1, E-2, E-3 |
| Notification Service        | ✅ WS + Persistent  | F-1, F-2      |
| API Gateway (rate limit)    | ✅ Redis-based      | K-5           |
| Authentication / RBAC       | ✅ JWT + 3 roles    | A-1 → A-4     |
| Analytics Pipeline          | ✅ Prometheus       | K-1, K-2, I-6 |
| Distributed Tracing         | ✅ Jaeger/OTel      | K-3           |
| Log Aggregation             | ✅ Loki + Promtail  | K-4           |
| Health Probes (K8s-ready)   | ✅ live/ready/startup | I-5         |
| DLQ / Event Retry           | ✅ Outbox + retry   | I-4           |
| Real-time Chat              | ✅ WebSocket Hub    | J-1, J-2, J-3 |
| CDN Layer                   | ❌ Not implemented  | —             |
| Email/SMS Notification      | ❌ Not implemented  | —             |
| Multi-region deployment     | ❌ Not implemented  | —             |
