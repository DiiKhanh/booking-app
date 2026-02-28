package service_test

import (
	"booking-app/internal/domain"
	"booking-app/internal/service"
	"context"
	"errors"
	"testing"
	"time"
)

// --- Mock PaymentRepository ---

type mockPaymentRepo struct {
	createPaymentFn              func(ctx context.Context, p *domain.Payment) (*domain.Payment, error)
	getPaymentByIDFn             func(ctx context.Context, id string) (*domain.Payment, error)
	getPaymentByBookingIDFn      func(ctx context.Context, bookingID int) (*domain.Payment, error)
	updatePaymentStatusFn        func(ctx context.Context, id string, status domain.PaymentStatus, gatewayRef, failedReason string) error
	getPaymentByIdempotencyKeyFn func(ctx context.Context, key string) (*domain.Payment, error)
}

func (m *mockPaymentRepo) CreatePayment(ctx context.Context, p *domain.Payment) (*domain.Payment, error) {
	return m.createPaymentFn(ctx, p)
}

func (m *mockPaymentRepo) GetPaymentByID(ctx context.Context, id string) (*domain.Payment, error) {
	return m.getPaymentByIDFn(ctx, id)
}

func (m *mockPaymentRepo) GetPaymentByBookingID(ctx context.Context, bookingID int) (*domain.Payment, error) {
	return m.getPaymentByBookingIDFn(ctx, bookingID)
}

func (m *mockPaymentRepo) UpdatePaymentStatus(ctx context.Context, id string, status domain.PaymentStatus, gatewayRef, failedReason string) error {
	return m.updatePaymentStatusFn(ctx, id, status, gatewayRef, failedReason)
}

func (m *mockPaymentRepo) GetPaymentByIdempotencyKey(ctx context.Context, key string) (*domain.Payment, error) {
	return m.getPaymentByIdempotencyKeyFn(ctx, key)
}

// --- Mock OutboxRepository ---

type mockOutboxRepo struct {
	createEventFn         func(ctx context.Context, event *domain.OutboxEvent) error
	listUnpublishedFn     func(ctx context.Context, limit int) ([]*domain.OutboxEvent, error)
	markPublishedFn       func(ctx context.Context, id string, publishedAt time.Time) error
	incrementRetryFn      func(ctx context.Context, id string) error
	isEventProcessedFn    func(ctx context.Context, eventID string) (bool, error)
	markProcessedFn       func(ctx context.Context, eventID string) error
}

func (m *mockOutboxRepo) CreateEvent(ctx context.Context, event *domain.OutboxEvent) error {
	return m.createEventFn(ctx, event)
}

func (m *mockOutboxRepo) ListUnpublishedEvents(ctx context.Context, limit int) ([]*domain.OutboxEvent, error) {
	return m.listUnpublishedFn(ctx, limit)
}

func (m *mockOutboxRepo) MarkPublished(ctx context.Context, id string, publishedAt time.Time) error {
	return m.markPublishedFn(ctx, id, publishedAt)
}

func (m *mockOutboxRepo) IncrementRetry(ctx context.Context, id string) error {
	return m.incrementRetryFn(ctx, id)
}

func (m *mockOutboxRepo) IsEventProcessed(ctx context.Context, eventID string) (bool, error) {
	return m.isEventProcessedFn(ctx, eventID)
}

func (m *mockOutboxRepo) MarkProcessed(ctx context.Context, eventID string) error {
	return m.markProcessedFn(ctx, eventID)
}

// --- Helpers ---

func makePaymentRepo(overrides mockPaymentRepo) *mockPaymentRepo {
	defaults := &mockPaymentRepo{
		createPaymentFn: func(ctx context.Context, p *domain.Payment) (*domain.Payment, error) {
			result := *p
			result.ID = "pay-uuid-1"
			result.CreatedAt = time.Now()
			result.UpdatedAt = time.Now()
			return &result, nil
		},
		getPaymentByIDFn: func(ctx context.Context, id string) (*domain.Payment, error) {
			return &domain.Payment{
				ID:        id,
				BookingID: 1,
				Amount:    150.00,
				Currency:  "USD",
				Status:    domain.PaymentStatusPending,
			}, nil
		},
		getPaymentByBookingIDFn: func(ctx context.Context, bookingID int) (*domain.Payment, error) {
			return nil, domain.ErrNotFound
		},
		updatePaymentStatusFn: func(ctx context.Context, id string, status domain.PaymentStatus, gatewayRef, failedReason string) error {
			return nil
		},
		getPaymentByIdempotencyKeyFn: func(ctx context.Context, key string) (*domain.Payment, error) {
			return nil, domain.ErrNotFound
		},
	}
	if overrides.createPaymentFn != nil {
		defaults.createPaymentFn = overrides.createPaymentFn
	}
	if overrides.getPaymentByIDFn != nil {
		defaults.getPaymentByIDFn = overrides.getPaymentByIDFn
	}
	if overrides.getPaymentByBookingIDFn != nil {
		defaults.getPaymentByBookingIDFn = overrides.getPaymentByBookingIDFn
	}
	if overrides.updatePaymentStatusFn != nil {
		defaults.updatePaymentStatusFn = overrides.updatePaymentStatusFn
	}
	if overrides.getPaymentByIdempotencyKeyFn != nil {
		defaults.getPaymentByIdempotencyKeyFn = overrides.getPaymentByIdempotencyKeyFn
	}
	return defaults
}

