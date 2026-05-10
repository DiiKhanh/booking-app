# CLAUDE.md
This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

---

## Project Overview

**StayEase** — Hotel Booking Platform. Monorepo with three sub-projects:
- `backend/` — Go 1.21 REST API (Gin, PostgreSQL, Redis)
- `web/` — Next.js 15 management portal (Hotel Owner + Admin roles)
- `mobile/` — React Native Expo app (Guest, Owner, Admin roles)

**Current Phase**: Phase 1 complete (Concurrency & Distributed Locking). Moving into web/mobile UI build.

Always check `docs/tasks/PLAN-*.md` before modifying code to align with the active phase plan.

---

## Commands

### DevOps (Monitoring stack)

```bash
cd devops

docker compose up -d       # Start full stack (infra + Prometheus + Grafana + Loki + Jaeger)
docker compose down        # Stop everything
docker compose logs -f     # Follow logs for all services
```

> Use `devops/docker-compose.yml` when you need observability (Grafana dashboards, log search, traces).
> Use `backend/docker-compose.yml` (via `make infra-up`) for lightweight dev without monitoring overhead.

### Backend (Go)

```bash
cd backend

# Infrastructure (dev-only, no monitoring)
make infra-up        # Start Postgres + Redis + Elasticsearch + RabbitMQ + UI tools
make infra-down      # Stop all infra

# Database
make createdb        # Create booking_db
make migrate         # Run migrations
make reset-db        # Full DB reset

# Development
make server          # Start API server (reads .env) — exposes :8080/metrics for Prometheus
make tidy            # go mod tidy

# Testing
make test            # Run Go unit tests
make load-test       # k6 load test (requires infra running)
```

Run a single Go test:
```bash
cd backend && go test ./internal/service/... -run TestBookingService -v
```

### Web (Next.js)

```bash
cd web
npm run dev          # Start dev server
npm run build        # Production build
npm run lint         # ESLint
```

### Mobile (Expo)

```bash
cd mobile
npm start            # Expo dev server
npm run ios          # iOS simulator
npm run android      # Android emulator
npm run lint         # TypeScript type check (tsc --noEmit)
npm run reset        # Clear Expo cache and restart
```

---

## Architecture

### Backend — Layered (Handler → Service → Repository → Domain)

```
cmd/api/main.go          # Dependency injection, graceful shutdown
internal/
  domain/                # Sentinel errors, core models (Booking, Hotel, Room, Inventory)
  handler/               # HTTP request parsing, response formatting
  service/               # Business logic (validation, orchestration)
  repository/            # DB operations + distributed locking
  infrastructure/redis/  # Redis SETNX distributed lock (Lua atomic release)
  middleware/            # Recovery, CorrelationID, RequestLogger (Zap)
  router/                # Route registration
  config/                # 12-factor env config
  dto/                   # APIResponse envelope {success, data, error, meta}
```

**Distributed Locking pattern**: `lock:room:{roomID}:{date}` key with 5s TTL, 10 retries at 50ms. Lua script for atomic check-and-delete on release. See `internal/infrastructure/redis/distributed_lock.go`.

**Error handling**: Domain sentinel errors (`ErrNotFound`, `ErrConflict`, `ErrLockFailed`) map to HTTP status codes in the handler layer. Never panic in handlers — recovery middleware catches all panics.

**All API responses use the standard envelope**:
```json
{"success": true, "data": {...}, "error": null, "meta": {"total": 100}}
```

### Web — Next.js App Router

- Route groups: `(auth)/`, `(owner)/`, `(admin)/` — each with its own sidebar layout
- `middleware.ts` handles role-based redirects (JWT role claim)
- `stores/` — Zustand for auth, sidebar, notifications
- `services/api.ts` — Axios instance with JWT interceptor + auto-refresh
- All colors via CSS variables (`--primary`, `--accent`, `--chart-*`) — never hardcoded, required for dark mode
- `next-themes` for Light/Dark/System toggle with `suppressHydrationWarning`

### Mobile — Expo Router

- File-based routing mirrors web structure: `(auth)/`, `(guest)/`, `(owner)/`, `(admin)/`
- Tokens stored in `expo-secure-store` (not AsyncStorage)
- Same Axios + Zustand + React Query pattern as web
- `NativeWind` for Tailwind styling (shares tokens with web where possible)
- **409 Conflict UX**: When booking hits a race condition, show `ConflictRetryModal` with retry/alternative options — do not show raw error

---

## Key Patterns

### Adding a new backend endpoint

1. Add domain types/errors in `internal/domain/`
2. Define repository interface method + implement in `internal/repository/`
3. Add business logic in `internal/service/`
4. Create HTTP handler in `internal/handler/`
5. Register route in `internal/router/router.go`
6. Write tests at service and repository layers

### Database changes

Always use migration files (`up.sql`, `down.sql`) — never manual `CREATE TABLE`. Add indexes on all foreign keys and frequently queried fields. Use transactions for multi-step writes (booking + inventory update must be atomic).

### Concurrency safety

Pass `context.Context` to all DB/Redis calls. Use `sync.RWMutex` or `sync.Map` for concurrent map access. Only the sender closes channels.

---

## Infrastructure (Local)

**Dev infra only** — `backend/docker-compose.yml` via `make infra-up`:
- PostgreSQL 16 `:5432` (Adminer `:8081`)
- Redis 7 `:6379` (Redis Commander `:8082`)
- Elasticsearch 8 `:9200`
- RabbitMQ 3.13 `:5672` (Management `:15672`)

**Full stack with monitoring** — `devops/docker-compose.yml`:
- All of the above, plus Prometheus `:9090`, Grafana `:3000` (admin/admin), Loki `:3100`, Jaeger `:16686`, Alertmanager `:9093`
- Grafana auto-provisions 4 dashboards: API Overview, Business Metrics, Logs Explorer, Go Runtime
- Promtail ships container logs → Loki; Prometheus scrapes `host.docker.internal:8080/metrics`

Backend config via environment variables — copy `backend/.env.example` to `backend/.env`.

---

## Roadmap Context

| Phase | Status | Focus |
|-------|--------|-------|
| 1 | ✅ Done | Concurrency & Distributed Locking |
| 2 | Planned | Elasticsearch + PostGIS geo-search |
| 3 | Planned | RabbitMQ Choreography Saga (payment) |
| 4 | Planned | Prometheus, Jaeger, CI/CD, Kubernetes |

Detailed plans: `docs/tasks/task_plan_concurrency.md`, `task_plan_search.md`, `task_plan_saga.md`
Web plan: `docs/web/PLAN-web-booking-app.md`
Mobile plan: `docs/mobile/PLAN-mobile-booking-app.md`
