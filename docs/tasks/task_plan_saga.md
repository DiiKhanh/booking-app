# Task Plan C: The "Event-Driven Saga" (Async Payment & Reliability)

## 📌 Phase 1: Microservices Foundation (Golang & Message Queue)
- [ ] **1.1 Infrastructure Setup**:
  - [ ] Setup RabbitMQ (or Kafka) and Redis via Docker.
  - [ ] Define service boundaries: `Booking Service`, `Payment Service`, `Notification Service`.
- [ ] **1.2 Saga Orchestration (The Choreography)**:
  - [ ] Design the Event Flow: `BookingCreated` -> `PaymentProcessed` -> `BookingConfirmed` / `BookingFailed`.
  - [ ] Implement a "Saga Orchestrator" or reliable event publishing in Go (Outbox Pattern).

## 💸 Phase 2: Payment & State Machine
- [ ] **2.1 State Management**:
  - [ ] Implement a Finite State Machine (FSM) for Booking: `PENDING` -> `AWAITING_PAYMENT` -> `PAID` -> `CONFIRMED`.
  - [ ] Handle timeouts: If payment not received in 10 mins -> Auto-cancel (TTL in Redis/RabbitMQ).
- [ ] **2.2 Mock Payment Gateway**:
  - [ ] Create a mock payment service that randomly succeeds (80%) or fails (20%) or hangs.
  - [ ] Implement Idempotency keys to prevent double charging.
- [ ] **2.3 Compensation Logic (Rollback)**:
  - [ ] If Payment Fails -> Publish `PaymentFailed` event -> Booking Service releases the room.

## 🔔 Phase 3: Notifications & Real-time Feedback
- [ ] **3.1 Notification Worker**:
  - [ ] Consume `BookingConfirmed` events -> Send Dummy Email/SMS.
  - [ ] Consume `BookingCancelled` events -> Send Apology Email.
- [ ] **3.2 Frontend Updates (Next.js & RN)**:
  - [ ] Implement a "Processing..." screen that polls status or uses WebSockets.
  - [ ] Show final confirmation or error message based on async result.

## 🛡️ Phase 4: Resilience & Monitoring
- [ ] **4.1 Dead Letter Queues (DLQ)**:
  - [ ] Configure DLQ for messages that fail to process multiple times.
  - [ ] Build a "Retry Worker" to process failed events.
- [ ] **4.2 Distributed Tracing**:
  - [ ] Integrate OpenTelemetry/Jaeger to visualize the request journey across queues and services.