func makeOutboxRepo(overrides mockOutboxRepo) *mockOutboxRepo {
	defaults := &mockOutboxRepo{
		createEventFn: func(ctx context.Context, event *domain.OutboxEvent) error {
			return nil
		},
		listUnpublishedFn: func(ctx context.Context, limit int) ([]*domain.OutboxEvent, error) {
			return []*domain.OutboxEvent{}, nil
		},
		markPublishedFn: func(ctx context.Context, id string, publishedAt time.Time) error {
			return nil
		},
		incrementRetryFn: func(ctx context.Context, id string) error {
			return nil
		},
		isEventProcessedFn: func(ctx context.Context, eventID string) (bool, error) {
			return false, nil
		},
		markProcessedFn: func(ctx context.Context, eventID string) error {
			return nil
		},
	}
	if overrides.createEventFn != nil {
		defaults.createEventFn = overrides.createEventFn
	}
	if overrides.listUnpublishedFn != nil {
		defaults.listUnpublishedFn = overrides.listUnpublishedFn
	}
	if overrides.markPublishedFn != nil {
		defaults.markPublishedFn = overrides.markPublishedFn
	}
	if overrides.incrementRetryFn != nil {
		defaults.incrementRetryFn = overrides.incrementRetryFn
	}
	if overrides.isEventProcessedFn != nil {
		defaults.isEventProcessedFn = overrides.isEventProcessedFn
	}
	if overrides.markProcessedFn != nil {
		defaults.markProcessedFn = overrides.markProcessedFn
	}
	return defaults
}

// --- Tests: PaymentService.ProcessPayment ---

func TestPaymentService_ProcessPayment_PaymentNotFound(t *testing.T) {
	payRepo := makePaymentRepo(mockPaymentRepo{
		getPaymentByIDFn: func(ctx context.Context, id string) (*domain.Payment, error) {
			return nil, domain.ErrNotFound
		},
	})
	outboxRepo := makeOutboxRepo(mockOutboxRepo{})
	svc := service.NewPaymentService(payRepo, outboxRepo, 42)

	err := svc.ProcessPayment(context.Background(), "non-existent-id")

	if !errors.Is(err, domain.ErrNotFound) {
		t.Errorf("expected ErrNotFound, got %v", err)
	}
}

func TestPaymentService_ProcessPayment_AlreadyProcessed(t *testing.T) {
	payRepo := makePaymentRepo(mockPaymentRepo{
		getPaymentByIDFn: func(ctx context.Context, id string) (*domain.Payment, error) {
			return &domain.Payment{
				ID:     id,
				Status: domain.PaymentStatusSucceeded,
			}, nil
		},
	})
	outboxRepo := makeOutboxRepo(mockOutboxRepo{})
	svc := service.NewPaymentService(payRepo, outboxRepo, 42)

	err := svc.ProcessPayment(context.Background(), "pay-id")

	if err != nil {
		t.Errorf("expected no error for already-processed payment, got %v", err)
	}
}

func TestPaymentService_ProcessPayment_UpdateStatusError(t *testing.T) {
	payRepo := makePaymentRepo(mockPaymentRepo{
		updatePaymentStatusFn: func(ctx context.Context, id string, status domain.PaymentStatus, gatewayRef, failedReason string) error {
			return domain.ErrInternal
		},
	})
	outboxRepo := makeOutboxRepo(mockOutboxRepo{})
	svc := service.NewPaymentService(payRepo, outboxRepo, 42)

	err := svc.ProcessPayment(context.Background(), "pay-id")

	if err == nil {
		t.Error("expected error when status update fails, got nil")
	}
}

