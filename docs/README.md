# StayEase — Developer Guide

> **Full Stack Hotel Booking Platform**
> Go · Next.js · React Native · PostgreSQL · Redis · Elasticsearch · RabbitMQ

---

## Documentation Index

| File | Description |
|------|-------------|
| [PROJECT_ROADMAP.md](./PROJECT_ROADMAP.md) | Phase-by-phase build plan |
| [MASTER_FLOW.md](./MASTER_FLOW.md) | System architecture & data flow diagrams |
| [PROJECT_RULES.md](./PROJECT_RULES.md) | Coding standards & conventions |
| [tasks/](./tasks/) | Active phase task plans |
| [web/](./web/) | Web portal phase plans |
| [mobile/](./mobile/) | Mobile app phase plans |

---

## How to Run in Development

Complete step-by-step guide to run all four processes locally.

### Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Project Structure](#2-project-structure)
3. [Infrastructure — Docker](#3-infrastructure--docker)
4. [Backend — API Server](#4-backend--api-server)
5. [Backend — Payment Worker](#5-backend--payment-worker)
6. [Web Portal](#6-web-portal)
7. [Mobile App](#7-mobile-app)
8. [All Services at a Glance](#8-all-services-at-a-glance)
9. [Full Flow Walkthrough](#9-full-flow-walkthrough)
10. [Troubleshooting](#10-troubleshooting)

---

## 1. Prerequisites

| Tool | Min Version | Install |
|------|------------|---------|
| Go | 1.21 | https://go.dev/dl |
| Node.js | 18 | https://nodejs.org |
| Docker Desktop | 20 | https://docker.com/products/docker-desktop |

For **iOS simulator** (macOS only): Xcode 15+ from the Mac App Store.
For **Android emulator**: Android Studio + a configured AVD.

Verify:

```bash
go version      # go1.21+
node --version  # v18+
docker --version
```

---

## 2. Project Structure

```
booking-app/
├── backend/               # Go API + Payment Worker
│   ├── cmd/api/           # → HTTP server on :8080
│   ├── cmd/worker/        # → Background payment processor
│   ├── migrations/        # SQL files 000001–000006
│   ├── docker-compose.yml # All infrastructure
│   ├── Makefile           # Dev shortcuts
│   └── .env               # Local config
├── web/                   # Next.js portal on :3001
└── mobile/                # Expo app (iOS / Android)
```

Run these **4 processes** simultaneously:

```
[Docker]   → PostgreSQL, Redis, Elasticsearch, RabbitMQ, Prometheus, Grafana, Jaeger
[api]      → go run cmd/api/main.go          (port 8080)
[worker]   → go run ./cmd/worker/       (no port — consumes RabbitMQ)
[web]      → npm run dev -- -p 3001          (port 3001)
[mobile]   → npm run ios / android           (simulator)
```

---

## 3. Infrastructure — Docker

### Start all services

```bash
cd booking-app/backend
docker compose up -d
```

This starts 9 containers:

| Container | Port | Purpose |
|-----------|------|---------|
| `booking-postgres` | `5432` | PostgreSQL 16 — primary database |
| `booking-adminer` | `8081` | Adminer — PostgreSQL web UI |
| `booking-redis` | `6379` | Redis 7 — locking + cache |
| `booking-redis-commander` | `8082` | Redis Commander — Redis web UI |
| `booking-elasticsearch` | `9200` | Elasticsearch 8 — search |
| `booking-rabbitmq` | `5672` · `15672` | RabbitMQ — event bus · management UI |
| `booking-prometheus` | `9090` | Prometheus — metrics |
| `booking-grafana` | `3000` | Grafana — dashboards |
| `booking-jaeger` | `16686` · `4318` | Jaeger — tracing UI · OTLP receiver |

Wait ~30 seconds for containers to become healthy, then check:

```bash
docker compose ps
```

### Set up the database (first time only)

```bash
cd booking-app/backend

# Create the database
make createdb

# Run all 6 migrations
make migrate
```

Migrations applied in order:

```
000001 — hotels, rooms, bookings, inventory
000002 — users, refresh_tokens
000003 — hotel approval fields, owner management
000004 — reviews, rating_stats
000005 — payments, outbox_events, processed_events
000006 — notifications
```

### Stop infrastructure

```bash
docker compose down          # stop, keep volumes
docker compose down -v       # stop + delete all data (full wipe)
```

### Reset database from scratch

```bash
make reset-db   # dropdb → createdb → migrate
```

---

## 4. Backend — API Server

### Environment file

`backend/.env` already exists. Make sure it contains all variables:

```env
APP_NAME=booking-app
HTTP_PORT=8080
ENVIRONMENT=development

# PostgreSQL (matches docker-compose.yml)
DB_HOST=localhost
DB_PORT=5432
DB_USER=user
DB_PASSWORD=password
DB_NAME=booking_db
DB_SSLMODE=disable

# Redis
REDIS_ADDR=localhost:6379
REDIS_PASSWORD=

# JWT
JWT_SECRET=dev-secret-change-in-production
JWT_ACCESS_TOKEN_TTL=15m
JWT_REFRESH_TOKEN_TTL=168h

# Rate limiting (requests/minute)
RATE_LIMIT_PUBLIC=100
RATE_LIMIT_AUTH=30

# Elasticsearch
ELASTICSEARCH_URL=http://localhost:9200

# RabbitMQ (matches docker-compose.yml defaults)
RABBITMQ_URL=amqp://guest:guest@localhost:5672/

# Distributed tracing
JAEGER_ENDPOINT=http://localhost:4318
```

> All variables have defaults in `config.go` — the minimal `.env` that ships in the repo is enough to start. The server degrades gracefully if Elasticsearch or RabbitMQ are unreachable.

### Start the API server

```bash
cd booking-app/backend
make server
```

Or directly:

```bash
go run cmd/api/main.go
```

Expected startup:

```
INFO  starting server         app=booking-app port=8080
INFO  connected to PostgreSQL
INFO  connected to Redis
INFO  connected to Elasticsearch
INFO  connected to RabbitMQ
INFO  server listening         addr=:8080
```

### Verify

```bash
curl http://localhost:8080/api/v1/health
# → {"status":"ok","postgres":"ok","redis":"ok"}
```

### Run tests

```bash
make test
# or
go test ./... -v -cover
```

---

## 5. Backend — Payment Worker

The worker is a **separate process** — no HTTP port, only RabbitMQ.
It must be running for bookings to progress past `awaiting_payment`.

Open a **second terminal**:

```bash
cd booking-app/backend
go run ./cmd/worker/
```

Expected startup:

```
INFO  starting payment worker
INFO  connected to RabbitMQ
INFO  consumer started  queue=booking.payments  tag=payment-worker
```

**What it processes:**

| Routing key | Action |
|-------------|--------|
| `payment.initiated` | Runs mock gateway (80% success · 15% fail · 5% timeout) |
| `payment.succeeded` | Confirms booking in DB · creates notification |
| `payment.failed` | Marks booking failed · restores inventory · creates notification |
| `payment.timed_out` | Cancels booking · restores inventory · creates notification |

---

## 6. Web Portal

### Port note

Grafana (Docker) uses port **3000**. Run the web app on port **3001** to avoid conflict.

### Environment file

Create `web/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8080/api/v1
```

### Install and start

```bash
cd booking-app/web
npm install
npm run dev -- -p 3001
```

Open: **http://localhost:3001**

### Routes by role

| URL | Role | Screen |
|-----|------|--------|
| `/login` | All | Sign in |
| `/owner/dashboard` | Owner | KPIs + recent bookings |
| `/owner/properties` | Owner | Hotel management |
| `/owner/reservations` | Owner | Booking list |
| `/owner/analytics` | Owner | Revenue charts |
| `/owner/settings` | Owner | Profile settings |
| `/admin/dashboard` | Admin | Platform overview |
| `/admin/hotels` | Admin | Approval queue |
| `/admin/users` | Admin | User management |
| `/admin/system` | Admin | System health |

### Lint

```bash
npm run lint
```

---

## 7. Mobile App

### Environment file

```bash
cp mobile/.env.example mobile/.env
```

`mobile/.env`:

```env
EXPO_PUBLIC_API_URL=http://localhost:8080
EXPO_PUBLIC_WS_URL=ws://localhost:8080
```

> **Physical device**: replace `localhost` with your machine's LAN IP.
> Find it with: `ipconfig getifaddr en0` (macOS) or `hostname -I` (Linux).

### Install dependencies

```bash
cd booking-app/mobile
npm install
```

### iOS Simulator (macOS only)

```bash
npm run ios
```

Requires Xcode + iOS Simulator. Expo opens the app automatically.

### Android Emulator

Start an AVD from Android Studio first, then:

```bash
npm run android
```

### Physical device — Expo Go

```bash
npm start
```

1. Install **Expo Go** on your phone (App Store / Google Play)
2. Scan the QR code from the terminal
3. Phone and computer must be on the same Wi-Fi
4. Set `EXPO_PUBLIC_API_URL` to your machine's LAN IP

### Clear cache

```bash
npm run reset
```

### App tabs by role

| Role | Tabs | Key features |
|------|------|-------------|
| **Guest** | Home · Search · Bookings · Alerts · Profile | Browse hotels, book, real-time payment status via WebSocket |
| **Owner** | Dashboard · Properties · Reservations · Analytics | Manage hotels, track revenue |
| **Admin** | Overview · Hotels · Users · System | Approve hotels, manage users, monitor health |

---

## 8. All Services at a Glance

| Service | URL | Default credentials |
|---------|-----|---------------------|
| **API Server** | http://localhost:8080/api/v1 | — |
| **API Health** | http://localhost:8080/api/v1/health | — |
| **API Metrics** | http://localhost:8080/metrics | — |
| **Web Portal** | http://localhost:3001 | register at `/login` |
| **Adminer** (DB UI) | http://localhost:8081 | server: `postgres` · user: `user` · pass: `password` · db: `booking_db` |
| **Redis Commander** | http://localhost:8082 | — |
| **RabbitMQ UI** | http://localhost:15672 | `guest` / `guest` |
| **Prometheus** | http://localhost:9090 | — |
| **Grafana** | http://localhost:3000 | `admin` / `admin` |
| **Jaeger UI** | http://localhost:16686 | — |
| **Elasticsearch** | http://localhost:9200 | — |

---

## 9. Full Flow Walkthrough

End-to-end booking saga — requires all 4 processes running.

### Register a guest

```bash
curl -X POST http://localhost:8080/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"John Guest","email":"john@example.com","password":"password123","role":"guest"}'
```

### Login and save token

```bash
TOKEN=$(curl -s -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"john@example.com","password":"password123"}' \
  | jq -r '.data.tokens.accessToken')
```

### Search hotels

```bash
curl "http://localhost:8080/api/v1/hotels/search?city=Hanoi&check_in=2026-03-01&check_out=2026-03-05&guests=2"
```

### Create a booking

```bash
curl -X POST http://localhost:8080/api/v1/bookings \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"room_id":1,"start_date":"2026-03-01","end_date":"2026-03-05","guests":2}'
# → booking created, status: "pending"
```

### Initiate checkout (starts the payment saga)

```bash
curl -X POST http://localhost:8080/api/v1/checkout \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"booking_id":1}'
# → status transitions to "awaiting_payment"
```

What happens automatically after this:

```
API server  → writes payment record to DB
            → writes outbox event "payment.initiated"
            → outbox worker publishes to RabbitMQ

Worker      → consumes "payment.initiated"
            → runs mock gateway (80% succeed / 15% fail / 5% timeout)
            → publishes result event ("payment.succeeded" / "payment.failed" / "payment.timed_out")

Worker      → consumes result event
            → updates booking status in DB (confirmed / failed / cancelled)
            → restores inventory on failure or timeout
            → creates DB notification for user

API server  → consumes result event from "booking.notifications" queue
            → hub.Broadcast(userID, booking_status_updated)

Mobile app  → WebSocket receives "booking_status_updated"
            → processing screen shows final state in real time
```

### Check final booking status

```bash
curl http://localhost:8080/api/v1/bookings/1 \
  -H "Authorization: Bearer $TOKEN"
# → status: "confirmed" (or "failed" / "cancelled")
```

---

## 10. Troubleshooting

### Docker containers won't start

```bash
docker compose ps                  # check which service failed
docker compose logs <service>      # inspect logs

# Port already in use?
lsof -i :5432    # postgres
lsof -i :6379    # redis
lsof -i :5672    # rabbitmq
```

### "could not ping DB" on API startup

PostgreSQL isn't ready. Wait 15 seconds after `docker compose up -d` and retry.

### "failed to connect to RabbitMQ"

RabbitMQ takes ~30 seconds to fully boot. The API server logs a warning and starts without saga support. Restart the worker once RabbitMQ is healthy:

```bash
docker compose logs rabbitmq | tail -5
go run ./cmd/worker/
```

### Bookings stuck at `awaiting_payment`

The payment worker is not running. Start it:

```bash
cd booking-app/backend
go run ./cmd/worker/
```

### Web portal shows blank page or API 404

`NEXT_PUBLIC_API_URL` is missing. Create `web/.env.local`:

```bash
echo "NEXT_PUBLIC_API_URL=http://localhost:8080/api/v1" > web/.env.local
```

Then restart `npm run dev -- -p 3001`.

### Mobile can't connect on a physical device

Replace `localhost` with your machine's LAN IP in `mobile/.env`:

```bash
# macOS
ipconfig getifaddr en0

# Linux
hostname -I | awk '{print $1}'
```

Update `.env`:
```env
EXPO_PUBLIC_API_URL=http://192.168.x.x:8080
EXPO_PUBLIC_WS_URL=ws://192.168.x.x:8080
```

### Full reset (wipe everything and start clean)

```bash
cd booking-app/backend

docker compose down -v   # destroy all volumes
docker compose up -d     # restart infrastructure
# wait ~30s
make reset-db            # recreate + migrate

# then in separate terminals:
make server
go run ./cmd/worker/
```

---

## Quick Reference — Terminal Layout

```
Tab 1 │ cd backend && docker compose up
Tab 2 │ cd backend && make server
Tab 3 │ cd backend && go run ./cmd/worker/
Tab 4 │ cd web    && npm run dev -- -p 3001
Tab 5 │ cd mobile && npm run ios
```

---

## 11. Shutting Down

Stop processes in reverse order: mobile → web → workers → API → Docker.

### Mobile (Tab 5)

Press `Ctrl+C` in the Metro terminal to stop the bundler.

To also close the iOS simulator:
```bash
xcrun simctl shutdown all
```

### Web portal (Tab 4)

Press `Ctrl+C` in the Next.js terminal.

### Payment worker (Tab 3)

Press `Ctrl+C`. The worker handles `SIGINT` gracefully — it finishes the current message before exiting:
```
INFO  worker shutting down...
INFO  worker stopped
```

### API server (Tab 2)

Press `Ctrl+C`. Graceful shutdown drains in-flight requests (5 s timeout):
```
INFO  shutting down server...
INFO  server stopped
```

### Docker infrastructure (Tab 1)

```bash
cd booking-app/backend

# Stop containers, keep all data (volumes preserved)
docker compose down

# Stop containers AND delete all data (full wipe)
docker compose down -v
```

> Use `down -v` only when you want a clean slate. All database records, Redis keys, RabbitMQ messages, and Elasticsearch indices will be permanently deleted.

### One-liner full shutdown

```bash
# Stop API + worker (find PIDs by port/process name)
pkill -f "cmd/api/main.go"
pkill -f "cmd/worker"

# Stop web (Next.js)
pkill -f "next dev"

# Stop Docker
cd booking-app/backend && docker compose down
```

---

## 12. Using the Observability & Dev Tools

All tools are available once Docker is running (`docker compose up -d`).

---

### Adminer — PostgreSQL Web UI

**URL**: http://localhost:8081

A lightweight database browser for PostgreSQL.

**Login credentials:**
| Field | Value |
|-------|-------|
| System | PostgreSQL |
| Server | `postgres` |
| Username | `user` |
| Password | `password` |
| Database | `booking_db` |

**What you can do:**
- Browse all 11 tables (hotels, rooms, bookings, users, payments, notifications, …)
- Run arbitrary SQL queries
- Inspect rows after making bookings to see saga state changes
- Check `outbox_events` and `processed_events` tables for saga event flow
- View `payments` table to see payment status transitions

**Useful queries:**
```sql
-- See all bookings with status
SELECT id, user_id, room_id, status, total_price, created_at FROM bookings ORDER BY created_at DESC;

-- Check saga payment flow
SELECT p.id, p.booking_id, p.status, p.amount, p.created_at
FROM payments p JOIN bookings b ON b.id = p.booking_id ORDER BY p.created_at DESC;

-- View pending outbox events (not yet published to RabbitMQ)
SELECT id, event_type, payload, created_at FROM outbox_events WHERE published_at IS NULL;

-- View recent notifications
SELECT user_id, type, title, message, read, created_at FROM notifications ORDER BY created_at DESC LIMIT 20;
```

---

### Redis Commander — Redis Web UI

**URL**: http://localhost:8082

**What you can do:**
- Browse all Redis keys in a tree view
- Inspect distributed lock keys: `lock:room:{roomID}:{date}` (5 s TTL)
- View rate-limit counters: `rate:{ip}` keys
- View cached hotel/search results
- Monitor key TTLs and memory usage

**Key patterns to watch:**
| Key pattern | Purpose |
|-------------|---------|
| `lock:room:*` | Distributed inventory locks (auto-expire in 5 s) |
| `rate:*` | Rate limiter counters per IP |
| `hotel:*` | Cached hotel data |
| `search:*` | Cached search results |

---

### RabbitMQ Management UI

**URL**: http://localhost:15672
**Credentials**: `guest` / `guest`

**What you can do:**
- Monitor queue depths (messages waiting to be consumed)
- Watch message rates (publish/s, deliver/s, ack/s)
- Inspect exchanges and routing keys
- View the Dead Letter Queue (DLQ) for failed messages
- Manually publish test messages to queues
- Purge queues

**Key queues to monitor:**
| Queue | Routing keys | Consumer |
|-------|-------------|---------|
| `booking.payments` | `payment.initiated`, `payment.succeeded`, `payment.failed`, `payment.timed_out` | Payment worker |
| `booking.notifications` | `payment.succeeded`, `payment.failed`, `payment.timed_out` | API server (WS broadcast) |
| `booking.dlq` | any failed messages | Manual retry |

**How to watch the saga flow:**
1. Open the **Queues** tab
2. Click `booking.payments`
3. Start a booking checkout via the API or mobile app
4. Watch the message move through: Ready → Unacked → Acked

---

### Prometheus — Metrics

**URL**: http://localhost:9090

**What you can do:**
- Query metrics using PromQL
- Check which metrics the API server exposes
- Set up alert rules (advanced)

**Useful PromQL queries:**
```promql
# Total HTTP requests by endpoint and status code
http_requests_total

# Request latency histogram (p95)
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))

# Active goroutines
go_goroutines

# Booking creation rate (per minute)
rate(http_requests_total{handler="/api/v1/bookings",method="POST"}[1m]) * 60

# Error rate (5xx responses)
rate(http_requests_total{status=~"5.."}[5m])
```

**Check all available metrics:**
```bash
curl -s http://localhost:8080/metrics | grep "^# HELP"
```

---

### Grafana — Dashboards

**URL**: http://localhost:3000
**Credentials**: `admin` / `admin`

Pre-configured dashboards are provisioned from `backend/monitoring/grafana/`.

**Available dashboards:**
| Dashboard | What it shows |
|-----------|--------------|
| **StayEase Overview** | Request rate, error rate, latency p50/p95/p99 |
| **Booking Saga** | Payment success/failure/timeout rates, saga throughput |
| **Go Runtime** | Goroutines, GC pauses, heap usage, memory allocations |

**How to open a dashboard:**
1. Click the grid icon (Dashboards) in the left sidebar
2. Select **Browse** → choose a dashboard

**How to change the time range:**
- Top-right corner: select `Last 15 minutes`, `Last 1 hour`, etc.
- Click the refresh icon or set auto-refresh interval

**Connect Prometheus datasource** (first time only if not auto-provisioned):
1. Go to **Connections** → **Data Sources**
2. Add Prometheus → URL: `http://prometheus:9090`
3. Click **Save & Test**

---

### Jaeger — Distributed Tracing

**URL**: http://localhost:16686

**What you can do:**
- Search traces by service, operation, duration, or tags
- See the full request lifecycle across all layers (handler → service → repository → DB/Redis)
- Identify slow spans and bottlenecks
- Inspect trace context propagation

**How to find a booking trace:**
1. Open Jaeger UI
2. Set **Service** to `booking-app`
3. Set **Operation** to `POST /api/v1/bookings` (or any route)
4. Click **Find Traces**
5. Click any trace to see the waterfall view of spans

**What to look for:**
| Span | Normal latency |
|------|---------------|
| HTTP handler | < 5 ms overhead |
| DB query (simple) | < 10 ms |
| DB query (booking with lock) | < 100 ms |
| Redis lock acquire | < 10 ms |
| Full booking creation | < 200 ms |

**Trace tags available:**
- `booking.id`, `booking.status`
- `user.id`, `user.role`
- `db.statement` (SQL queries)
- `http.method`, `http.url`, `http.status_code`

---

### Elasticsearch

**URL**: http://localhost:9200

Used for hotel geo-search. Access is plain HTTP JSON.

**Check cluster health:**
```bash
curl http://localhost:9200/_cluster/health?pretty
```

**List all indices:**
```bash
curl http://localhost:9200/_cat/indices?v
```

**Search hotels by city (same query the API uses):**
```bash
curl -X GET "http://localhost:9200/hotels/_search?pretty" \
  -H "Content-Type: application/json" \
  -d '{
    "query": {
      "match": { "city": "Hanoi" }
    }
  }'
```

**Check if hotels index exists:**
```bash
curl http://localhost:9200/hotels/_count?pretty
```

> Hotels are indexed automatically when created/approved via the API. If the index is empty, create a hotel through the owner portal or API and approve it as admin.

---

## 13. Development Workflow Tips

### Register test accounts

```bash
# Guest account
curl -X POST http://localhost:8080/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"John Guest","email":"guest@test.com","password":"password123","role":"guest"}'

# Owner account
curl -X POST http://localhost:8080/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Hotel Owner","email":"owner@test.com","password":"password123","role":"owner"}'

# Admin account
curl -X POST http://localhost:8080/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Platform Admin","email":"admin@test.com","password":"password123","role":"admin"}'
```

### Useful endpoints to test the full saga

```bash
# 1. Login and save token
TOKEN=$(curl -s -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"guest@test.com","password":"password123"}' \
  | jq -r '.data.tokens.accessToken')

# 2. Create a booking
curl -X POST http://localhost:8080/api/v1/bookings \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"room_id":1,"start_date":"2026-06-01","end_date":"2026-06-05","guests":2}'

# 3. Start checkout (triggers the payment saga)
curl -X POST http://localhost:8080/api/v1/checkout \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"booking_id":1}'

# 4. Poll booking status (or watch it update in real time via WebSocket)
curl http://localhost:8080/api/v1/bookings/1 \
  -H "Authorization: Bearer $TOKEN"
```

### Reset everything for a clean test run

```bash
cd booking-app/backend
docker compose down -v       # wipe all data
docker compose up -d         # restart infra
sleep 30                     # wait for services to be healthy
make reset-db                # recreate + migrate DB
```

---

## 14. Docker Tips

All commands below assume you are in `booking-app/backend/` (where `docker-compose.yml` lives).

---

### Container status

```bash
# List all containers and their health status
docker compose ps

# One-line status for all containers
docker compose ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"
```

---

### Viewing logs

```bash
# Tail logs for all services
docker compose logs -f

# Tail logs for a specific service
docker compose logs -f postgres
docker compose logs -f rabbitmq
docker compose logs -f elasticsearch

# Show last N lines without following
docker compose logs --tail=50 postgres
```

Available service names: `postgres`, `redis`, `elasticsearch`, `rabbitmq`,
`adminer`, `redis-commander`, `prometheus`, `grafana`, `jaeger`

---

### Start, stop, restart

```bash
# Start all (detached)
docker compose up -d

# Start a single service
docker compose up -d rabbitmq

# Stop all (keep volumes)
docker compose down

# Restart a single service without touching others
docker compose restart rabbitmq

# Recreate a single service (picks up config changes)
docker compose up -d --force-recreate elasticsearch
```

---

### Shell access — exec into a container

```bash
# PostgreSQL — open psql
docker exec -it booking-postgres psql -U user -d booking_db

# Redis — open redis-cli
docker exec -it booking-redis redis-cli

# Elasticsearch — run a curl query from inside the container
docker exec -it booking-elasticsearch curl -s localhost:9200/_cluster/health?pretty

# RabbitMQ — list queues
docker exec -it booking-rabbitmq rabbitmqctl list_queues name messages consumers
```

---

### Resource usage

```bash
# Live CPU / memory / network stats for all containers
docker stats

# Stats snapshot (no streaming)
docker stats --no-stream

# Disk usage by images, containers, volumes
docker system df
```

---

### Image & volume management

```bash
# List volumes created by this project
docker volume ls | grep booking

# Inspect a volume (find mount path)
docker volume inspect booking-app_postgres_data

# Remove unused images (safe to run periodically)
docker image prune -f

# Full system prune — removes ALL stopped containers, unused networks, dangling images
# WARNING: only run this when no other Docker projects are active
docker system prune -f
```

---

### Selective data wipe

```bash
# Wipe only the PostgreSQL volume (keeps Redis, RabbitMQ, ES data)
docker compose stop postgres
docker volume rm booking-app_postgres_data
docker compose up -d postgres
make createdb && make migrate

# Wipe only RabbitMQ queues (useful when messages are stuck)
docker compose restart rabbitmq

# Wipe all volumes (full clean slate)
docker compose down -v
docker compose up -d
sleep 30 && make reset-db
```

---

### Wait for a service to become healthy

```bash
# Poll until postgres is ready (useful in CI or scripts)
until docker exec booking-postgres pg_isready -U user -d booking_db; do
  echo "waiting for postgres..."; sleep 2
done

# Check RabbitMQ management API readiness
until curl -sf http://localhost:15672/api/overview -u guest:guest > /dev/null; do
  echo "waiting for rabbitmq..."; sleep 2
done
```

---

### Pull latest images (update dependencies)

```bash
# Pull updated images for all services defined in docker-compose.yml
docker compose pull

# Then recreate containers with the new images
docker compose up -d
```

Test credentials:
  - Owner: owner@stayease.app / Password123
  - Admin: admin@stayease.app / Password123
  - Guest: guest@test.com / Password123

---

## 🔍 Technical Review

> **Review Date**: 2026-02-28
> **Scope**: Full codebase audit comparing StayEase against production booking platforms (Booking.com / Agoda / Traveloka)
> **Methodology**: Static analysis of all three modules — Backend (Go), Mobile (React Native Expo), Web (Next.js 15)

---

### Executive Summary

| Module | Screens / Endpoints | Core Flows | Production Readiness |
|--------|-------------------|------------|---------------------|
| **Backend (Go)** | 59 endpoints across 10 phases | Auth, bookings, payments saga, WebSocket, search, observability | ~70% — critical inventory bug, missing idempotency |
| **Mobile (RN Expo)** | 64 screens across 8 phases | Full guest booking flow, owner/admin panels, real-time WS | ~65% — checkout saga never triggered, race condition |
| **Web (Next.js)** | 26+ pages across 6 phases | Owner/admin dashboards, analytics, system health | ~60% — message pages missing, auth store mismatch |

**Overall platform completeness vs. Booking.com/Agoda/Traveloka**: ~65%
The platform covers the core booking loop end-to-end (search → book → pay via saga → notify via WS). Missing: guest reviews UI, favorites, refunds, push notifications, dark mode, write-reviews flow, and several admin/owner pages.

---

### 1. Backend Review

#### Endpoint Coverage

| Domain | Endpoints | Status |
|--------|-----------|--------|
| Auth (register, login, refresh, logout, me) | 5 | ✅ Complete |
| Hotels CRUD + approval + search | 9 | ✅ Complete |
| Rooms CRUD | 5 | ✅ Complete |
| Bookings (create, list, detail, cancel) | 4 | ✅ Complete |
| Checkout / Payment Saga | 2 | ✅ Complete |
| Reviews (create, list, hotel avg) | 3 | ✅ Complete |
| Notifications (list, read, mark-read) | 3 | ✅ Complete |
| WebSocket Hub (connect, broadcast) | 1 | ✅ Complete |
| Admin APIs (users, stats, DLQ) | 8 | ✅ Complete |
| Health + Metrics | 2 | ✅ Complete |
| Booking modifications / amendments | 0 | ❌ Missing |
| Refund / cancellation with fee logic | 0 | ❌ Missing |
| Email delivery (confirmation, receipt) | 0 | ❌ Missing |
| Favorites / wishlists | 0 | ❌ Missing |
| Promo codes / discounts | 0 | ❌ Missing |

#### Critical Bugs

**Bug 1 — Inventory not restored on cancellation**
- File: `backend/internal/repository/inventory.go` — `RestoreInventory()`
- Problem: Implementation resets `available_rooms` to `0` instead of incrementing it. After a failed/cancelled booking, the room appears permanently sold out.
- Impact: **Data corruption** — inventory diverges from reality after any failed payment or cancellation. Booking.com uses an atomic `UPDATE inventory SET available_rooms = available_rooms + 1` pattern.
- Fix: Change the SQL from `SET available_rooms = 0` to `SET available_rooms = available_rooms + $1`.

**Bug 2 — No idempotency on payment initiation**
- File: `backend/internal/service/payment.go`
- Problem: `StartCheckout()` has no guard against duplicate calls. If the outbox worker retries a `payment.initiated` event (e.g., after a network blip), a second charge attempt is made against the same booking.
- Impact: **Double-charge risk**. Production payment systems (Stripe, VNPay) require an idempotency key per charge attempt.
- Fix: Add a `processed_events` check before calling the payment gateway; use `booking_id` as the idempotency key.

**Bug 3 — Booking default status mismatch**
- File: `backend/migrations/000001_*.up.sql` (bookings table DDL)
- Problem: The `bookings` table likely has `DEFAULT 'confirmed'` in the DB schema, but the domain saga expects `'pending'` as the initial status before checkout begins.
- Impact: Bookings created directly via SQL tooling (Adminer) bypass the saga and appear confirmed without payment, corrupting the saga state machine.
- Fix: Set `status DEFAULT 'pending'` in the migration and add a `CHECK (status IN ('pending', 'awaiting_payment', 'confirmed', 'failed', 'cancelled'))` constraint.

#### Security Issues

| Issue | Severity | Location | Recommendation |
|-------|----------|----------|---------------|
| JWT passed as WebSocket query param | **HIGH** | `internal/handler/ws_handler.go` | Move token to `Authorization` header during the HTTP upgrade handshake or use a short-lived ticket pattern |
| No request body size limit | **MEDIUM** | `internal/router/router.go` | Add `http.MaxBytesReader` middleware (e.g., 1 MB limit) to prevent memory exhaustion |
| HTML input not sanitized | **MEDIUM** | Hotel/Review create handlers | Run text fields through a sanitizer (e.g., `bluemonday`) before persisting; return 400 on script injection attempts |
| Rate limiting is IP-based only | **MEDIUM** | `internal/middleware/rate_limit.go` | Add per-user (JWT sub) rate limiting to prevent authenticated abuse |
| Soft deletes not implemented | **LOW** | All repositories | Use `deleted_at` timestamps instead of hard DELETE to preserve audit trails |

#### Missing Features (vs. Production Platforms)

- **Email notifications**: No SMTP integration. Booking.com sends confirmation emails with PDF receipts.
- **Refund logic**: Cancellations currently just mark status; no refund record or partial-refund calculation.
- **Booking amendments**: Guests cannot change dates or room type after confirmation.
- **Multi-currency pricing**: All prices stored and returned as single currency with no conversion layer.
- **Hotel photo storage**: No file upload endpoint; image URLs are free-text strings.
- **Availability calendar**: No endpoint to return blocked dates for a room (needed for date picker UI).

---

### 2. Mobile Review

#### Screen Coverage

| Section | Screens | Status |
|---------|---------|--------|
| Auth (splash, login, register) | 3 | ✅ Complete |
| Guest: Home, Search, Map, Filter | 4 | ✅ Complete |
| Guest: Hotel Detail, Room selection | 2 | ✅ Complete |
| Guest: Booking form, Review & Pay | 2 | ✅ Complete (bug) |
| Guest: Processing, Confirmation | 2 | ✅ Complete (bug) |
| Guest: My Bookings, Notifications | 2 | ✅ Complete |
| Guest: Profile | 1 | ✅ Complete |
| Guest: Messages (chat) | 1 | ✅ Complete |
| Owner: Dashboard, Properties, Reservations, Analytics | 4 | ✅ Complete |
| Owner: Messages | 1 | ✅ Complete |
| Admin: Overview, Hotels, Users, System | 4 | ✅ Complete |
| Dark mode | — | ❌ Not implemented |
| Favorites / Saved hotels | — | ❌ Not implemented |
| Write a review screen | — | ❌ Not implemented |
| Push notifications (FCM/APNs) | — | ❌ Not implemented |
| Apple Pay / Google Pay | — | ❌ Not implemented |
| Offline mode / cached content | — | ❌ Not implemented |

#### Critical Bugs

**Bug 1 — Checkout saga never triggered from mobile**
- File: `mobile/app/(guest)/(booking)/review-pay.tsx`
- Problem: The "Pay Now" button calls `bookingService.create()` to create the booking record but **never calls** `paymentService.checkout()`. This means the payment saga (`POST /checkout`) is never initiated from the mobile app. The booking sits permanently at `status: pending`.
- Impact: **Complete E2E flow breakage** — mobile guests cannot complete a payment. The saga, WebSocket notification, and processing screen are all unreachable.
- Fix: After `bookingService.create()` succeeds, call `paymentService.checkout({ booking_id })` before navigating to the processing screen.

**Bug 2 — API envelope unwrap mismatch in booking service**
- File: `mobile/services/booking.service.ts` — `create()` method
- Problem: Method is typed as `Promise<Booking>` but the backend returns `{success, data: Booking, error, meta}`. The caller accesses `.id` directly on the response, but should access `.data.id`.
- Impact: `booking_id` passed to checkout and processing screens is `undefined`, causing all downstream API calls to 404.
- Fix: Unwrap the envelope: `const booking = response.data.data; return booking;` or update the type to `Promise<ApiResponse<Booking>>` and update all call sites.

**Bug 3 — WebSocket + polling race condition on processing screen**
- File: `mobile/app/(guest)/(booking)/processing.tsx`
- Problem: The screen starts both a React Query polling interval (`refetchInterval: 2000`) **and** a WebSocket `booking_status_updated` listener simultaneously. When payment succeeds, both the poll response and the WS message trigger `setSagaStatus()`, causing a double state update and potentially rendering the success animation twice or flashing between states.
- Impact: UX glitch; in rare timing cases, the screen may show "failed" briefly before correcting to "confirmed".
- Fix: Pick one mechanism. Prefer WebSocket with a fallback poll only when WS is disconnected. Cancel the polling interval when a WS update is received.

#### UX Gaps vs. Agoda/Traveloka

- No saved/favorite hotels (heart icon on card does nothing)
- No review submission UI — guests can read reviews but cannot write them after a stay
- No refund request flow for cancelled bookings
- No date picker blocked-dates calendar (guests can select already-booked dates)
- No Apple Pay / Google Pay integration — card form is manual
- Currency and locale hardcoded (no multi-language support)

---

### 3. Web Review

#### Page Coverage

| Section | Pages | Status |
|---------|-------|--------|
| Auth: Login | 1 | ✅ Complete |
| Owner: Dashboard, Properties, Reservations, Analytics | 5 | ✅ Complete |
| Owner: Reservation detail `[id]` | 1 | ✅ Complete |
| Owner: Settings | 1 | ✅ Stub only |
| Owner: Messages | 1 | ❌ Nav link exists, page not implemented |
| Admin: Dashboard, Hotels, Users, Bookings, Analytics | 5 | ✅ Complete |
| Admin: Hotel detail `[id]`, User detail `[id]` | 2 | ✅ Complete |
| Admin: System logs, DLQ | 2 | ✅ Complete |
| Admin: Messages | 1 | ❌ Nav link exists, page not implemented |
| Admin: Broadcast | 1 | ❌ Nav link exists, page not implemented |
| Admin: Settings | 1 | ❌ Not implemented |
| Live booking feed (WebSocket) | — | ❌ Hook exists, not wired into layouts |

#### Incomplete Items

**Item 1 — Message pages not implemented**
- Files: `web/app/(owner)/owner/messages/page.tsx`, `web/app/(admin)/admin/messages/page.tsx`, `web/app/(admin)/admin/broadcast/page.tsx`
- Nav links exist in `web/lib/nav-config.ts` but clicking them leads to a 404. The `ChatPanel` component and `chat.store.ts` are fully built — the pages just need to render `<ChatPanel />`.

**Item 2 — Auth store / login service mismatch**
- File: `web/stores/auth.store.ts` — `login()` action
- Problem: Store destructures `data.token` from the login response, but `web/services/api.ts` login method likely returns `{ token, user }` as a flat object (matching the backend `data` envelope field). This means `data.token` is `undefined` and the JWT is never stored, so every page refresh logs the user out.
- Impact: **Login broken in production** if this mismatch exists. Dev mode may mask it if using mock data fallbacks.
- Fix: Align destructuring with the actual API response shape. Log the raw response in dev to confirm.

**Item 3 — WebSocket not wired into layouts**
- File: `web/hooks/use-realtime.ts` exists with full reconnect logic, but neither `web/app/(owner)/owner/layout.tsx` nor `web/app/(admin)/admin/layout.tsx` call `useRealtime()`.
- Impact: Owners cannot receive live booking notifications; admin cannot see real-time system events without a page refresh.
- Fix: Call `useRealtime()` (or `useWebSocket()`) in both layout files, identical to how the mobile guest layout wires `useRealtimeConnection`.

**Item 4 — Settings pages are stubs**
- `web/app/(owner)/owner/settings/page.tsx` and admin settings do not exist. Production platforms require profile editing, notification preferences, billing details, and API key management.

#### Integration Gaps

- No real-time update on the Owner Reservations table when a booking is confirmed/failed while the owner is viewing the page
- Owner Properties page does not show room availability calendar
- Admin analytics uses mock data only — no connection to actual backend aggregation endpoints
- No export (CSV/PDF) for booking data in owner or admin views

---

### 4. Cross-Cutting Concerns

#### Authentication Flow

```
Mobile:  Login → JWT stored in expo-secure-store → Axios interceptor adds Bearer header → auto-refresh on 401
Web:     Login → JWT stored in localStorage (key: stayease-auth) → Axios interceptor → auto-refresh on 401
Backend: JWT access token (15 min TTL) + refresh token (168 h TTL) stored in DB
```

**Issue**: Web uses `localStorage` for JWT storage, making it vulnerable to XSS. A hardened approach (e.g., HttpOnly cookie for refresh token) should be considered before production deployment.

#### WebSocket Architecture

```
Backend:  gorilla/websocket Hub — per-connection write mutex (connEntry), BroadcastAll, per-user routing by userID
Mobile:   useRealtimeConnection hook — exponential backoff (1 s → 30 s), routes by event type
Web:      use-realtime.ts hook — backoff implemented, but not mounted in layouts
```

All three modules are architecturally aligned. The remaining work is mounting the web hook and fixing the mobile duplicate-listener bug (Bug 3 above).

#### Error Handling

| Layer | Status |
|-------|--------|
| Backend: domain sentinel errors → HTTP codes | ✅ |
| Backend: panic recovery middleware | ✅ |
| Mobile: ConflictRetryModal on 409 | ✅ |
| Mobile: envelope unwrap error handling | ⚠️ Partial — see Bug 2 |
| Web: global API error interceptor | ✅ |
| Web: toast/alert on API errors | ✅ |
| All: user-friendly messages (no raw stack traces) | ✅ |

#### Observability

| Tool | Status | Notes |
|------|--------|-------|
| Prometheus metrics | ✅ | HTTP request counts, duration histograms |
| Grafana dashboards | ✅ | 3 dashboards provisioned |
| Jaeger distributed tracing | ✅ | OTel OTLP/HTTP to Jaeger |
| Structured logging (Zap) | ✅ | JSON logs with correlation IDs |
| Frontend error monitoring | ❌ | No Sentry or similar integration |
| Mobile crash reporting | ❌ | No Crashlytics or Bugsnag |
| Alerting rules | ❌ | No Prometheus alertmanager rules |
| SLO/SLA definitions | ❌ | No uptime targets defined |

---

### 5. Improvement Roadmap

#### P0 — Critical Bugs (Fix Before Any Demo)

| # | Issue | File | Effort |
|---|-------|------|--------|
| 1 | `RestoreInventory()` sets to 0 instead of incrementing | `repository/inventory.go` | 15 min |
| 2 | Mobile: checkout saga never called after booking creation | `review-pay.tsx` | 30 min |
| 3 | Mobile: envelope unwrap mismatch (`response.data.id` vs `response.data.data.id`) | `booking.service.ts` | 20 min |
| 4 | Web: auth store `data.token` vs flat `{token, user}` mismatch | `stores/auth.store.ts` | 20 min |
| 5 | Mobile: WS + polling race condition on processing screen | `processing.tsx` | 45 min |

#### P1 — Security (Fix Before Production)

| # | Issue | Effort |
|---|-------|--------|
| 1 | JWT in WebSocket query param → use ticket/header pattern | 2 h |
| 2 | Add request body size limit middleware | 30 min |
| 3 | Sanitize HTML input in hotel/review handlers | 1 h |
| 4 | Web: move JWT from localStorage to HttpOnly cookie | 4 h |
| 5 | Add per-user rate limiting (not just per-IP) | 2 h |

#### P2 — Missing Features (Phase 8+ Backlog)

| Feature | Scope | Effort |
|---------|-------|--------|
| Wire web WebSocket hook into layouts | Web | 1 h |
| Implement Owner/Admin messages pages | Web | 4 h |
| Add availability calendar endpoint | Backend + Mobile/Web | 1 d |
| Add payment idempotency keys | Backend | 3 h |
| Soft deletes for hotels/rooms/users | Backend | 4 h |
| Write-a-review UI | Mobile + Web | 1 d |
| Favorites/saved hotels | Mobile + Web + Backend | 2 d |
| Refund logic + booking amendments | Backend + Mobile/Web | 3 d |
| Email notifications (SMTP) | Backend | 1 d |
| Push notifications (FCM/APNs) | Mobile + Backend | 2 d |
| Dark mode | Mobile | 1 d |
| Offline mode + cached content | Mobile | 2 d |
| Frontend error monitoring (Sentry) | Web + Mobile | 4 h |
| Prometheus alertmanager rules | Backend | 4 h |
---

## 15. Production Deployment Guide

> **Status:** Ready to deploy. Security hardening (Phase 1) complete. Dockerfiles, CI/CD workflows, and managed-service configs are in place.

### Architecture Overview

```
Internet
  │
  ├── Cloudflare (DNS + DDoS protection)
  │     │
  │     ├── Vercel ──────── Next.js 15 Web Portal  (SSR + Edge)
  │     │
  │     └── Railway ─────── Go API Server  (:8080)
  │                    └─── Go Payment Worker (RabbitMQ consumer)
  │
  └── Managed Services
        ├── Supabase         PostgreSQL 16 (connection pooler)
        ├── Upstash          Redis 7 (TLS — rediss://)
        ├── CloudAMQP        RabbitMQ (AMQPS — amqps://)
        ├── Elastic Cloud    Elasticsearch 8
        └── Expo EAS         Mobile builds → App Store / Google Play
```

---

### 15.1 Managed Services Setup

#### Supabase (PostgreSQL)

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **Settings → Database → Connection String → URI** (pooler mode, port 6543)
3. Copy the `DATABASE_URL` — it includes `?sslmode=require`
4. Run migrations: set `DATABASE_URL` locally and run `make migrate` from `backend/`

#### Upstash (Redis)

1. Create a Redis database at [upstash.com](https://upstash.com)
2. Copy the **REST URL** — it starts with `rediss://` (TLS enabled)
3. Set `REDIS_URL` in Railway. The backend reads `REDIS_URL` if `REDIS_ADDR` is empty.

> **Note:** Update `backend/cmd/api/main.go` Redis client to parse `REDIS_URL` (full URL) in addition to the existing `REDIS_ADDR`/`REDIS_PASSWORD` pair.

#### CloudAMQP (RabbitMQ)

1. Create an instance at [cloudamqp.com](https://cloudamqp.com) (Little Lemur is free)
2. Copy the **AMQP URL** — use the `amqps://` TLS variant for production
3. Set `RABBITMQ_URL` in Railway for both the API and Worker services

#### Elastic Cloud (Elasticsearch)

1. Start a deployment at [elastic.co/cloud](https://www.elastic.co/cloud)
2. From the deployment page, copy the **Cloud URL** and create an **API Key**
3. Set `ELASTICSEARCH_URL` and `ELASTICSEARCH_API_KEY` in Railway

---

### 15.2 Backend — Railway

Railway runs the API and Worker as two separate services from the same repository.

#### Steps

1. Create a new Railway project and link the GitHub repository
2. **API service:**
   - Set **Root Directory** → `backend/`
   - Set **Build Command** → `docker build -f Dockerfile.api -t api .`
   - Set **Start Command** → `/api`
   - Set **Health Check Path** → `/api/v1/health/live`
3. **Worker service:**
   - Duplicate the service, change Dockerfile to `Dockerfile.worker`
   - Enable **Always On** (`RAILWAY_RUN_AS_SERVICE=true`) — the worker must never cold-start
4. Add all environment variables from `backend/.env.production.example`
5. Set `CORS_ALLOWED_ORIGINS=https://stayease.vercel.app` (your Vercel domain)

#### Required Railway Secrets

| Variable | Source |
|----------|--------|
| `DATABASE_URL` | Supabase pooler URI |
| `REDIS_URL` | Upstash `rediss://` URL |
| `RABBITMQ_URL` | CloudAMQP `amqps://` URL |
| `ELASTICSEARCH_URL` | Elastic Cloud endpoint |
| `JWT_SECRET` | `openssl rand -hex 32` |
| `CORS_ALLOWED_ORIGINS` | `https://stayease.vercel.app` |

---

### 15.3 Web Portal — Vercel

1. Import the GitHub repository in the Vercel dashboard
2. Set **Root Directory** → `web/`
3. Vercel auto-detects Next.js 15 — zero config needed
4. Add environment variables:

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_API_URL` | `https://stayease-api.up.railway.app/api/v1` |
| `NEXT_PUBLIC_WS_URL` | `wss://stayease-api.up.railway.app/api/v1/ws/bookings` |

5. Deploy — the CI workflow (`.github/workflows/web.yml`) auto-deploys on push to `main`.

> **Cookie note:** The web uses `withCredentials: true` (Axios) so the HttpOnly `access_token` cookie is sent automatically. Vercel must be on the same top-level domain as the API, or CORS `AllowCredentials: true` must be set with the exact Vercel origin in `CORS_ALLOWED_ORIGINS`.

---

### 15.4 Mobile — Expo EAS

#### First-time setup

```bash
npm install -g eas-cli
cd mobile
eas login           # authenticate with your Expo account
eas build:configure # creates/updates eas.json
```

#### Build for stores

```bash
# Both platforms
eas build --platform all --profile production

# Preview build (internal testing, APK)
eas build --platform android --profile preview
```

#### Submit to stores

```bash
eas submit --platform all --profile production --latest
```

#### Required credentials

| Platform | Requirement |
|----------|-------------|
| iOS | Apple Developer account ($99/yr) + provisioning profile |
| Android | Google Play Console account ($25 one-time) + service account JSON |

---

### 15.5 Security Checklist (Pre-launch)

Run through every item before going live:

- [ ] **JWT in HttpOnly cookie** — `Set-Cookie: access_token=...; HttpOnly; Secure; SameSite=Lax` confirmed in Network tab
- [ ] **WS ticket exchange** — `POST /api/v1/ws/ticket` returns `{ data: { ticket } }`; WS URL contains ticket (not JWT)
- [ ] **CORS_ALLOWED_ORIGINS** set to production domain only (not `*`)
- [ ] **DATABASE_URL** uses `sslmode=require` (Supabase enforces this)
- [ ] **REDIS_URL** uses `rediss://` (TLS) — Upstash requires it
- [ ] **RABBITMQ_URL** uses `amqps://` (TLS) — CloudAMQP provides it
- [ ] **JWT_SECRET** is a fresh 256-bit random value (not the dev default)
- [ ] All dev secrets rotated (DB passwords, Redis passwords)
- [ ] **Rate limiting** active: IP (`rate:ip:<ip>`) + per-user (`rate:user:<id>`)
- [ ] **Body size limit** 2 MB on all `/api/v1` routes
- [ ] **HTTPS enforced** — Railway and Vercel handle TLS termination automatically
- [ ] **Elasticsearch API key** scoped with minimum permissions (read + write hotels index only)
- [ ] **Sentry** (or equivalent) configured for error monitoring in production

---

### 15.6 CI/CD Overview

Three GitHub Actions workflows in `.github/workflows/`:

| Workflow | Trigger | Jobs |
|----------|---------|------|
| `backend.yml` | push to `main` (backend/**) | test → build images → push to GHCR → Railway deploy |
| `web.yml` | push to `main` (web/**) | lint → build → Vercel deploy |
| `mobile.yml` | git tag `v*.*.*` | EAS iOS build + EAS Android build → EAS submit |

#### Required GitHub Secrets

| Secret | Used by |
|--------|---------|
| `RAILWAY_TOKEN` | `backend.yml` deploy step |
| `VERCEL_TOKEN` | `web.yml` deploy step |
| `VERCEL_ORG_ID` | `web.yml` deploy step |
| `VERCEL_PROJECT_ID` | `web.yml` deploy step |
| `EXPO_TOKEN` | `mobile.yml` EAS build + submit |

#### Required GitHub Variables (non-secret)

| Variable | Used by |
|----------|---------|
| `NEXT_PUBLIC_API_URL` | `web.yml` build step |
| `NEXT_PUBLIC_WS_URL` | `web.yml` build step |

---

### 15.7 Verification Steps

After deploying, verify each layer:

```bash
# 1. Backend health
curl https://stayease-api.up.railway.app/api/v1/health/live
# → {"success":true,"data":{"status":"ok"}}

# 2. WS ticket exchange
TOKEN=$(curl -s -X POST https://stayease-api.up.railway.app/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"owner@stayease.app","password":"Password123"}' | jq -r '.data.access_token')

curl -s -X POST https://stayease-api.up.railway.app/api/v1/ws/ticket \
  -H "Authorization: Bearer $TOKEN"
# → {"data":{"ticket":"<32-hex-chars>"}}

# 3. WS connection (wscat)
wscat -c "wss://stayease-api.up.railway.app/api/v1/ws/bookings?ticket=<ticket>"
# → {"type":"connected","payload":{"user_id":"..."}}

# 4. Login sets HttpOnly cookie (browser Network tab)
# → Response headers: Set-Cookie: access_token=...; HttpOnly; Secure; SameSite=Lax

# 5. Second connect with same ticket → 401 (replay prevention)
wscat -c "wss://stayease-api.up.railway.app/api/v1/ws/bookings?ticket=<same-ticket>"
# → HTTP 401

# 6. Docker image size check (run locally)
docker build -f backend/Dockerfile.api -t api-test backend/
docker image inspect api-test --format='{{.Size}}' | awk '{printf "%.1f MB\n", $1/1024/1024}'
# → < 20 MB

# 7. Next.js standalone build
cd web && npm run build
ls .next/standalone/
# → server.js  node_modules/  ...
```

---

### 15.8 Rollback Procedure

| Layer | Rollback Method |
|-------|----------------|
| Backend API | Railway: redeploy previous deployment from the dashboard |
| Backend Worker | Railway: same — redeploy previous deployment |
| Web | Vercel: instant rollback from the Vercel dashboard → Deployments |
| Mobile | Google Play: halt rollout in the Console; App Store: contact Apple |
| Database | Supabase: point-in-time recovery (PITR) — available on Pro plan |

