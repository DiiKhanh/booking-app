# PROJECT RULES: DEVELOPMENT GUIDELINES

This document defines the **Rules of Engagement** for the Booking Concurecy Project. All contributors (Human or AI) must adhere to these standards.

---

## 🛠️ 1. ARCHITECTURE & CODE STYLE

### 1.1 Backend (Golang)
- **Framework**: Use `Gin` or standard `net/http`. Avoid overly complex frameworks unless necessary.
- **Structure**: Follow `Standard Go Project Layout` (cmd, internal, pkg).
- **Errors**:
  - **No Panic**: Recover middleware must cover panic in handlers.
  - **Wrapped Errors**: Use `fmt.Errorf("%w", err)` for context.
  - **HTTP Errors**: Standardize API responses (`{"error": "message", "code": 400}`).
- **Concurrency**:
  - **Safe Map Access**: Always use `sync.RWMutex` or `sync.Map` for concurrent map writes.
  - **Context**: Pass `context.Context` down to DB/Redis calls.
  - **Channel Closure**: Only the sender closes the channel.

### 1.2 Frontend (Web - Next.js)
- **Router**: App Router (`app/`) is mandatory. No `pages/` directory unless for API routes (if using Pages API).
- **Data Fetching**:
  - Server Components: Direct DB/API calls where possible.
  - Client Components: `React Query` (TanStack Query) or `SWR` for client-side data.
- **Styling**: `TailwindCSS` with utility-first approach. Avoid CSS modules unless for complex animations.
- **Components**: `Shadcn/UI` for base components (Button, Input, Dialog).

### 1.3 Mobile (React Native)
- **Framework**: `Expo` Managed Workflow.
- **Navigation**: `Expo Router` (file-system based routing).
- **Styling**: `NativeWind` (Tailwind for RN). maximize code sharing with Web.
- **State**: `Zustand` for global state (lightweight).

---

## 🔒 2. SECURITY & DEVOPS

### 2.1 Secrets & Config
- **.env**: Never check `.env` into git. Use `.env.example`.
- **Docker**:
  - `docker-compose.yml` must spin up all local dependencies (Postgres, Redis, MQ).
  - Services must wait for dependencies (e.g., `depends_on: condition: service_healthy`).

### 2.2 Database
- **Migrations**: Always use migration files (`up.sql`, `down.sql`). No manual `CREATE TABLE`.
- **Indexes**: Add indexes for foreign keys and frequently queried fields.
- **Transactions**: Use transactions for multi-step writes (e.g., Booking + Inventory Update).

---

## 📝 3. DOCUMENTATION PROTOCOL

- **README.md**: Must be present in `root`, `backend`, `web`, and `mobile` directories.
- **Comments**: Explain *WHY*, not *WHAT*.
  - *Bad*: `// Increment i`
  - *Good*: `// Increment retry count to implementing exponential backoff`
- **API Docs**: Use Swagger/OpenAPI annotations on handlers or maintain `docs/API.md`.

---

## 🚀 4. WORKFLOW (GIT & CI)

1.  **Issue**: Create an issue or task for every feature.
2.  **Branch**: `feature/concurrency-fix`, `fix/search-bug`.
3.  **Commit**: Conventional Commits (e.g., `feat: add redis locking`, `fix: race condition in inventory`).
4.  **PR**: Must pass linting and tests before merge.

---

## 🤖 5. AI AGENT INSTRUCTIONS

- **Context First**: Always check `PLAN-*.md` before modifying code.
- **Refactor Safely**: When refactoring, ensure tests pass. If no tests exist, write them first.
- **Ask Clarification**: If a requirement is ambiguous (e.g., "fast search"), ask for metrics (e.g., "Is <100ms acceptable?").