func TestPaymentService_ProcessPayment_OutboxEventCreated(t *testing.T) {
	outboxEventCreated := false
	payRepo := makePaymentRepo(mockPaymentRepo{})
	outboxRepo := makeOutboxRepo(mockOutboxRepo{
		createEventFn: func(ctx context.Context, event *domain.OutboxEvent) error {
			outboxEventCreated = true
			if event.AggregateType != "payment" {
				return errors.New("expected aggregate_type 'payment'")
			}
			return nil
		},
	})
	// Use a fixed seed so the result is deterministic — seed 0 produces known outcome.
	svc := service.NewPaymentService(payRepo, outboxRepo, 0)

	_ = svc.ProcessPayment(context.Background(), "pay-id")

	if !outboxEventCreated {
		t.Error("expected outbox event to be created after processing")
	}
}

func TestPaymentService_ProcessPayment_DeterministicWithSeed(t *testing.T) {
	// With seed=1, we can call ProcessPayment many times and all results must be
	// one of the three valid outcomes.
	payRepo := makePaymentRepo(mockPaymentRepo{})
	outboxRepo := makeOutboxRepo(mockOutboxRepo{})
	svc := service.NewPaymentService(payRepo, outboxRepo, 1)

	for i := 0; i < 5; i++ {
		// Reset payment to pending each iteration via a fresh mock.
		pr := makePaymentRepo(mockPaymentRepo{})
		or := makeOutboxRepo(mockOutboxRepo{})
		svc2 := service.NewPaymentService(pr, or, int64(i))
		err := svc2.ProcessPayment(context.Background(), "pay-id")
		if err != nil {
			t.Errorf("iteration %d: unexpected error %v", i, err)
		}
	}
	_ = svc
}

// --- Tests: PaymentService.GetPayment ---

func TestPaymentService_GetPayment_Success(t *testing.T) {
	payRepo := makePaymentRepo(mockPaymentRepo{
		getPaymentByIDFn: func(ctx context.Context, id string) (*domain.Payment, error) {
			return &domain.Payment{
				ID:        id,
				BookingID: 5,
				Amount:    200.00,
				Status:    domain.PaymentStatusSucceeded,
			}, nil
		},
	})
	outboxRepo := makeOutboxRepo(mockOutboxRepo{})
	svc := service.NewPaymentService(payRepo, outboxRepo, 0)

	payment, err := svc.GetPayment(context.Background(), "pay-id", "user-1")

	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if payment.ID != "pay-id" {
		t.Errorf("expected payment ID 'pay-id', got %q", payment.ID)
	}
}

func TestPaymentService_GetPayment_NotFound(t *testing.T) {
	payRepo := makePaymentRepo(mockPaymentRepo{
		getPaymentByIDFn: func(ctx context.Context, id string) (*domain.Payment, error) {
			return nil, domain.ErrNotFound
		},
	})
	outboxRepo := makeOutboxRepo(mockOutboxRepo{})
	svc := service.NewPaymentService(payRepo, outboxRepo, 0)

	_, err := svc.GetPayment(context.Background(), "missing-id", "user-1")

	if !errors.Is(err, domain.ErrNotFound) {
		t.Errorf("expected ErrNotFound, got %v", err)
	}
}

func TestPaymentService_GetPayment_EmptyIDReturnsError(t *testing.T) {
	payRepo := makePaymentRepo(mockPaymentRepo{})
	outboxRepo := makeOutboxRepo(mockOutboxRepo{})
	svc := service.NewPaymentService(payRepo, outboxRepo, 0)

	_, err := svc.GetPayment(context.Background(), "", "user-1")

	if !errors.Is(err, domain.ErrBadRequest) {
		t.Errorf("expected ErrBadRequest for empty payment ID, got %v", err)
	}
}

func TestPaymentService_ProcessPayment_FailureOutcome(t *testing.T) {
	// seed=1 produces Intn(100)==81 which is in the [80,95) failure range.
	var capturedStatus domain.PaymentStatus
	var capturedEventType string
	payRepo := makePaymentRepo(mockPaymentRepo{
		updatePaymentStatusFn: func(ctx context.Context, id string, status domain.PaymentStatus, ref, reason string) error {
			capturedStatus = status
			return nil
		},
	})
	outboxRepo := makeOutboxRepo(mockOutboxRepo{
		createEventFn: func(ctx context.Context, event *domain.OutboxEvent) error {
			capturedEventType = event.EventType
			return nil
		},
	})
	svc := service.NewPaymentService(payRepo, outboxRepo, 1)

	err := svc.ProcessPayment(context.Background(), "pay-id")

	if err != nil {
		t.Fatalf("expected no error on failure outcome, got %v", err)
	}
	if capturedStatus != domain.PaymentStatusFailed {
		t.Errorf("expected final status=failed, got %q", capturedStatus)
	}
	if capturedEventType != domain.EventTypePaymentFailed {
		t.Errorf("expected event type %q, got %q", domain.EventTypePaymentFailed, capturedEventType)
	}
}

