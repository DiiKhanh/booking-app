# MASTER FLOW: The Hotel Booking Trinity

This document outlines the **End-to-End Execution Flow** for the project, broken down by the key system design challenges.

---

## 🟢 FLOW 1: The Transactional Core (Concurrency)
**Problem**: Two users book the same room at the same time.
**Solution**: Pessimistic/Optimistic Locking or Redlock.

### 1.1 Diagram
```mermaid
sequenceDiagram
    participant UserA
    participant UserB
    participant API as Booking API
    participant Redis as Redis Lock
    participant DB as Postgres

    UserA->>API: POST /bookings (Room 101)
    UserB->>API: POST /bookings (Room 101)
    
    API->>Redis: SETNX lock:room:101:date (UserA)
    Redis-->>API: OK (Lock Acquired)
    
    API->>Redis: SETNX lock:room:101:date (UserB)
    Redis-->>API: FAIL (Locked)
    API-->>UserB: 409 Conflict (Please retry)

    API->>DB: BEGIN TX
    API->>DB: SELECT count FROM inventory WHERE room_id=101 FOR UPDATE
    API->>DB: INSERT INTO bookings ...
    API->>DB: UPDATE inventory SET count = count - 1
    API->>DB: COMMIT TX
    
    API->>Redis: DEL lock:room:101:date (Release)
    API-->>UserA: 201 Created (Booking Confirmed)
```

### 1.2 Implementation Steps
1.  **Backend**: Go routine to acquire lock with retry mechanism (Exponential Backoff).
2.  **Database**: Transaction with Isolation Level (Serializable or Repeatable Read).
3.  **Frontend**: Optimistic UI update -> Rollback on 409 error.

---

## 🟡 FLOW 2: The Search Engine (Performance)
**Problem**: Searching 1M hotels by location is slow in SQL. Text search is limited.
**Solution**: Elasticsearch + PostGIS for geo-fencing + CDC Sync.

### 2.1 Diagram
```mermaid
graph LR
    User(Search Query) --> API(Search API)
    API --> Elastic(Elasticsearch)
    API --> Redis(Cache Layer)
    
    subgraph "Data Sync (CDC)"
        Postgres(Primary DB) -- Transaction Log (WAL) --> SyncWorker(Go Sync Service)
        SyncWorker --> Elastic
    end
```

### 2.2 Implementation Steps
1.  **Ingestion**: Seed 10k dummy hotels with random Lat/Long in Postgres.
2.  **Sync**: Go worker reads from Postgres (listen/notify or polling) -> Bulk Index to Elasticsearch.
3.  **Client**: Mapbox GL JS (Web) / React Native Maps (Mobile) to send viewport bounds (NE, SW).
4.  **Query**: Elasticsearch Geo-Distance query + Filter by Price/Amenities.

---

## 🔵 FLOW 3: The Payment Saga (Distributed Workflow)
**Problem**: Payment succeeds but booking fails (or vice versa). System needs consistency across services.
**Solution**: Choreography Saga Pattern (Event-Driven).

### 3.1 Diagram
```mermaid
sequenceDiagram
    participant Client
    participant OrderSvc as Order Service
    participant PaymentSvc as Payment Service
    participant InventorySvc as Inventory Service
    participant MQ as Message Queue

    Client->>OrderSvc: POST /checkout
    OrderSvc->>DB: Create Order (PENDING)
    OrderSvc->>MQ: Publish OrderCreated

    MQ->>PaymentSvc: Consume OrderCreated
    PaymentSvc->>PaymentGateway: Process Charge
    
    alt Payment Success
        PaymentSvc->>MQ: Publish PaymentSuccess
        MQ->>InventorySvc: Consume PaymentSuccess
        InventorySvc->>DB: Reserve Inventory
        InventorySvc->>MQ: Publish InventoryReserved
        MQ->>OrderSvc: Consume InventoryReserved
        OrderSvc->>DB: Update Order (CONFIRMED)
    else Payment Failed
        PaymentSvc->>MQ: Publish PaymentFailed
        MQ->>OrderSvc: Consume PaymentFailed
        OrderSvc->>DB: Update Order (FAILED)
        OrderSvc->>Client: Send Failure Notification
    end
```

### 3.2 Implementation Steps
1.  **Message Broker**: RabbitMQ setup (Exchanges: `booking.events`, `payment.events`).
2.  **Idempotency**: Ensure message processing is idempotent (store processed Message IDs in Redis).
3.  **State Machine**: Order Service tracks state: `CREATED` -> `PAID` -> `CONFIRMED` or `FAILED`.
4.  **Compensation**: If inventory reservation fails after payment, trigger Refund transaction.

---

## 📱 CLIENT-SIDE FLOWS (Web & Mobile)

### 4.1 Global State (Zustand/Context)
- **User**: Auth Token, Profile.
- **Search**: Location, Dates, Guests (Persisted in URL on Web, AsyncStorage on Mobile).
- **Booking**: Current draft booking ID.

### 4.2 Shared Logic (Hooks)
- `useSearchHotels()`: Debounced search, handles loading/error states.
- `useBookingFlow()`: Manages the Saga steps (polling for final status).
- `useRealtimeNotifications()`: WebSocket connection for async updates.
