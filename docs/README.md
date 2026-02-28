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