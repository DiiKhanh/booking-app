# Task Plan: Booking System (Concurrency Master)

## 📌 Phase 1: Backend Foundation (Golang & DB) - [COMPLETED]
- [x] **1.1 Setup Workspace**: Initialize Go module, create folder structure (cmd, internal, migrations).
- [x] **1.2 Database & Docker**: Setup PostgreSQL and Redis using `docker-compose.yml`.
- [x] **1.3 Database Schema**: Design schema for `hotels`, `rooms`, `inventory`, `bookings`. Run migrations.
- [x] **1.4 Basic API**: Implement GET `/hotels/{id}` and POST `/bookings` using Gin framework.
  - *Note*: Intentionally implement a naive scalable solution first to demonstrate the problem. 

## ⚡ Phase 2: The Concurrency Challenge (Core Feature) - [COMPLETED ✅ 2026-02-14]
- [x] **2.1 Simulate Race Condition**: Added 200ms artificial delay in booking logic (`time.Sleep(200ms)`) to widen race window.
- [x] **2.2 Load Testing (k6)**: Created k6 script simulating 20 concurrent users booking 1 room (`tests/k6/load_test.js`).
- [ ] ~~**2.3 Fix It (Option 1)**: Implement Pessimistic Locking (`SELECT ... FOR UPDATE`).~~ *(Skipped — chose Option 3)*
- [ ] ~~**2.4 Fix It (Option 2)**: Implement Optimistic Locking (Version column).~~ *(Skipped — chose Option 3)*
- [x] **2.5 Fix It (Option 3 - Recommended)**: Implement Distributed Locking with Redis.
  - Redis SETNX with TTL (5s) for lock acquisition
  - Lua script for atomic lock release (safe ownership check)
  - Retry logic: 50ms × 10 retries before failing
  - Lock key format: `lock:room:{roomID}:{date}`
- [x] **2.6 Verify Fix**: k6 results confirmed **zero overbookings**:
  - ✅ 1 × 201 Created (successful booking)
  - ✅ 19 × 409 Conflict (correctly rejected)
  - ✅ 0 × 500 Server Error
  - ✅ DB: `booked_count = 1`, `bookings` table = 1 row

### Key Files Modified (Phase 2):
| File | Change |
|------|--------|
| `backend/internal/repository/booking_repo.go` | Added `AcquireLock`, `ReleaseLock`, refactored `CreateBooking` with distributed lock flow |
| `backend/internal/handler/booking_handler.go` | Added `isConflictError()` helper, returns 409 for lock/availability failures |
| `backend/cmd/api/main.go` | Added Redis client initialization, passed to BookingRepo |
| `backend/internal/config/config.go` | Added `RedisAddr`, `RedisPassword` fields |
| `backend/docker-compose.yml` | Added Redis, Adminer (DB UI), Redis Commander (Redis UI) services |
| `tests/k6/load_test.js` | Added UUID v4 generator, custom metrics, handleSummary reporter |

## 🌐 Phase 3: Frontend Integration (Next.js & React Native)
- [ ] **3.1 Next.js Setup**: Initialize Next.js project.
- [ ] **3.2 Booking UI**: Create a simple page to view a hotel and book it.
- [ ] **3.3 React Native Setup**: Initialize React Native project (Expo).
- [ ] **3.4 Mobile Booking UI**: Replicate the booking flow on mobile.
- [ ] **3.5 Real-time Updates**: Implement polling or WebSocket to update room availability.

## 🚀 Phase 4: DevOps & CI/CD
- [ ] **4.1 Dockerize App**: Create `Dockerfile` for the Go backend.
- [ ] **4.2 CI Pipeline**: Setup GitHub Actions to run tests and build Docker image.
- [ ] **4.3 Monitoring**: Add Prometheus metrics to track booking success/fail rates.
