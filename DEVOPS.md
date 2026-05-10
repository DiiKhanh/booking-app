# DEVOPS.md — StayEase DevOps Learning Roadmap

> **Mục tiêu**: Dùng chính project StayEase để học và thực hành toàn bộ DevOps stack từ Docker đến Kubernetes, GitOps, Observability, và IaC. Mỗi phase đều có lý thuyết cần nắm + việc cụ thể cần làm trên project này.

---

## Trạng thái hiện tại

| Thành phần | Trạng thái | Chi tiết |
|---|---|---|
| Docker | ✅ Có sẵn | `backend/Dockerfile.api`, `Dockerfile.worker`, `web/Dockerfile` — multi-stage, distroless |
| Docker Compose | ✅ Có sẵn | `backend/docker-compose.yml` (dev), `docker-compose.prod.yml` (prod) |
| GitHub Actions | ✅ Có sẵn | `.github/workflows/backend.yml`, `web.yml`, `mobile.yml` — test + build + push GHCR |
| Prometheus | ✅ Partial | `prometheus/client_golang` trong go.mod, config cơ bản |
| OpenTelemetry | ✅ Partial | `internal/observability/`, Jaeger trong compose — chưa instrument đầy đủ |
| Kubernetes | ❌ Chưa có | Cần tạo toàn bộ manifests |
| Argo CD | ❌ Chưa có | Cần setup GitOps pipeline |
| Terraform | ❌ Chưa có | Cần viết IaC cho cloud infra |
| Helm Charts | ❌ Chưa có | Cần tạo chart cho StayEase |

---

## Lộ trình tổng quan

```
Phase 1 → Docker Mastery         (2 tuần)
Phase 2 → GitHub Actions nâng cao (2 tuần)
Phase 3 → Terraform IaC          (3 tuần)
Phase 4 → Kubernetes              (4 tuần)
Phase 5 → GitOps với Argo CD      (2 tuần)
Phase 6 → Prometheus + Grafana    (2 tuần)
Phase 7 → OpenTelemetry tracing   (2 tuần)
─────────────────────────────────────────
Tổng: ~17 tuần (~4 tháng)
```

---

## Phase 1 — Docker Mastery

**Thời gian**: 2 tuần | **Mức độ**: Nền tảng

### Lý thuyết cần nắm

- **Layer caching**: Tại sao `COPY go.mod go.sum` trước `COPY .` lại tiết kiệm build time
- **Multi-stage builds**: Builder stage vs runtime stage — tại sao distroless giảm attack surface
- **Networking**: bridge, host, overlay — container-to-container communication
- **Volume vs Bind mount**: khi nào dùng cái nào
- **Health checks**: `HEALTHCHECK` instruction vs compose `healthcheck`
- **Build context**: `.dockerignore` — không copy `node_modules`, `.git`, `*.test`
- **Resource limits**: `mem_limit`, `cpus` trong compose
- **Compose profiles**: `--profile dev`, `--profile monitoring` để bật/tắt services theo môi trường

### Việc cần làm trên StayEase

**1.1 Cải thiện Dockerfile.api**
```dockerfile
# Thêm vào Dockerfile.api hiện tại:
# - Build args để inject version
ARG VERSION=dev
ARG GIT_COMMIT=unknown
RUN go build -ldflags="-w -s -X main.Version=${VERSION} -X main.GitCommit=${GIT_COMMIT}" ...

# - HEALTHCHECK instruction
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD ["/api", "health"]  # cần thêm health subcommand
```

**1.2 Tạo `.dockerignore` cho backend, web**
```
# backend/.dockerignore
.git
.env*
*_test.go
coverage.out
*.md
```

**1.3 Thêm Compose profiles vào `docker-compose.yml`**
```yaml
# Tách services thành profiles
services:
  postgres:
    profiles: [dev, test, monitoring]
  prometheus:
    profiles: [monitoring]
  grafana:
    profiles: [monitoring]
  elasticsearch:
    profiles: [search]
```

**1.4 Thêm resource limits**
```yaml
services:
  api:
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 256M
        reservations:
          memory: 128M
```

**1.5 Tạo `docker-compose.test.yml`** cho chạy integration tests trong CI

### Kiểm tra đã master Phase 1

- [ ] Build image không cần rebuild layer khi chỉ thay đổi code (go.mod không đổi)
- [ ] `docker compose --profile monitoring up` chỉ bật Prometheus + Grafana
- [ ] `docker stats` cho thấy container bị giới hạn memory đúng config
- [ ] Image size của api < 20MB (distroless)

### Tài liệu tham khảo

- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [Distroless containers](https://github.com/GoogleContainerTools/distroless)
- Play with Docker: https://labs.play-with-docker.com/

---

## Phase 2 — GitHub Actions Nâng Cao

**Thời gian**: 2 tuần | **Mức độ**: Trung bình

### Lý thuyết cần nắm

- **Workflow syntax**: `on`, `jobs`, `steps`, `needs`, `matrix`, `with`, `env`
- **Contexts**: `github`, `env`, `secrets`, `runner`, `job`, `steps`
- **Reusable workflows**: `workflow_call` — tránh duplicate giữa backend/web/mobile
- **Composite actions**: đóng gói logic hay dùng thành action riêng
- **Environments**: `production`, `staging` — protection rules, required reviewers
- **OIDC**: Xác thực với cloud providers không cần long-lived credentials
- **Concurrency**: `concurrency` group — cancel run cũ khi có run mới cho cùng branch
- **Container scanning**: Trivy phát hiện CVE trong Docker image

### Việc cần làm trên StayEase

**2.1 Tách reusable workflow cho Docker build**

Tạo `.github/workflows/_docker-build.yml`:
```yaml
on:
  workflow_call:
    inputs:
      service:
        type: string
        required: true
      dockerfile:
        type: string
        required: true
    secrets:
      GITHUB_TOKEN:
        required: true
```

**2.2 Thêm security scanning vào pipeline**
```yaml
- name: Scan image for vulnerabilities (Trivy)
  uses: aquasecurity/trivy-action@master
  with:
    image-ref: ${{ env.REGISTRY }}/${{ env.IMAGE_PREFIX }}/stayease-api:${{ github.sha }}
    format: sarif
    output: trivy-results.sarif
    severity: CRITICAL,HIGH
    exit-code: '1'

- name: Upload Trivy scan results
  uses: github/codeql-action/upload-sarif@v3
  with:
    sarif_file: trivy-results.sarif
```

**2.3 Thêm semantic versioning + CHANGELOG**

Dùng `semantic-release` hoặc `release-please` để tự động:
- Bump version dựa vào commit messages (`feat:`, `fix:`, `BREAKING CHANGE:`)
- Tạo GitHub Release
- Tag Docker images với semver: `v1.2.3` thay vì chỉ `latest`

**2.4 Thêm workflow cho staging deploy**
```yaml
on:
  push:
    branches: [develop]   # → deploy staging
  push:
    branches: [main]      # → deploy production (với approval)
```

**2.5 Cải thiện caching**
```yaml
# Thay vì cache per-branch, dùng fallback chain
- uses: actions/cache@v4
  with:
    path: ~/go/pkg/mod
    key: ${{ runner.os }}-go-${{ hashFiles('**/go.sum') }}
    restore-keys: |
      ${{ runner.os }}-go-
```

**2.6 Thêm concurrency control**
```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true
```

### Cấu trúc workflows sau phase này

```
.github/
  workflows/
    _docker-build.yml      # reusable: build + scan + push
    _deploy.yml            # reusable: deploy logic
    backend.yml            # gọi _docker-build + _deploy
    web.yml                # gọi _docker-build + _deploy
    release.yml            # semantic release + changelog
    security.yml           # CodeQL, Dependabot alerts
```

### Kiểm tra đã master Phase 2

- [ ] Commit `feat: add hotel search` → tự động bump minor version
- [ ] Image có CVE CRITICAL → pipeline fail ở bước Trivy
- [ ] PR vào main → workflow chạy, chờ approval trước khi deploy prod
- [ ] 2 pushes liên tiếp vào develop → cái sau cancel cái trước

---

## Phase 3 — Terraform IaC

**Thời gian**: 3 tuần | **Mức độ**: Trung bình-Cao

### Lý thuyết cần nắm

- **Terraform workflow**: `init` → `plan` → `apply` → `destroy`
- **State management**: local state (learning) → remote state (production)
  - Backend: S3 + DynamoDB locking (AWS) hoặc Terraform Cloud
- **Core concepts**: providers, resources, data sources, variables, outputs, locals
- **Modules**: tái sử dụng code, public module registry
- **Workspaces**: `staging`, `production` environment separation
- **Import**: đưa existing infra vào quản lý Terraform
- **Lifecycle rules**: `prevent_destroy`, `create_before_destroy`, `ignore_changes`
- **Terraform Cloud**: remote runs, VCS integration, variable sets

### Cloud Provider khuyến nghị cho học

**DigitalOcean** (rẻ nhất, ~$12/tháng cho K8s cluster nhỏ):
```hcl
terraform {
  required_providers {
    digitalocean = {
      source  = "digitalocean/digitalocean"
      version = "~> 2.0"
    }
  }
}
```

Hoặc **AWS Free Tier** nếu muốn resume-friendly hơn.

### Cấu trúc thư mục

```
infra/
  terraform/
    modules/
      vpc/                 # Network module
        main.tf
        variables.tf
        outputs.tf
      k8s-cluster/         # Kubernetes cluster module
        main.tf
        variables.tf
        outputs.tf
      database/            # Managed PostgreSQL module
        main.tf
        variables.tf
        outputs.tf
      cache/               # Managed Redis module
        main.tf
        variables.tf
        outputs.tf
    environments/
      staging/
        main.tf            # gọi modules với staging values
        terraform.tfvars   # staging-specific variables
        backend.tf         # remote state config
      production/
        main.tf
        terraform.tfvars
        backend.tf
    variables.tf           # shared variable definitions
    outputs.tf
```

### Việc cần làm trên StayEase

**3.1 Tạo module `k8s-cluster` (DigitalOcean DOKS hoặc AWS EKS)**

```hcl
# infra/terraform/modules/k8s-cluster/main.tf
resource "digitalocean_kubernetes_cluster" "stayease" {
  name    = "${var.env}-stayease-cluster"
  region  = var.region
  version = "1.31"

  node_pool {
    name       = "worker-pool"
    size       = "s-2vcpu-4gb"   # $24/month — đủ cho học
    node_count = var.node_count
    auto_scale = true
    min_nodes  = 1
    max_nodes  = 3
  }
}
```

**3.2 Tạo module `database`**
```hcl
# Managed PostgreSQL — không cần quản lý backup, failover
resource "digitalocean_database_cluster" "postgres" {
  name       = "${var.env}-stayease-postgres"
  engine     = "pg"
  version    = "16"
  size       = "db-s-1vcpu-1gb"
  region     = var.region
  node_count = 1
}
```

**3.3 Quản lý DNS**
```hcl
resource "digitalocean_domain" "stayease" {
  name = "stayease.example.com"
}

resource "digitalocean_record" "api" {
  domain = digitalocean_domain.stayease.name
  type   = "A"
  name   = "api"
  value  = digitalocean_loadbalancer.ingress.ip
}
```

**3.4 Tích hợp Terraform vào GitHub Actions**
```yaml
# .github/workflows/terraform.yml
- name: Terraform Plan
  run: terraform plan -out=tfplan
  working-directory: infra/terraform/environments/${{ github.event.inputs.env }}

- name: Comment plan on PR
  uses: actions/github-script@v7
  # Post plan output as PR comment để review trước khi apply
```

**3.5 Remote state với Terraform Cloud**
```hcl
# backend.tf
terraform {
  cloud {
    organization = "stayease"
    workspaces {
      name = "stayease-staging"
    }
  }
}
```

### Kiểm tra đã master Phase 3

- [ ] `terraform plan` hiển thị đúng những gì sẽ tạo ra
- [ ] Apply tạo được K8s cluster thực trên cloud
- [ ] Thay đổi `node_count` → plan chỉ thay đổi node pool, không recreate cluster
- [ ] `terraform destroy` xóa sạch không để lại orphaned resources
- [ ] PR với infra changes → plan output tự động comment trên PR

---

## Phase 4 — Kubernetes

**Thời gian**: 4 tuần | **Mức độ**: Cao

### Lý thuyết cần nắm

**Tuần 1 — Core Concepts**
- Pod, ReplicaSet, Deployment, DaemonSet, StatefulSet
- Service: ClusterIP, NodePort, LoadBalancer, ExternalName
- ConfigMap, Secret (và tại sao Secret không thực sự secure by default)
- Namespace — tách môi trường và team
- `kubectl` cheat sheet: `get`, `describe`, `logs`, `exec`, `port-forward`, `apply`, `delete`

**Tuần 2 — Networking & Storage**
- Ingress + Ingress Controller (nginx-ingress)
- TLS termination tại Ingress
- PersistentVolume, PersistentVolumeClaim, StorageClass
- DNS trong cluster: `<service>.<namespace>.svc.cluster.local`

**Tuần 3 — Reliability**
- Liveness probe, Readiness probe, Startup probe — tại sao cần cả 3
- Resource requests vs limits — QoS classes (Guaranteed, Burstable, BestEffort)
- HorizontalPodAutoscaler — scale dựa trên CPU/custom metrics
- PodDisruptionBudget — đảm bảo availability khi drain node
- Rolling update strategy, maxSurge, maxUnavailable
- Init containers — chạy migration trước khi app start

**Tuần 4 — Advanced**
- Helm: chart structure, values.yaml, templates, `helm install/upgrade/rollback`
- Kustomize: base + overlays cho staging/production
- RBAC: ServiceAccount, Role, ClusterRole, RoleBinding
- NetworkPolicy — tường lửa giữa Pods
- Horizontal vs Vertical scaling

### Cấu trúc K8s manifests

```
k8s/
  base/                    # Kustomize base
    namespace.yaml
    api/
      deployment.yaml
      service.yaml
      hpa.yaml
      pdb.yaml
    worker/
      deployment.yaml
    web/
      deployment.yaml
      service.yaml
    ingress/
      ingress.yaml
      cert-issuer.yaml     # cert-manager ClusterIssuer
    monitoring/
      servicemonitor.yaml  # Prometheus ServiceMonitor
    jobs/
      migrate-job.yaml     # Database migration Job
  overlays/
    staging/
      kustomization.yaml   # patches cho staging
      patches/
        replicas-patch.yaml
    production/
      kustomization.yaml
      patches/
        replicas-patch.yaml
        resources-patch.yaml
```

### Việc cần làm trên StayEase

**4.1 Deployment cho API**
```yaml
# k8s/base/api/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: stayease-api
  namespace: stayease
spec:
  replicas: 2
  selector:
    matchLabels:
      app: stayease-api
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0       # zero-downtime deploy
  template:
    spec:
      containers:
        - name: api
          image: ghcr.io/OWNER/stayease-api:latest
          ports:
            - containerPort: 8080
          envFrom:
            - configMapRef:
                name: stayease-config
            - secretRef:
                name: stayease-secrets
          livenessProbe:
            httpGet:
              path: /api/v1/health/live
              port: 8080
            initialDelaySeconds: 10
            periodSeconds: 30
          readinessProbe:
            httpGet:
              path: /api/v1/health/ready
              port: 8080
            initialDelaySeconds: 5
            periodSeconds: 10
          resources:
            requests:
              cpu: 100m
              memory: 128Mi
            limits:
              cpu: 500m
              memory: 256Mi
```

**4.2 Init container cho migration**
```yaml
initContainers:
  - name: migrate
    image: ghcr.io/OWNER/stayease-api:latest
    command: ["/api", "migrate"]
    envFrom:
      - secretRef:
          name: stayease-secrets
```

**4.3 HPA cho API**
```yaml
# k8s/base/api/hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: stayease-api-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: stayease-api
  minReplicas: 2
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    - type: Pods
      pods:
        metric:
          name: http_requests_per_second   # custom metric từ Prometheus
        target:
          type: AverageValue
          averageValue: "100"
```

**4.4 Ingress với TLS**
```yaml
# k8s/base/ingress/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: stayease-ingress
  annotations:
    nginx.ingress.kubernetes.io/rate-limit: "100"
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - api.stayease.example.com
      secretName: stayease-tls
  rules:
    - host: api.stayease.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: stayease-api
                port:
                  number: 8080
```

**4.5 Kustomize overlays**
```yaml
# k8s/overlays/staging/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../../base
namePrefix: staging-
namespace: stayease-staging
patches:
  - path: patches/replicas-patch.yaml
images:
  - name: ghcr.io/OWNER/stayease-api
    newTag: staging-latest
```

**4.6 Local development với kind/minikube**
```bash
# Setup local K8s
kind create cluster --name stayease --config k8s/kind-config.yaml

# Apply manifests
kubectl apply -k k8s/overlays/staging

# Port-forward để test
kubectl port-forward svc/stayease-api 8080:8080 -n stayease
```

### Kiểm tra đã master Phase 4

- [ ] Deploy API và Worker lên cluster local, gọi API thành công
- [ ] Kill 1 pod → K8s tự restart, không có downtime
- [ ] Tăng CPU load → HPA scale thêm pods
- [ ] Deploy version mới → rolling update, không interrupt requests đang xử lý
- [ ] `kubectl rollout undo deployment/stayease-api` → rollback về version cũ
- [ ] `kubectl drain node` → PDB đảm bảo >= 1 pod vẫn chạy

---

## Phase 5 — GitOps với Argo CD

**Thời gian**: 2 tuần | **Mức độ**: Trung bình

### Lý thuyết cần nắm

- **GitOps principles**: Git là single source of truth — cluster state phải match Git state
- **Pull-based vs Push-based deployment**: Argo CD pull thay vì CI push → cluster không cần expose credentials
- **Sync policies**: manual vs automatic, self-heal, prune
- **App of Apps pattern**: một Argo CD App quản lý nhiều Apps
- **Image Updater**: tự động update image tag khi có image mới trên registry
- **ApplicationSet**: tạo nhiều Apps từ một template (multi-cluster, multi-env)
- **Sync waves và hooks**: kiểm soát thứ tự deploy (migrate DB trước khi deploy app)

### GitOps Flow cho StayEase

```
Developer push code
       │
       ▼
GitHub Actions (CI)
  ├── Run tests
  ├── Build Docker image
  ├── Push image ke GHCR với tag: v1.2.3 + sha
  └── Update image tag trong k8s/overlays/*/kustomization.yaml
              │
              ▼
        Git commit/push
              │
              ▼
        Argo CD detects diff
              │
              ▼
        Sync to cluster
              │
              ▼
        Rolling deployment
```

### Việc cần làm trên StayEase

**5.1 Cài đặt Argo CD**
```bash
kubectl create namespace argocd
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml

# Access UI
kubectl port-forward svc/argocd-server -n argocd 8080:443
```

**5.2 Tạo Application manifest**
```yaml
# argocd/apps/stayease-staging.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: stayease-staging
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/YOUR_ORG/booking-app.git
    targetRevision: main
    path: k8s/overlays/staging
  destination:
    server: https://kubernetes.default.svc
    namespace: stayease-staging
  syncPolicy:
    automated:
      prune: true          # xóa resources không còn trong Git
      selfHeal: true       # tự sửa nếu ai đó manual change trên cluster
    syncOptions:
      - CreateNamespace=true
    retry:
      limit: 3
      backoff:
        duration: 5s
        factor: 2
```

**5.3 Tạo App of Apps**
```yaml
# argocd/apps/root.yaml — quản lý tất cả applications
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: stayease-apps
  namespace: argocd
spec:
  source:
    path: argocd/apps
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
```

**5.4 Cập nhật GitHub Actions để update image tag**
```yaml
# Thêm vào cuối job build-and-push
- name: Update image tag in k8s manifests
  run: |
    cd k8s/overlays/staging
    kustomize edit set image \
      ghcr.io/${{ github.repository }}/stayease-api=${{ github.sha }}
    git config user.email "ci@github.com"
    git config user.name "GitHub Actions"
    git add -A
    git commit -m "chore: update api image to ${{ github.sha }}"
    git push
```

**5.5 Sync waves cho database migration**
```yaml
# Chạy migration Job trước Deployment
metadata:
  annotations:
    argocd.argoproj.io/sync-wave: "-1"   # chạy trước (wave âm)
```

**5.6 Cài Argo CD Image Updater (optional)**
```yaml
# Tự động update image tag khi có image mới, không cần CI update manifest
annotations:
  argocd-image-updater.argoproj.io/image-list: api=ghcr.io/OWNER/stayease-api
  argocd-image-updater.argoproj.io/api.update-strategy: digest
  argocd-image-updater.argoproj.io/write-back-method: git
```

### Kiểm tra đã master Phase 5

- [ ] Push code → image build → Argo CD tự động sync trong vòng 3 phút
- [ ] Manually xóa một deployment trên cluster → Argo CD tự tạo lại (self-heal)
- [ ] Argo CD UI hiển thị diff rõ ràng trước khi sync
- [ ] Staging và Production là 2 Argo CD Apps riêng biệt với images khác nhau
- [ ] Rollback = `git revert` → Argo CD tự deploy version cũ

---

## Phase 6 — Prometheus + Grafana

**Thời gian**: 2 tuần | **Mức độ**: Trung bình

### Lý thuyết cần nắm

- **Metric types**: Counter, Gauge, Histogram, Summary — khi nào dùng cái nào
- **PromQL**: `rate()`, `increase()`, `histogram_quantile()`, `label_matchers`, `by`, `without`
- **Recording rules**: pre-compute expensive queries để giảm load
- **AlertManager**: routing, inhibition, silences, receivers
- **Prometheus Operator**: `ServiceMonitor`, `PodMonitor`, `PrometheusRule` — quản lý config bằng K8s CRDs
- **Grafana**: datasources, panels, variables, annotations, alerting
- **Push vs Pull**: Prometheus pull từ `/metrics` — push gateway chỉ dùng cho batch jobs
- **Cardinality**: tại sao không dùng user_id làm label

### Metrics quan trọng cho StayEase

Backend đã có `prometheus/client_golang`. Cần thêm các custom metrics sau:

```go
// internal/observability/metrics.go

// Business metrics
var (
  BookingCreatedTotal = promauto.NewCounterVec(prometheus.CounterOpts{
    Name: "stayease_bookings_created_total",
    Help: "Total number of bookings created",
  }, []string{"status", "hotel_id"})

  PaymentProcessedTotal = promauto.NewCounterVec(prometheus.CounterOpts{
    Name: "stayease_payments_processed_total",
    Help: "Total payments processed",
  }, []string{"outcome"})  // outcome: success, failed, timeout

  ActiveWebSocketConnections = promauto.NewGauge(prometheus.GaugeOpts{
    Name: "stayease_websocket_connections_active",
    Help: "Current number of active WebSocket connections",
  })

  DistributedLockAcquireDuration = promauto.NewHistogramVec(prometheus.HistogramOpts{
    Name:    "stayease_distributed_lock_acquire_seconds",
    Help:    "Time to acquire distributed lock",
    Buckets: []float64{0.001, 0.005, 0.01, 0.05, 0.1, 0.5},
  }, []string{"resource"})

  RoomAvailabilityCacheHits = promauto.NewCounterVec(prometheus.CounterOpts{
    Name: "stayease_cache_operations_total",
    Help: "Cache hits and misses",
  }, []string{"operation", "result"})  // result: hit, miss
)

// Infrastructure metrics (Gin middleware)
var (
  HTTPRequestDuration = promauto.NewHistogramVec(prometheus.HistogramOpts{
    Name:    "http_request_duration_seconds",
    Buckets: prometheus.DefBuckets,
  }, []string{"method", "path", "status_code"})

  HTTPRequestsInFlight = promauto.NewGauge(prometheus.GaugeOpts{
    Name: "http_requests_in_flight",
  })
)
```

### Việc cần làm trên StayEase

**6.1 Cài Prometheus Operator (kube-prometheus-stack)**
```bash
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm install kube-prometheus-stack prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --create-namespace \
  --values k8s/monitoring/prometheus-values.yaml
```

**6.2 Tạo ServiceMonitor cho StayEase API**
```yaml
# k8s/base/monitoring/servicemonitor.yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: stayease-api
  namespace: monitoring
  labels:
    release: kube-prometheus-stack
spec:
  selector:
    matchLabels:
      app: stayease-api
  endpoints:
    - port: http
      path: /metrics
      interval: 15s
  namespaceSelector:
    matchNames:
      - stayease
```

**6.3 Tạo Grafana dashboards**

Dashboard 1 — **Business Overview**:
- Bookings per minute (rate)
- Payment success rate (%)
- Revenue trend (counter × booking value)
- Active users (WebSocket connections)
- Room availability cache hit rate

Dashboard 2 — **API Performance**:
- P50, P95, P99 response time per endpoint
- Error rate (4xx, 5xx)
- Requests per second
- Requests in-flight

Dashboard 3 — **Infrastructure**:
- CPU, Memory per pod
- DB connection pool usage
- Redis hit rate
- RabbitMQ queue depth

**6.4 Viết AlertManager rules**
```yaml
# k8s/base/monitoring/alert-rules.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: stayease-alerts
spec:
  groups:
    - name: stayease.critical
      rules:
        - alert: HighErrorRate
          expr: rate(http_requests_total{status_code=~"5.."}[5m]) > 0.05
          for: 2m
          labels:
            severity: critical
          annotations:
            summary: "Error rate > 5% in last 5 minutes"

        - alert: PaymentSagaHighFailureRate
          expr: |
            rate(stayease_payments_processed_total{outcome="failed"}[10m]) /
            rate(stayease_payments_processed_total[10m]) > 0.2
          for: 5m
          annotations:
            summary: "Payment failure rate > 20%"

        - alert: DistributedLockHighLatency
          expr: |
            histogram_quantile(0.95,
              rate(stayease_distributed_lock_acquire_seconds_bucket[5m])
            ) > 0.5
          for: 3m
          annotations:
            summary: "P95 lock acquisition > 500ms — possible contention"
```

**6.5 Provisioning Grafana dashboards as code**
```
backend/monitoring/grafana/provisioning/
  dashboards/
    dashboard.yml         # datasource config
    stayease-business.json
    stayease-api.json
    stayease-infra.json
  datasources/
    prometheus.yml
```

### PromQL queries hữu ích để học

```promql
# Request rate per endpoint
rate(http_request_duration_seconds_count[5m])

# P99 latency per path
histogram_quantile(0.99, sum(rate(http_request_duration_seconds_bucket[5m])) by (le, path))

# Error rate %
100 * rate(http_requests_total{status_code=~"5.."}[5m]) / rate(http_requests_total[5m])

# Booking success rate (business KPI)
rate(stayease_bookings_created_total{status="confirmed"}[1h]) /
rate(stayease_bookings_created_total[1h]) * 100

# RabbitMQ queue depth trend
rabbitmq_queue_messages{queue="payment.initiated"}
```

### Kiểm tra đã master Phase 6

- [ ] Grafana Business Dashboard hiển thị bookings real-time khi chạy load test
- [ ] Alert `HighErrorRate` fire khi inject lỗi vào API
- [ ] P99 latency của `/bookings` < 200ms dưới normal load
- [ ] Sau deploy mới, `rate()` metric không bị reset (biết dùng `increase()` đúng chỗ)

---

## Phase 7 — OpenTelemetry Distributed Tracing

**Thời gian**: 2 tuần | **Mức độ**: Trung bình-Cao

### Lý thuyết cần nắm

- **Signals**: Traces, Metrics, Logs — OTel unifies cả 3
- **Trace structure**: Trace → Spans → Span Attributes, Events, Links
- **Context propagation**: W3C TraceContext (`traceparent` header) — liên kết traces qua services
- **Sampling**: head-based vs tail-based sampling — cost vs visibility tradeoff
- **Instrumentation**: auto vs manual — biết khi nào cần custom spans
- **Collector**: OTel Collector pipeline — receivers → processors → exporters
- **Backends**: Jaeger (đang dùng), Tempo (Grafana stack), Honeycomb

### Flow tracing cho StayEase

```
Mobile/Web  →  API Server  →  PostgreSQL
                   │        →  Redis
                   │        →  RabbitMQ
                   │
                   ▼
               Worker Service  →  PostgreSQL
                                →  RabbitMQ
```

Một trace booking hoàn chỉnh cần span qua: HTTP → Service → Repository → DB + Redis + MQ → Worker → MQ → DB.

### Việc cần làm trên StayEase

**7.1 Kiểm tra và hoàn thiện `internal/observability/tracer.go`**

Backend đã có OTel setup. Cần verify:
```go
// Đảm bảo tracer init đúng
func InitTracer(cfg *config.Config) (func(), error) {
  exporter, err := otlptracehttp.New(ctx,
    otlptracehttp.WithEndpoint(cfg.OTelEndpoint),  // "jaeger:4318"
    otlptracehttp.WithInsecure(),
  )

  tp := sdktrace.NewTracerProvider(
    sdktrace.WithBatcher(exporter),
    sdktrace.WithResource(resource.NewWithAttributes(
      semconv.SchemaURL,
      semconv.ServiceName("stayease-api"),
      semconv.ServiceVersion(Version),
      attribute.String("env", cfg.Environment),
    )),
    sdktrace.WithSampler(sdktrace.TraceIDRatioBased(0.1)), // 10% sampling prod
  )
  otel.SetTracerProvider(tp)
  otel.SetTextMapPropagator(propagation.TraceContext{})
  return tp.Shutdown, nil
}
```

**7.2 Instrument Gin middleware**
```go
// internal/middleware/tracing.go
func TracingMiddleware() gin.HandlerFunc {
  return otelgin.Middleware("stayease-api")  // dùng go.opentelemetry.io/contrib/instrumentation/github.com/gin-gonic/gin/otelgin
}
```

**7.3 Instrument database queries**
```go
// internal/repository/base.go
func (r *BaseRepository) queryWithTrace(ctx context.Context, query string, args ...any) {
  ctx, span := tracer.Start(ctx, "db.query",
    trace.WithAttributes(
      attribute.String("db.system", "postgresql"),
      attribute.String("db.statement", sanitizeQuery(query)),
    ),
  )
  defer span.End()

  rows, err := r.db.QueryContext(ctx, query, args...)
  if err != nil {
    span.RecordError(err)
    span.SetStatus(codes.Error, err.Error())
  }
}
```

**7.4 Instrument RabbitMQ messages với trace context**
```go
// Inject trace context vào AMQP headers khi publish
func (p *Publisher) Publish(ctx context.Context, exchange, key string, body []byte) error {
  headers := amqp.Table{}
  otel.GetTextMapPropagator().Inject(ctx, amqpHeadersCarrier(headers))

  return p.ch.PublishWithContext(ctx, exchange, key, false, false, amqp.Publishing{
    ContentType: "application/json",
    Headers:     headers,
    Body:        body,
  })
}

// Extract trace context khi consume
func (c *Consumer) consume(msg amqp.Delivery) {
  ctx := otel.GetTextMapPropagator().Extract(context.Background(), amqpHeadersCarrier(msg.Headers))
  ctx, span := tracer.Start(ctx, "amqp.consume")
  defer span.End()
  // ...
}
```

**7.5 Propagate trace context trong HTTP responses**

Thêm `X-Trace-Id` header vào responses để client có thể debug:
```go
// middleware
w.Header().Set("X-Trace-Id", trace.SpanFromContext(ctx).SpanContext().TraceID().String())
```

**7.6 Deploy OTel Collector trong K8s**
```yaml
# Thay vì gửi thẳng vào Jaeger, dùng OTel Collector làm middleman
# → dễ thay backend sau này (Jaeger → Tempo → Honeycomb)
# k8s/base/monitoring/otel-collector.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: otel-collector
spec:
  template:
    spec:
      containers:
        - name: collector
          image: otel/opentelemetry-collector-contrib:latest
          args: ["--config=/etc/otel/config.yaml"]
          volumeMounts:
            - name: config
              mountPath: /etc/otel
```

```yaml
# otel-collector-config.yaml
receivers:
  otlp:
    protocols:
      http:
        endpoint: 0.0.0.0:4318
      grpc:
        endpoint: 0.0.0.0:4317

processors:
  batch:
    timeout: 1s
  memory_limiter:
    limit_mib: 256
  resource:
    attributes:
      - action: insert
        key: cluster
        value: stayease-k8s

exporters:
  jaeger:
    endpoint: jaeger-collector:14250
    tls:
      insecure: true
  prometheus:
    endpoint: 0.0.0.0:8889    # expose trace-derived metrics

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [memory_limiter, batch, resource]
      exporters: [jaeger]
```

**7.7 Tạo custom spans cho business logic quan trọng**
```go
// service/booking_service.go
func (s *BookingService) CreateBooking(ctx context.Context, req dto.CreateBookingRequest) (*domain.Booking, error) {
  ctx, span := s.tracer.Start(ctx, "BookingService.CreateBooking",
    trace.WithAttributes(
      attribute.String("hotel_id", req.HotelID),
      attribute.String("room_id", req.RoomID),
      attribute.Int("nights", req.Nights),
    ),
  )
  defer span.End()

  // Lock acquisition span
  ctx, lockSpan := s.tracer.Start(ctx, "AcquireDistributedLock")
  lock, err := s.lockSvc.Acquire(ctx, req.RoomID, req.CheckIn)
  lockSpan.End()

  if err != nil {
    span.RecordError(err)
    span.SetStatus(codes.Error, "lock acquisition failed")
    return nil, err
  }
  // ...
}
```

### Kiểm tra đã master Phase 7

- [ ] Tìm được trace đầy đủ của 1 booking request trong Jaeger UI: HTTP → DB → Redis → RabbitMQ → Worker → DB
- [ ] Worker traces được link với API traces qua TraceContext header
- [ ] Khi booking thất bại do lock contention → trace cho thấy rõ span nào fail
- [ ] P95 DB query time có thể đo được từ trace data
- [ ] OTel Collector restart không mất traces (buffer trong memory)

---

## Tổng hợp: Production-Ready Checklist

Sau khi hoàn thành cả 7 phases, StayEase sẽ có:

### Infrastructure (Terraform)
- [ ] K8s cluster trên cloud (DigitalOcean/AWS)
- [ ] Managed PostgreSQL với automatic backups
- [ ] Managed Redis
- [ ] DNS + TLS tự động qua cert-manager
- [ ] All infra changes tracked trong Git, apply qua CI

### CI/CD (GitHub Actions + Argo CD)
- [ ] Test → Build → Scan → Push → Deploy pipeline tự động
- [ ] Staging deploy tự động khi merge vào `main`
- [ ] Production deploy yêu cầu manual approval
- [ ] Rollback = `git revert` (< 5 phút)
- [ ] CVE scanning trên mọi image trước khi push

### Kubernetes
- [ ] Zero-downtime rolling deployments
- [ ] Auto-scaling dựa trên CPU + custom metrics
- [ ] DB migrations chạy tự động trước khi app deploy
- [ ] Secrets không commit vào Git (dùng External Secrets Operator)
- [ ] Network policies giới hạn traffic giữa pods

### Observability (Prometheus + Grafana + OTel)
- [ ] Business dashboards: bookings, payments, revenue
- [ ] Infrastructure dashboards: CPU, memory, network
- [ ] Alerting: critical alerts → email/Slack
- [ ] End-to-end distributed traces cho mọi booking flow
- [ ] Correlation giữa logs (Zap) + traces (OTel) + metrics (Prometheus) qua Trace ID

---

## Tài liệu & Khóa học

| Chủ đề | Tài liệu | Thực hành |
|---|---|---|
| Docker | [docs.docker.com](https://docs.docker.com) | [Play with Docker](https://labs.play-with-docker.com/) |
| Kubernetes | [kubernetes.io/docs](https://kubernetes.io/docs) | [Killercoda K8s](https://killercoda.com/playgrounds/scenario/kubernetes) |
| Terraform | [developer.hashicorp.com/terraform](https://developer.hashicorp.com/terraform) | [Terraform Tutorial](https://developer.hashicorp.com/terraform/tutorials) |
| Argo CD | [argo-cd.readthedocs.io](https://argo-cd.readthedocs.io) | [Argo CD Getting Started](https://argo-cd.readthedocs.io/en/stable/getting_started/) |
| Prometheus | [prometheus.io/docs](https://prometheus.io/docs) | [Prometheus Playground](https://demo.promlabs.com/) |
| OpenTelemetry | [opentelemetry.io/docs](https://opentelemetry.io/docs) | [OTel Demo App](https://github.com/open-telemetry/opentelemetry-demo) |
| Sách | *Kubernetes in Action* (Lukša) | *Cloud Native DevOps with Kubernetes* |

---

## Thứ tự ưu tiên nếu thời gian ít

Nếu chỉ có 2 tháng, tập trung theo thứ tự:

```
Docker (đã có nền) → Kubernetes → GitHub Actions nâng cao → Argo CD
```

Terraform và OTel có thể học sau khi đã vững K8s. Prometheus cơ bản cũng nên học song song với K8s vì rất cần để debug cluster.
