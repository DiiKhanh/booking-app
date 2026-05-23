# PRODUCTION.md — StayEase Deployment Guide

> Target: Home server (laptop) + Cloudflare Tunnel + Docker Compose
> Domain: `dikhanh.io.vn` | Registrar: Tenten | DNS/CDN: Cloudflare
> Cập nhật: 2026-05-20

---

## Mục Lục

1. [Kiến Trúc Tổng Quan](#1-kiến-trúc-tổng-quan)
2. [Phân Tích Setup Hiện Tại](#2-phân-tích-setup-hiện-tại)
3. [Domain & DNS Plan](#3-domain--dns-plan)
4. [Cloudflare Setup](#4-cloudflare-setup)
5. [Server Setup](#5-server-setup)
6. [Docker Compose Production](#6-docker-compose-production)
7. [Environment Variables](#7-environment-variables)
8. [CI/CD Pipeline](#8-cicd-pipeline)
9. [Database & Backup](#9-database--backup)
10. [Monitoring & Alerting](#10-monitoring--alerting)
11. [Security Checklist](#11-security-checklist)
12. [Deployment Runbook](#12-deployment-runbook)
13. [Rollback Procedure](#13-rollback-procedure)
14. [Troubleshooting](#14-troubleshooting)
15. [Roadmap Phases](#15-roadmap-phases)

---

## 1. Kiến Trúc Tổng Quan

```
                        INTERNET
                            │
                    ┌───────▼────────┐
                    │   Cloudflare   │
                    │  DNS + CDN +   │
                    │  SSL + Tunnel  │
                    └───────┬────────┘
                            │  Cloudflare Tunnel (mã hóa TLS)
                            │  Không cần mở port router
                            │
              ┌─────────────▼──────────────┐
              │       Laptop Nhà           │
              │   (Home Server / Host)     │
              │                            │
              │  ┌──────────────────────┐  │
              │  │  cloudflared daemon  │  │
              │  │  (Tunnel connector)  │  │
              │  └──────────┬───────────┘  │
              │             │              │
              │  ┌──────────▼───────────┐  │
              │  │   Docker Network     │  │
              │  │  (stayease-prod)     │  │
              │  │                      │  │
              │  │  ┌────────────────┐  │  │
              │  │  │  web :3001     │  │  │  ← dikhanh.io.vn
              │  │  │  api :8080     │  │  │  ← api.dikhanh.io.vn
              │  │  │  worker        │  │  │
              │  │  ├────────────────┤  │  │
              │  │  │  postgres:5432 │  │  │
              │  │  │  redis:6379    │  │  │
              │  │  │  rabbitmq:5672 │  │  │
              │  │  │  elasticsearch │  │  │
              │  │  ├────────────────┤  │  │
              │  │  │  grafana:3000  │  │  │  ← grafana.dikhanh.io.vn
              │  │  │  prometheus    │  │  │
              │  │  │  loki          │  │  │
              │  │  │  jaeger        │  │  │
              │  │  └────────────────┘  │  │
              │  └──────────────────────┘  │
              └────────────────────────────┘

Mobile App (Expo) → api.dikhanh.io.vn (HTTPS/WSS)
```

### Tại sao Cloudflare Tunnel?

| Vấn đề truyền thống | Cloudflare Tunnel giải quyết |
|---------------------|------------------------------|
| ISP dynamic IP thay đổi | Tunnel không phụ thuộc IP |
| Phải mở port router (nguy hiểm) | Kết nối outbound từ server, không cần mở port |
| Cần mua SSL certificate | Cloudflare tự cấp và renew SSL |
| DDoS exposure | Cloudflare làm shield, chặn trước khi tới server |
| Không có CDN | Cloudflare cache static assets |

---

## 2. Phân Tích Setup Hiện Tại

### Đã có

| Thành phần | Trạng thái | Ghi chú |
|-----------|-----------|---------|
| Domain `dikhanh.io.vn` | ✅ Đã mua (Tenten) | Đã trỏ NS về Cloudflare |
| Cloudflare DNS | ✅ Active | Nameserver đã update |
| Cloudflare Tunnel | ✅ Setup | `dikhanh.io.vn` → web, `ssh.dikhanh.io.vn` → SSH |
| Laptop nhà (server) | ✅ Running | VMware Workstation đã cài |
| SSH access | ✅ Working | `ssh user@ssh.dikhanh.io.vn` |
| Docker Compose (infra) | ✅ Có | `devops/docker-compose.yml` |
| Dockerfiles | ✅ Có | `backend/Dockerfile.api`, `backend/Dockerfile.worker`, `web/Dockerfile` |
| GitHub Actions | ✅ Có | Workflow có sẵn nhưng deploy Railway/Vercel — cần đổi sang SSH |

### Cần làm thêm

| Thành phần | Action |
|-----------|--------|
| Subdomains (`api.`, `grafana.`) | Thêm ingress rule vào Cloudflare Tunnel |
| Cloudflare Access | Bảo vệ Grafana, Adminer, RabbitMQ |
| `docker-compose.prod.yml` | Tạo mới — app services (api, worker, web) |
| `.env.production` files | Tạo trên server, không commit |
| CI/CD deploy step | Đổi từ Railway/Vercel → SSH home server |
| Database backup cron | Chưa có |
| Telegram alert | Chưa wire Alertmanager |

---

## 3. Domain & DNS Plan

### Subdomain Map

| Subdomain | Service | Port nội bộ | Visibility |
|-----------|---------|------------|-----------|
| `dikhanh.io.vn` | Next.js web | `3001` | Public |
| `api.dikhanh.io.vn` | Go API | `8080` | Public |
| `ssh.dikhanh.io.vn` | SSH | `22` | Public (SSH protocol) |
| `grafana.dikhanh.io.vn` | Grafana | `3000` | Protected (Cloudflare Access) |
| `rabbitmq.dikhanh.io.vn` | RabbitMQ Management | `15672` | Protected (Cloudflare Access) |
| `adminer.dikhanh.io.vn` | Adminer (DB GUI) | `8081` | Protected (Cloudflare Access) |

> **Protected** = Cloudflare Access hỏi xác thực email trước khi cho vào.
> Không cần basic auth thủ công, không expose trực tiếp ra internet.

### DNS Records (tự động qua Tunnel)

Cloudflare Tunnel tự tạo CNAME records khi config ingress. Không cần tự tạo A record.

```
dikhanh.io.vn       CNAME  <tunnel-id>.cfargotunnel.com
api.dikhanh.io.vn   CNAME  <tunnel-id>.cfargotunnel.com
grafana.dikhanh.io.vn CNAME <tunnel-id>.cfargotunnel.com
...
```

---

## 4. Cloudflare Setup

### 4.1 Cloudflare Tunnel — Ingress Rules

File config tunnel: thường ở `~/.cloudflared/config.yml` trên server.

```yaml
# ~/.cloudflared/config.yml
tunnel: <YOUR_TUNNEL_ID>
credentials-file: /home/user/.cloudflared/<TUNNEL_ID>.json

ingress:
  # Web app
  - hostname: dikhanh.io.vn
    service: http://localhost:3001

  # Go API
  - hostname: api.dikhanh.io.vn
    service: http://localhost:8080
    originRequest:
      noTLSVerify: false

  # Monitoring (sẽ bảo vệ bằng Cloudflare Access)
  - hostname: grafana.dikhanh.io.vn
    service: http://localhost:3000

  - hostname: rabbitmq.dikhanh.io.vn
    service: http://localhost:15672

  - hostname: adminer.dikhanh.io.vn
    service: http://localhost:8081

  # Catch-all — bắt buộc phải có ở cuối
  - service: http_status:404
```

Sau khi sửa config, reload tunnel:
```bash
sudo systemctl restart cloudflared
# hoặc nếu chạy manual:
cloudflared tunnel run <tunnel-name>
```

### 4.2 Cloudflare Access — Bảo vệ Admin Tools

**Mục đích:** Grafana, RabbitMQ, Adminer không được public — chỉ bạn mới vào được.

**Cách setup:**
1. Cloudflare Dashboard → **Zero Trust** → **Access** → **Applications**
2. Thêm Application:
   - **Name:** `StayEase Admin Tools`
   - **Subdomain:** `grafana.dikhanh.io.vn` (thêm từng cái)
   - **Policy:** Email → `your-email@gmail.com`
   - **Session Duration:** 24h

Khi vào `grafana.dikhanh.io.vn`, Cloudflare sẽ redirect sang trang xác thực email (gửi OTP), pass rồi mới vào được Grafana. Không cần cài gì trên server.

### 4.3 WebSocket Support

Go API dùng WebSocket (`/ws/bookings`). Cloudflare Tunnel mặc định support WebSocket, nhưng cần bật:

Cloudflare Dashboard → **Network** → **WebSockets** → **On**

Và trong tunnel config, với WebSocket endpoint:
```yaml
- hostname: api.dikhanh.io.vn
  service: http://localhost:8080
  originRequest:
    connectTimeout: 30s
    noHappyEyeballs: false
```

### 4.4 Cloudflare Security Settings

- **SSL/TLS Mode:** Full (strict) — đảm bảo HTTPS end-to-end
- **Minimum TLS:** TLS 1.2
- **Auto HTTPS Rewrites:** On
- **HSTS:** Enable (max-age=31536000)
- **Bot Fight Mode:** On (chặn bot scraping)

---

## 5. Server Setup

### 5.1 Yêu Cầu Phần Cứng

| Resource | Minimum | Recommended |
|----------|---------|-------------|
| CPU | 4 cores | 8 cores |
| RAM | 8 GB | 16 GB |
| Disk | 50 GB SSD | 100 GB SSD |
| Network | 10 Mbps upload | 50 Mbps upload |

> **Lý do RAM cao:** PostgreSQL + Redis + Elasticsearch + RabbitMQ + Grafana stack tốn ~4-6 GB.
> Elasticsearch một mình đã cần 2GB heap.

### 5.2 OS & Software

```bash
# OS khuyến nghị: Ubuntu 22.04 LTS (hoặc chạy trong VMware VM)
# Packages cần cài:
sudo apt update && sudo apt install -y \
  docker.io \
  docker-compose-plugin \
  git \
  make \
  htop \
  curl \
  unzip

# Add user vào docker group (không cần sudo mỗi lần)
sudo usermod -aG docker $USER
newgrp docker

# Verify
docker --version          # Docker 24+
docker compose version    # Docker Compose v2+
```

### 5.3 cloudflared Setup (Systemd Service)

```bash
# Download cloudflared
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 \
  -o /usr/local/bin/cloudflared
chmod +x /usr/local/bin/cloudflared

# Login và tạo tunnel (chỉ làm 1 lần)
cloudflared tunnel login
cloudflared tunnel create stayease-tunnel

# Copy credential file
# Xem tunnel ID:
cloudflared tunnel list

# Install systemd service
cloudflared service install

# Start và enable
sudo systemctl enable cloudflared
sudo systemctl start cloudflared
sudo systemctl status cloudflared
```

### 5.4 Directory Structure trên Server

```
/home/user/
├── booking-app/           # Clone repo
│   ├── backend/
│   ├── web/
│   ├── mobile/
│   ├── devops/
│   ├── docker-compose.prod.yml   # App services
│   └── .env.prod                 # Root env (shared secrets)
├── secrets/               # KHÔNG đưa vào repo
│   ├── backend.env
│   ├── web.env
│   └── postgres_password
├── backups/               # DB backups
│   └── YYYY-MM-DD.sql.gz
└── logs/                  # App logs (nếu mount)
```

### 5.5 SSH Key Setup (cho CI/CD)

```bash
# Tạo SSH key riêng cho GitHub Actions (trên máy local)
ssh-keygen -t ed25519 -C "github-actions@stayease" -f ~/.ssh/stayease_deploy

# Copy public key vào server
ssh-copy-id -i ~/.ssh/stayease_deploy.pub user@ssh.dikhanh.io.vn

# Nội dung private key (stayease_deploy) → lưu vào GitHub Secret: SSH_PRIVATE_KEY
cat ~/.ssh/stayease_deploy
```

---

## 6. Docker Compose Production

### 6.1 Chiến Lược: 2 Compose Files

| File | Nội dung | Khi nào dùng |
|------|---------|-------------|
| `devops/docker-compose.yml` | Infra + Monitoring (PostgreSQL, Redis, ES, RabbitMQ, Prometheus, Grafana, Loki, Jaeger) | Luôn chạy |
| `docker-compose.prod.yml` | App services (api, worker, web) | Deploy theo CI/CD |

Hai file dùng chung **một Docker network** (`stayease-prod`) để các container giao tiếp với nhau.

### 6.2 `docker-compose.prod.yml`

```yaml
# docker-compose.prod.yml
# App services — deploy bằng CI/CD
# Infrastructure chạy từ devops/docker-compose.yml

networks:
  stayease-prod:
    external: true   # Network được tạo bởi devops/docker-compose.yml

services:

  # ─── Go API Server ──────────────────────────────────────────────────────────
  api:
    image: ghcr.io/${GITHUB_REPOSITORY}/stayease-api:${IMAGE_TAG:-latest}
    container_name: stayease-api
    restart: unless-stopped
    env_file: ~/secrets/backend.env
    ports:
      - "8080:8080"         # Cloudflare Tunnel → :8080
    networks:
      - stayease-prod
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/health/live"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 15s
    logging:
      driver: "json-file"
      options:
        max-size: "50m"
        max-file: "5"
    deploy:
      resources:
        limits:
          memory: 512M

  # ─── Payment Worker ──────────────────────────────────────────────────────────
  worker:
    image: ghcr.io/${GITHUB_REPOSITORY}/stayease-worker:${IMAGE_TAG:-latest}
    container_name: stayease-worker
    restart: unless-stopped
    env_file: ~/secrets/backend.env
    networks:
      - stayease-prod
    depends_on:
      - api
      - rabbitmq
    logging:
      driver: "json-file"
      options:
        max-size: "20m"
        max-file: "3"
    deploy:
      resources:
        limits:
          memory: 256M

  # ─── Next.js Web App ─────────────────────────────────────────────────────────
  web:
    image: ghcr.io/${GITHUB_REPOSITORY}/stayease-web:${IMAGE_TAG:-latest}
    container_name: stayease-web
    restart: unless-stopped
    env_file: ~/secrets/web.env
    ports:
      - "3001:3000"         # Cloudflare Tunnel → :3001
    networks:
      - stayease-prod
    depends_on:
      - api
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000"]
      interval: 30s
      timeout: 10s
      retries: 3
    logging:
      driver: "json-file"
      options:
        max-size: "50m"
        max-file: "5"
    deploy:
      resources:
        limits:
          memory: 512M
```

### 6.3 Sửa `devops/docker-compose.yml` — Thêm network và expose ports

Thêm vào cuối file devops compose:

```yaml
# Thêm vào networks section của devops/docker-compose.yml
networks:
  stayease-prod:
    name: stayease-prod    # Đặt tên cố định để prod compose dùng được
    driver: bridge
```

Đảm bảo các service infra (postgres, redis, rabbitmq, elasticsearch) đều thuộc network `stayease-prod`.

### 6.4 Commands Hàng Ngày

```bash
# Start toàn bộ stack
cd ~/booking-app/devops && docker compose up -d
cd ~/booking-app && docker compose -f docker-compose.prod.yml up -d

# Xem logs real-time
docker compose -f docker-compose.prod.yml logs -f api
docker compose -f docker-compose.prod.yml logs -f worker

# Restart một service
docker compose -f docker-compose.prod.yml restart api

# Pull image mới và restart (manual deploy)
docker compose -f docker-compose.prod.yml pull api worker web
docker compose -f docker-compose.prod.yml up -d --no-deps api worker web

# Xem trạng thái tất cả containers
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# Stats resource usage
docker stats --no-stream
```

---

## 7. Environment Variables

### 7.1 Backend (`~/secrets/backend.env`)

```bash
# ── App ────────────────────────────────────────────────────────────────
APP_NAME=stayease-api
HTTP_PORT=8080
ENVIRONMENT=production

# ── PostgreSQL ──────────────────────────────────────────────────────────
# Chạy trong Docker network, kết nối qua container name
DB_HOST=booking-postgres
DB_PORT=5432
DB_USER=stayease_user
DB_PASSWORD=<STRONG_RANDOM_PASSWORD>
DB_NAME=booking_db
DB_SSLMODE=disable          # Internal Docker network, không cần SSL
# hoặc dùng DSN:
DATABASE_URL=postgres://stayease_user:<PASSWORD>@booking-postgres:5432/booking_db?sslmode=disable

# ── Redis ───────────────────────────────────────────────────────────────
REDIS_URL=redis://booking-redis:6379
# Nếu set password cho Redis:
# REDIS_URL=redis://:password@booking-redis:6379

# ── RabbitMQ ────────────────────────────────────────────────────────────
RABBITMQ_URL=amqp://guest:guest@booking-rabbitmq:5672/

# ── Elasticsearch ───────────────────────────────────────────────────────
ES_URL=http://booking-elasticsearch:9200
ES_INDEX=hotels

# ── JWT ─────────────────────────────────────────────────────────────────
# Generate: openssl rand -hex 32
JWT_SECRET=<64-CHAR-RANDOM-STRING>
JWT_ACCESS_TOKEN_TTL=15m
JWT_REFRESH_TOKEN_TTL=7d

# ── CORS ────────────────────────────────────────────────────────────────
CORS_ALLOWED_ORIGINS=https://dikhanh.io.vn

# ── Rate Limiting ────────────────────────────────────────────────────────
RATE_LIMIT_PUBLIC=100
RATE_LIMIT_AUTH=30

# ── OpenTelemetry / Jaeger ───────────────────────────────────────────────
JAEGER_ENDPOINT=http://booking-jaeger:4318/v1/traces
OTEL_SERVICE_NAME=stayease-api

# ── Misc ─────────────────────────────────────────────────────────────────
LOG_LEVEL=info
```

### 7.2 Web (`~/secrets/web.env`)

```bash
NEXT_PUBLIC_API_URL=https://api.dikhanh.io.vn/api/v1
NEXT_PUBLIC_WS_URL=wss://api.dikhanh.io.vn/api/v1/ws/bookings
```

### 7.3 Mobile (`.env` → build EAS)

```bash
EXPO_PUBLIC_API_URL=https://api.dikhanh.io.vn
EXPO_PUBLIC_WS_URL=wss://api.dikhanh.io.vn
```

> Mobile không deploy lên server. Chỉ cần update URL và build lại EAS (hoặc Expo Go).

### 7.4 Quy Tắc Secrets

- **KHÔNG bao giờ** commit `.env` file lên Git
- File `~/secrets/` chỉ tồn tại trên server, không trong repo
- Generate passwords mạnh: `openssl rand -base64 32`
- Generate JWT secret: `openssl rand -hex 32`
- Rotate JWT secret khi nghi ngờ bị lộ (mọi user phải login lại)

---

## 8. CI/CD Pipeline

### 8.1 Tổng Quan Flow

```
Developer push code
        │
        ▼
┌─────────────────────────────────────────────────┐
│              GitHub Actions                     │
│                                                 │
│  1. Test        (go test / npm lint)            │
│  2. Build       (docker build)                  │
│  3. Push        (ghcr.io — GitHub Container     │
│                  Registry, miễn phí)            │
│  4. Deploy      (SSH → server → docker pull     │
│                  → docker compose up)           │
└─────────────────────────────────────────────────┘
        │
        ▼
   Server nhà
   pull image mới
   restart container
```

### 8.2 GitHub Secrets Cần Cấu Hình

Vào GitHub repo → **Settings** → **Secrets and variables** → **Actions**:

| Secret Name | Value |
|-------------|-------|
| `SSH_HOST` | `ssh.dikhanh.io.vn` |
| `SSH_USER` | `user` (username trên server) |
| `SSH_PRIVATE_KEY` | Nội dung file `~/.ssh/stayease_deploy` |
| `SSH_PORT` | `22` |

### 8.3 Workflow Backend (`.github/workflows/backend.yml`)

Giữ nguyên phần **test** và **build-and-push**, chỉ đổi **deploy step**:

```yaml
  deploy:
    name: Deploy to Home Server
    runs-on: ubuntu-latest
    needs: build-and-push
    environment: production
    steps:
      - name: Deploy via SSH
        uses: appleboy/ssh-action@v1.0.3
        with:
          host: ${{ secrets.SSH_HOST }}
          username: ${{ secrets.SSH_USER }}
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          port: ${{ secrets.SSH_PORT }}
          script: |
            set -e

            # Pull image mới nhất
            docker pull ghcr.io/${{ github.repository }}/stayease-api:latest
            docker pull ghcr.io/${{ github.repository }}/stayease-worker:latest

            # Run migration trước khi restart (zero-downtime migration pattern)
            docker run --rm \
              --env-file ~/secrets/backend.env \
              --network stayease-prod \
              ghcr.io/${{ github.repository }}/stayease-api:latest \
              /app/api migrate

            # Restart app services (giữ nguyên infra)
            cd ~/booking-app
            IMAGE_TAG=latest docker compose -f docker-compose.prod.yml up -d --no-deps api worker

            # Health check
            sleep 10
            curl -f http://localhost:8080/health/ready || exit 1

            echo "✅ Backend deployed successfully"
```

### 8.4 Workflow Web (`.github/workflows/web.yml`)

Thêm build image + deploy step:

```yaml
  build-image:
    name: Build & Push Web Image
    runs-on: ubuntu-latest
    needs: build   # sau khi build Next.js thành công
    permissions:
      contents: read
      packages: write
    steps:
      - uses: actions/checkout@v4
      - name: Log in to GHCR
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - name: Build and push web image
        uses: docker/build-push-action@v5
        with:
          context: web
          push: true
          tags: |
            ghcr.io/${{ github.repository }}/stayease-web:${{ github.sha }}
            ghcr.io/${{ github.repository }}/stayease-web:latest
          build-args: |
            NEXT_PUBLIC_API_URL=https://api.dikhanh.io.vn/api/v1
            NEXT_PUBLIC_WS_URL=wss://api.dikhanh.io.vn/api/v1/ws/bookings
          cache-from: type=gha
          cache-to: type=gha,mode=max

  deploy:
    name: Deploy Web to Home Server
    runs-on: ubuntu-latest
    needs: build-image
    environment: production
    steps:
      - name: Deploy via SSH
        uses: appleboy/ssh-action@v1.0.3
        with:
          host: ${{ secrets.SSH_HOST }}
          username: ${{ secrets.SSH_USER }}
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          port: ${{ secrets.SSH_PORT }}
          script: |
            set -e
            docker pull ghcr.io/${{ github.repository }}/stayease-web:latest
            cd ~/booking-app
            IMAGE_TAG=latest docker compose -f docker-compose.prod.yml up -d --no-deps web
            sleep 10
            curl -f http://localhost:3001 || exit 1
            echo "✅ Web deployed successfully"
```

### 8.5 GitHub Container Registry — Cho phép pull

Docker image lưu ở GitHub Container Registry (GHCR) — miễn phí cho public repo. Với private repo cần login trên server:

```bash
# Trên server nhà — login vào GHCR
echo $GITHUB_PAT | docker login ghcr.io -u YOUR_GITHUB_USERNAME --password-stdin

# GITHUB_PAT: tạo tại GitHub → Settings → Developer settings → Personal access tokens
# Scope cần: read:packages
```

---

## 9. Database & Backup

### 9.1 PostgreSQL Backup Tự Động

```bash
# Tạo script backup
cat > ~/scripts/backup-db.sh << 'EOF'
#!/bin/bash
set -e

BACKUP_DIR=~/backups
DATE=$(date +%Y-%m-%d_%H-%M)
FILENAME="booking_db_${DATE}.sql.gz"

mkdir -p $BACKUP_DIR

# Dump và compress
docker exec booking-postgres pg_dump \
  -U stayease_user \
  -d booking_db \
  | gzip > $BACKUP_DIR/$FILENAME

echo "✅ Backup created: $FILENAME ($(du -sh $BACKUP_DIR/$FILENAME | cut -f1))"

# Giữ 7 ngày gần nhất
find $BACKUP_DIR -name "*.sql.gz" -mtime +7 -delete
echo "🧹 Old backups cleaned up"
EOF

chmod +x ~/scripts/backup-db.sh
```

```bash
# Thêm vào crontab (backup 2h sáng mỗi ngày)
crontab -e
# Thêm dòng:
0 2 * * * ~/scripts/backup-db.sh >> ~/logs/backup.log 2>&1
```

### 9.2 Restore Database

```bash
# Restore từ backup
gunzip -c ~/backups/booking_db_2026-05-20_02-00.sql.gz \
  | docker exec -i booking-postgres psql -U stayease_user -d booking_db
```

### 9.3 Redis Persistence

Redis mặc định dùng RDB snapshots. Đảm bảo `devops/docker-compose.yml` mount volume:

```yaml
redis:
  volumes:
    - redis-data:/data   # Persist Redis data qua restart
  command: redis-server --appendonly yes  # AOF persistence
```

---

## 10. Monitoring & Alerting

### 10.1 Stack Đã Có

| Service | URL (internal) | Mục đích |
|---------|---------------|---------|
| Grafana | `grafana.dikhanh.io.vn` | Dashboards tổng hợp |
| Prometheus | `localhost:9090` | Metrics storage |
| Loki | `localhost:3100` | Log aggregation |
| Jaeger | `localhost:16686` | Distributed tracing |
| Alertmanager | `localhost:9093` | Alert routing |

### 10.2 Telegram Alert Setup

```bash
# Bước 1: Tạo Telegram Bot
# Chat với @BotFather → /newbot → lưu BOT_TOKEN

# Bước 2: Lấy Chat ID
# Chat với bot của bạn, sau đó:
curl https://api.telegram.org/bot<BOT_TOKEN>/getUpdates
# Lấy chat.id từ response
```

```yaml
# devops/alertmanager/config.yml
global:
  resolve_timeout: 5m

route:
  group_by: ['alertname', 'severity']
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 4h
  receiver: 'telegram'

receivers:
  - name: 'telegram'
    telegram_configs:
      - bot_token: '<BOT_TOKEN>'
        chat_id: <CHAT_ID>
        message: |
          🚨 *{{ .GroupLabels.alertname }}*
          Severity: {{ .GroupLabels.severity }}
          {{ range .Alerts }}
          • {{ .Annotations.summary }}
          {{ end }}
        parse_mode: 'Markdown'

inhibit_rules:
  - source_match:
      severity: 'critical'
    target_match:
      severity: 'warning'
    equal: ['alertname']
```

### 10.3 Alert Rules Quan Trọng

```yaml
# devops/prometheus/alert-rules.yml — thêm rules:
groups:
  - name: stayease
    rules:
      # API down
      - alert: APIDown
        expr: up{job="stayease-api"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "StayEase API is down"

      # High error rate
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Error rate > 10%: {{ $value | humanizePercentage }}"

      # Database connection pool exhausted
      - alert: DBConnectionHigh
        expr: db_connections_active / db_connections_max > 0.8
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "DB connections at {{ $value | humanizePercentage }}"

      # Disk space
      - alert: DiskSpaceLow
        expr: (node_filesystem_avail_bytes / node_filesystem_size_bytes) < 0.1
        for: 10m
        labels:
          severity: critical
        annotations:
          summary: "Disk space below 10%"

      # Memory pressure
      - alert: HighMemoryUsage
        expr: (1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) > 0.85
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Memory usage > 85%"
```

---

## 11. Security Checklist

### Cloudflare

- [ ] SSL/TLS Mode: **Full (strict)**
- [ ] Minimum TLS Version: **1.2**
- [ ] HSTS enabled
- [ ] Bot Fight Mode: **On**
- [ ] Cloudflare Access bảo vệ: Grafana, RabbitMQ, Adminer
- [ ] WebSockets: **On** (cho WS endpoint)

### Server

- [ ] SSH chỉ dùng key, tắt password auth:
  ```bash
  # /etc/ssh/sshd_config
  PasswordAuthentication no
  PubkeyAuthentication yes
  ```
- [ ] Firewall: chỉ cho phép port 22 từ ngoài (Cloudflare Tunnel handle phần còn lại)
  ```bash
  sudo ufw allow 22/tcp
  sudo ufw enable
  # Không cần mở 8080, 3001 ra ngoài — Tunnel handle internally
  ```
- [ ] Docker không expose port ra ngoài host nếu không cần
- [ ] `~/secrets/` chỉ có user owner đọc được: `chmod 600 ~/secrets/*`

### Application

- [ ] CORS: chỉ allow `https://dikhanh.io.vn`
- [ ] JWT secret: 256-bit random, không hardcode
- [ ] Passwords: `openssl rand -base64 32` cho mỗi service
- [ ] Rate limiting: đã có 3 lớp (IP public, IP auth, per-user)
- [ ] Body limit: 2MB (đã có middleware)
- [ ] Không log sensitive data (passwords, tokens)

### Docker

- [ ] Images dùng non-root user (đã có trong Dockerfiles distroless)
- [ ] `restart: unless-stopped` cho tất cả production containers
- [ ] Memory limits đặt trong compose
- [ ] Log rotation: `max-size` và `max-file`

---

## 12. Deployment Runbook

### 12.1 First-Time Setup (Chỉ làm 1 lần)

```bash
# [SERVER] SSH vào server
ssh user@ssh.dikhanh.io.vn

# [SERVER] Clone repo
git clone https://github.com/YOUR_USERNAME/booking-app ~/booking-app

# [SERVER] Tạo secrets directory
mkdir -p ~/secrets ~/backups ~/logs ~/scripts
chmod 700 ~/secrets

# [SERVER] Tạo env files
nano ~/secrets/backend.env   # Điền theo mục 7.1
nano ~/secrets/web.env       # Điền theo mục 7.2

# [SERVER] Login GHCR
echo $GITHUB_PAT | docker login ghcr.io -u YOUR_USERNAME --password-stdin

# [SERVER] Start infra (PostgreSQL, Redis, Elasticsearch, RabbitMQ, monitoring)
cd ~/booking-app/devops
docker compose up -d

# Chờ Elasticsearch healthy (~30s)
docker compose ps   # Kiểm tra tất cả healthy

# [SERVER] Run database migration
docker run --rm \
  --env-file ~/secrets/backend.env \
  --network stayease-prod \
  ghcr.io/YOUR_USERNAME/booking-app/stayease-api:latest \
  /app/api migrate

# Nếu lệnh migrate chưa có, dùng:
cd ~/booking-app/backend
# Cần Go cài trên server hoặc chạy qua container đặc biệt

# [SERVER] Start app services
cd ~/booking-app
docker compose -f docker-compose.prod.yml up -d

# [SERVER] Verify
docker ps
curl http://localhost:8080/health/ready
curl http://localhost:3001
```

### 12.2 Regular Deployment (CI/CD tự động sau Phase 2)

```
git push origin main → GitHub Actions chạy → tự deploy
```

### 12.3 Manual Hotfix Deploy

```bash
# [SERVER] Pull image mới nhất và restart
docker pull ghcr.io/YOUR_USERNAME/booking-app/stayease-api:latest
cd ~/booking-app
docker compose -f docker-compose.prod.yml up -d --no-deps api

# Verify
sleep 5 && curl -f http://localhost:8080/health/ready
docker logs stayease-api --tail 50
```

---

## 13. Rollback Procedure

### Rollback App Service

```bash
# [SERVER] Xem danh sách images đang có
docker images ghcr.io/YOUR_USERNAME/booking-app/stayease-api

# Pull version cụ thể (dùng commit SHA từ GitHub Actions)
docker pull ghcr.io/YOUR_USERNAME/booking-app/stayease-api:<COMMIT_SHA>

# Restart với version cũ
IMAGE_TAG=<COMMIT_SHA> docker compose -f docker-compose.prod.yml up -d --no-deps api
```

### Rollback Database

```bash
# CẢNH BÁO: Thao tác này mất data từ thời điểm backup đến hiện tại
# Chỉ làm khi thực sự cần thiết

# Stop app trước
docker compose -f docker-compose.prod.yml stop api worker

# Restore backup
gunzip -c ~/backups/booking_db_2026-05-20_02-00.sql.gz \
  | docker exec -i booking-postgres psql -U stayease_user -d booking_db

# Restart
docker compose -f docker-compose.prod.yml start api worker
```

### Rollback Migration (Nếu migration gây lỗi)

```bash
# Down migration
# Cần có down.sql file tương ứng trong migrations/

# Ví dụ rollback migration 000008:
docker exec -i booking-postgres psql -U stayease_user -d booking_db \
  < ~/booking-app/backend/migrations/000008_password_resets.down.sql
```

---

## 14. Troubleshooting

### API không phản hồi

```bash
# 1. Check container đang chạy không
docker ps | grep stayease-api

# 2. Xem logs
docker logs stayease-api --tail 100 -f

# 3. Check health endpoint
curl -v http://localhost:8080/health/live

# 4. Check database connection
docker logs stayease-api 2>&1 | grep -i "database\|postgres\|connection"

# 5. Restart nếu cần
docker compose -f docker-compose.prod.yml restart api
```

### WebSocket không connect

```bash
# 1. Check Cloudflare WebSockets setting: ON
# 2. Check tunnel config có timeout đủ lớn
# 3. Test WS locally trước
wscat -c ws://localhost:8080/api/v1/ws/bookings

# 4. Check logs
docker logs stayease-api 2>&1 | grep -i "websocket\|ws\|upgrade"
```

### Elasticsearch không start

```bash
# ES cần vm.max_map_count đủ lớn
sudo sysctl -w vm.max_map_count=262144

# Persistent (thêm vào /etc/sysctl.conf):
echo "vm.max_map_count=262144" | sudo tee -a /etc/sysctl.conf
```

### Hết disk space

```bash
# Xem usage
df -h
du -sh ~/backups/* | sort -h

# Xóa Docker images không dùng
docker image prune -a --filter "until=72h"

# Xóa volumes không dùng
docker volume prune

# Xóa logs cũ
docker logs stayease-api --until="2026-05-01" > /dev/null
```

### Cloudflare Tunnel bị mất kết nối

```bash
# Check service
sudo systemctl status cloudflared

# Xem logs
sudo journalctl -u cloudflared -f

# Restart
sudo systemctl restart cloudflared

# Nếu vẫn lỗi: check config file
cloudflared tunnel ingress validate
```

---

## 15. Roadmap Phases

### Phase 1 — Có URL thật (Ưu tiên cao)

**Mục tiêu:** App chạy được từ internet, mobile kết nối được API production.

- [ ] Thêm subdomains vào Cloudflare Tunnel config (`api.`, `grafana.`, `rabbitmq.`, `adminer.`)
- [ ] Setup Cloudflare Access cho admin tools
- [ ] Tạo `~/secrets/backend.env` và `~/secrets/web.env` trên server
- [ ] Update `devops/docker-compose.yml` — thêm network name cố định
- [ ] Tạo `docker-compose.prod.yml` (nội dung ở mục 6.2)
- [ ] First-time deploy theo runbook mục 12.1
- [ ] Verify: `curl https://api.dikhanh.io.vn/health/ready`
- [ ] Build Expo với `EXPO_PUBLIC_API_URL=https://api.dikhanh.io.vn`

**Học được:** Docker networking, reverse proxy concept, DNS routing, HTTPS/TLS.

---

### Phase 2 — CI/CD Tự Động (Ưu tiên trung bình)

**Mục tiêu:** Push code → tự test → tự deploy. Không cần SSH thủ công mỗi lần.

- [ ] Tạo SSH deploy key, thêm vào GitHub Secrets
- [ ] Đổi deploy step trong `backend.yml`: Railway → SSH
- [ ] Thêm build-image + deploy step vào `web.yml`
- [ ] Test full pipeline: push → xem Actions → verify server
- [ ] Setup GitHub Environments (production) với required approvals

**Học được:** CI/CD concepts, GitHub Actions, Docker Registry, automated testing in pipeline.

---

### Phase 3 — Reliability (Ưu tiên trung bình)

**Mục tiêu:** App tự phục hồi khi lỗi, có cảnh báo sớm.

- [ ] Cài đặt backup cron (mục 9.1)
- [ ] Setup Telegram bot alert
- [ ] Cấu hình Alertmanager → Telegram (mục 10.2)
- [ ] Thêm alert rules (mục 10.3)
- [ ] Test alert: tắt api container, xem có nhận Telegram không
- [ ] Đặt memory limits trong compose
- [ ] Setup log rotation

**Học được:** Ops mindset, alerting strategy, SLA/SLO concepts.

---

### Phase 4 — VM Isolation (Tuỳ chọn — nếu muốn học networking)

**Mục tiêu:** Mỗi tier chạy trong VM riêng, mô phỏng production thực tế.

```
VMware Workstation
├── VM1: Ubuntu — Database tier (PostgreSQL, Redis)
├── VM2: Ubuntu — App tier (API, Worker)
├── VM3: Ubuntu — Web tier (Next.js)
└── VM4: Ubuntu — Monitoring (Grafana, Prometheus, Loki)

Internal VMware Network: 192.168.100.0/24
Cloudflare Tunnel chạy trên Host → route vào VM theo IP
```

- [ ] Tạo 4 VMs trong VMware Workstation
- [ ] Cấu hình VMware internal network
- [ ] Deploy từng tier vào VM tương ứng
- [ ] Config Nginx làm gateway trong VM gateway

**Học được:** Network segmentation, VM management, Nginx reverse proxy, firewall rules.

---

### Phase 5 — Kubernetes (Tuỳ chọn — nếu muốn học K8s)

**Mục tiêu:** Học Kubernetes concepts với K3s trên laptop nhà.

```bash
# K3s — Kubernetes nhẹ, chạy tốt với 4GB RAM
curl -sfL https://get.k3s.io | sh -
```

- [ ] Cài K3s single-node
- [ ] Viết Kubernetes manifests (Deployment, Service, ConfigMap, Secret)
- [ ] Deploy StayEase lên K3s
- [ ] Setup Helm chart
- [ ] Rolling updates, resource limits, liveness/readiness probes

**Học được:** K8s core concepts, kubectl, Helm, pod lifecycle, service discovery.

---

## Tham Khảo

| Tài nguyên | Link |
|-----------|------|
| Cloudflare Tunnel docs | https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/ |
| Cloudflare Access docs | https://developers.cloudflare.com/cloudflare-one/policies/access/ |
| GitHub Actions | https://docs.github.com/en/actions |
| GitHub Container Registry | https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry |
| appleboy/ssh-action | https://github.com/appleboy/ssh-action |
| Docker Compose docs | https://docs.docker.com/compose/ |
| K3s | https://k3s.io/ |
