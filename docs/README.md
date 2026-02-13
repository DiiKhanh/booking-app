# HOTEL BOOKING PROJECT

> **A Scale-Adaptive Full Stack Project**
> **Tech Stack**: Golang, Next.js, React Native, Postgres, Redis, Elasticsearch, RabbitMQ.

---

## 📚 DOCUMENTATION INDEX

### 1. **Roadmap & Strategy** (@[docs/PROJECT_ROADMAP.md])
- **Phase 1**: Core Transactional System (Concurrency & Locking)
- **Phase 2**: High-Performance Search (Elasticsearch & Geo)
- **Phase 3**: Distributed Saga (Payment & Reliability)
- **Phase 4**: Production Ops (Metrics & CI/CD)

### 2. **System Architecture** (@[docs/MASTER_FLOW.md])
- **Components**: API Gateway, Booking Service, Search Service, Payment Service.
- **Data Flow**: Sagas, Event Sourcing, Data Sync via CDC.
- **Key Diagrams**: Booking Flow, Search Sync, Payment Orchestration.

### 3. **Rules & Guidelines** (@[docs/PROJECT_RULES.md])
- **Backend Rules**: Go best practices, error handling.
- **Frontend Rules**: Server Components, Tailwind with Shadcn/UI.
- **Mobile Rules**: Expo Managed Workflow, Shared State.
- **DevOps**: Docker-first approach.

---

## 🛠️ QUICK START

### Backend (Go)
```bash
cd backend
make network postgres redis
make migrate
make server
```

### Web (Next.js)
```bash
cd web
npm install
npm run dev
```

### Mobile (React Native)
```bash
cd mobile
npm install
npm run ios # or android
```

---

## 🧪 TESTING

### Load Test (Concurrency)
```bash
k6 run tests/k6/load_test.js
```

### Unit Tests
```bash
cd backend
go test ./...
```