func TestPaymentService_ProcessPayment_TimeoutOutcome(t *testing.T) {
	// seed=59 produces Intn(100)==95 which is in the [95,100) timeout range.
	var capturedStatus domain.PaymentStatus
	var capturedEventType string
	payRepo := makePaymentRepo(mockPaymentRepo{
		updatePaymentStatusFn: func(ctx context.Context, id string, status domain.PaymentStatus, ref, reason string) error {
			capturedStatus = status
			return nil
		},
	})
	outboxRepo := makeOutboxRepo(mockOutboxRepo{
		createEventFn: func(ctx context.Context, event *domain.OutboxEvent) error {
			capturedEventType = event.EventType
			return nil
		},
	})
	svc := service.NewPaymentService(payRepo, outboxRepo, 59)

	err := svc.ProcessPayment(context.Background(), "pay-id")

	if err != nil {
		t.Fatalf("expected no error on timeout outcome, got %v", err)
	}
	if capturedStatus != domain.PaymentStatusTimedOut {
		t.Errorf("expected final status=timed_out, got %q", capturedStatus)
	}
	if capturedEventType != domain.EventTypePaymentTimedOut {
		t.Errorf("expected event type %q, got %q", domain.EventTypePaymentTimedOut, capturedEventType)
	}
}

func TestPaymentService_ProcessPayment_SuccessUpdateError(t *testing.T) {
	// seed=0 → success path (outcome=74). Second UpdatePaymentStatus (mark succeeded) fails.
	callCount := 0
	payRepo := makePaymentRepo(mockPaymentRepo{
		updatePaymentStatusFn: func(ctx context.Context, id string, status domain.PaymentStatus, ref, reason string) error {
			callCount++
			if callCount == 2 {
				return domain.ErrInternal // fail the "mark succeeded" call
			}
			return nil
		},
	})
	outboxRepo := makeOutboxRepo(mockOutboxRepo{})
	svc := service.NewPaymentService(payRepo, outboxRepo, 0) // seed=0 → success

	err := svc.ProcessPayment(context.Background(), "pay-id")

	if err == nil {
		t.Error("expected error when second UpdatePaymentStatus fails on success path")
	}
}

func TestPaymentService_ProcessPayment_FailureUpdateError(t *testing.T) {
	// seed=1 → failure path (outcome=81). Second UpdatePaymentStatus (mark failed) fails.
	callCount := 0
	payRepo := makePaymentRepo(mockPaymentRepo{
		updatePaymentStatusFn: func(ctx context.Context, id string, status domain.PaymentStatus, ref, reason string) error {
			callCount++
			if callCount == 2 {
				return domain.ErrInternal
			}
			return nil
		},
	})
	outboxRepo := makeOutboxRepo(mockOutboxRepo{})
	svc := service.NewPaymentService(payRepo, outboxRepo, 1) // seed=1 → failure

	err := svc.ProcessPayment(context.Background(), "pay-id")

	if err == nil {
		t.Error("expected error when second UpdatePaymentStatus fails on failure path")
	}
}

func TestPaymentService_ProcessPayment_TimeoutUpdateError(t *testing.T) {
	// seed=59 → timeout path (outcome=95). Second UpdatePaymentStatus (mark timed_out) fails.
	callCount := 0
	payRepo := makePaymentRepo(mockPaymentRepo{
		updatePaymentStatusFn: func(ctx context.Context, id string, status domain.PaymentStatus, ref, reason string) error {
			callCount++
			if callCount == 2 {
				return domain.ErrInternal
			}
			return nil
		},
	})
	outboxRepo := makeOutboxRepo(mockOutboxRepo{})
	svc := service.NewPaymentService(payRepo, outboxRepo, 59) // seed=59 → timeout

	err := svc.ProcessPayment(context.Background(), "pay-id")

	if err == nil {
		t.Error("expected error when second UpdatePaymentStatus fails on timeout path")
	}
}

func TestPaymentService_ProcessPayment_EventTypeOnSuccess(t *testing.T) {
	var capturedEventType string
	// seed=100 → we can observe what outcome occurs; we capture the event type.
	payRepo := makePaymentRepo(mockPaymentRepo{})
	outboxRepo := makeOutboxRepo(mockOutboxRepo{
		createEventFn: func(ctx context.Context, event *domain.OutboxEvent) error {
			capturedEventType = event.EventType
			return nil
		},
	})
	svc := service.NewPaymentService(payRepo, outboxRepo, 100)
	_ = svc.ProcessPayment(context.Background(), "pay-id")

	validTypes := map[string]bool{
		domain.EventTypePaymentSucceeded: true,
		domain.EventTypePaymentFailed:    true,
		domain.EventTypePaymentTimedOut:  true,
	}
	if !validTypes[capturedEventType] {
		t.Errorf("unexpected event type %q", capturedEventType)
	}
}
