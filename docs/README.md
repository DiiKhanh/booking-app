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
[worker]   → go run cmd/worker/main.go       (no port — consumes RabbitMQ)
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
go run cmd/worker/main.go
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
go run cmd/worker/main.go
```

### Bookings stuck at `awaiting_payment`

The payment worker is not running. Start it:

```bash
cd booking-app/backend
go run cmd/worker/main.go
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
go run cmd/worker/main.go
```

---

## Quick Reference — Terminal Layout

```
Tab 1 │ cd backend && docker compose up
Tab 2 │ cd backend && make server
Tab 3 │ cd backend && go run cmd/worker/main.go
Tab 4 │ cd web    && npm run dev -- -p 3001
Tab 5 │ cd mobile && npm run ios
```
