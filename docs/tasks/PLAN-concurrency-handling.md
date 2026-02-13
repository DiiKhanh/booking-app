# PLAN-concurrency-handling.md - Distributed Locking for Booking System

> **Status**: ✅ COMPLETED (2026-02-14)
> **Goal**: Implement distributed locking to prevent race conditions in the hotel booking system.
> **Owner**: Backend Specialist

---

## 🟢 Phase 1: Verification (Baseline)
**Objective**: Confirm the race condition exists in the current naive implementation.
- [x] **1.1 Start Infrastructure**: Ensure Postgres and Redis are running (`docker compose up -d`).
- [x] **1.2 Reset Database**: Clean and seed the database with initial inventory (`make dropdb`, `make createdb`, `make migrate`).
- [x] **1.3 Start Server**: Run the API server (`make server`).
- [x] **1.4 Run Load Test**: Execute k6 script (`make load-test`) to simulate 20 concurrent users.
- [x] **1.5 Analyze Results**: Verified overbooking occurred with naive implementation (multiple 201s for 1 inventory slot).

> **Note**: During first load test run, discovered that `user_id` in DB is `UUID` type but k6 test was sending plain strings (e.g., `user_1_0`). Fixed k6 test to generate proper UUID v4 strings.

## 🟡 Phase 2: Redis Integration
**Objective**: Integrate Redis client into the Go backend.
- [x] **2.1 Add Dependency**: Add `github.com/redis/go-redis/v9` to `go.mod`.
- [x] **2.2 Initialize Redis**: Update `cmd/api/main.go` to connect to Redis and pass the client to `repository.NewBookingRepo`.
- [x] **2.3 Update Structs**: Add `*redis.Client` field to `BookingRepo` struct.

## 🔵 Phase 3: Distributed Lock Implementation
**Objective**: Implement the locking mechanism using Redis to enforce serial access to inventory.
- [x] **3.1 Define Lock Key**: Created unique lock key format: `lock:room:{roomID}:{date}`.
- [x] **3.2 Implement Acquire Lock**: Used `SETNX` with TTL (5s) and retry logic (50ms × 10 retries).
- [x] **3.3 Implement Release Lock**: Used Lua script (atomic check-and-delete) in `defer` block.
- [x] **3.4 Refactor CreateBooking**:
  1. Acquire Lock for the specific room/date range.
  2. Perform existing Transaction (Check → Sleep → Update → Insert).
  3. Release Lock.

## 🔴 Phase 4: Validation (Fix Verification)
**Objective**: Prove the fix works under load.
- [x] **4.1 Reset Database**: `docker exec booking-postgres dropdb/createdb` + `go run cmd/migration_tool/main.go`.
- [x] **4.2 Restart Server**: With new locking logic.
- [x] **4.3 Run Load Test**: Executed `k6 run tests/k6/load_test.js` with 20 VUs.
- [x] **4.4 Verify Results**:
  - ✅ **Success**: Exactly **1** booking returned 201 Created.
  - ✅ **Failures**: **19** bookings returned 409 Conflict.
  - ✅ **Server Errors**: **0** — no 500 errors.
  - ✅ **Data Integrity**: DB `inventory` table shows `booked_count = 1`.
  - ✅ **DB Validation**: `bookings` table has exactly 1 row with `status = 'confirmed'`.

---

## 📝 Verification Results (2026-02-14)

### Server Logs
```
🔒 Lock acquired: key=lock:room:1:2024-12-25 value=1771008137653xxx
✅ Booking created: id=1, user=<uuid>, room=1, date=2024-12-25
🔓 Lock released: key=lock:room:1:2024-12-25
```
- All other 19 requests either:
  - Acquired the lock → found `booked_count >= total_inventory` → 409 Conflict
  - Failed to acquire lock after 10 retries → 409 Conflict

### Database State
```sql
-- inventory: exactly 1 room booked
SELECT * FROM inventory WHERE room_id = 1 AND date = '2024-12-25';
-- booked_count = 1, total_inventory = 1 ✅

-- bookings: exactly 1 booking
SELECT COUNT(*) FROM bookings;
-- 1 row, status = 'confirmed' ✅
```

### Bug Fix During Verification
- **Issue**: k6 test sent non-UUID `user_id` strings (e.g., `user_1_0`) but DB column is `UUID` type.
- **Fix**: Updated `tests/k6/load_test.js` to generate proper UUID v4 using `uuidv4()` helper function.
- **File**: `tests/k6/load_test.js`
