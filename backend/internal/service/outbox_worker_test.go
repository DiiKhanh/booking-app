package service_test

import (
	"booking-app/internal/domain"
	"booking-app/internal/service"
	"context"
	"encoding/json"
	"errors"
	"testing"
	"time"

	"go.uber.org/zap"
)

// --- Mock MessagePublisher ---

type mockPublisher struct {
	publishFn func(ctx context.Context, exchange, routingKey string, body []byte) error
}

func (m *mockPublisher) Publish(ctx context.Context, exchange, routingKey string, body []byte) error {
	if m.publishFn != nil {
		return m.publishFn(ctx, exchange, routingKey, body)
	}
	return nil
}

// --- Tests: OutboxWorker ---

func TestOutboxWorker_ProcessEvents_EmptyBatch(t *testing.T) {
	outboxRepo := makeOutboxRepo(mockOutboxRepo{
		listUnpublishedFn: func(ctx context.Context, limit int) ([]*domain.OutboxEvent, error) {
			return []*domain.OutboxEvent{}, nil
		},
	})
	publisher := &mockPublisher{}
	logger, _ := zap.NewDevelopment()
	worker := service.NewOutboxWorker(outboxRepo, publisher, logger)

	ctx, cancel := context.WithTimeout(context.Background(), 50*time.Millisecond)
	defer cancel()

	// Run for a short time — should exit cleanly without error (due to ctx cancel).
	err := worker.Run(ctx)
	if !errors.Is(err, context.DeadlineExceeded) && !errors.Is(err, context.Canceled) {
		t.Errorf("expected context cancellation, got %v", err)
	}
}

func TestOutboxWorker_ProcessEvents_PublishesEvent(t *testing.T) {
	payload, _ := json.Marshal(domain.PaymentInitiatedPayload{PaymentID: "pay-1"})
	events := []*domain.OutboxEvent{
		{
			ID:            "evt-1",
			AggregateType: "payment",
			AggregateID:   "pay-1",
			EventType:     domain.EventTypeBookingPaymentInitiated,
			Payload:       payload,
			RetryCount:    0,
		},
	}

	publishCalled := false
	markPublishedCalled := false

	outboxRepo := makeOutboxRepo(mockOutboxRepo{
		listUnpublishedFn: func(ctx context.Context, limit int) ([]*domain.OutboxEvent, error) {
			// Return events once, then empty.
			if !publishCalled {
				return events, nil
			}
			return []*domain.OutboxEvent{}, nil
		},
		markPublishedFn: func(ctx context.Context, id string, publishedAt time.Time) error {
			if id == "evt-1" {
				markPublishedCalled = true
			}
			return nil
		},
	})
	publisher := &mockPublisher{
		publishFn: func(ctx context.Context, exchange, routingKey string, body []byte) error {
			publishCalled = true
			if exchange != "booking.events" {
				return errors.New("unexpected exchange: " + exchange)
			}
			return nil
		},
	}
	logger, _ := zap.NewDevelopment()
	worker := service.NewOutboxWorker(outboxRepo, publisher, logger)

	// Process events directly using a short ctx.
	ctx, cancel := context.WithTimeout(context.Background(), 100*time.Millisecond)
	defer cancel()
	_ = worker.Run(ctx)

	if !publishCalled {
		t.Error("expected publisher to be called")
	}
	if !markPublishedCalled {
		t.Error("expected outbox event to be marked published")
	}
}

func TestOutboxWorker_ProcessEvents_DLQAfterMaxRetries(t *testing.T) {
	payload, _ := json.Marshal(domain.PaymentInitiatedPayload{PaymentID: "pay-1"})
	events := []*domain.OutboxEvent{
		{
			ID:            "evt-dlq",
			AggregateType: "payment",
			AggregateID:   "pay-1",
			EventType:     domain.EventTypeBookingPaymentInitiated,
			Payload:       payload,
			RetryCount:    5, // at max retries threshold
		},
	}

	dlqPublished := false
	outboxRepo := makeOutboxRepo(mockOutboxRepo{
		listUnpublishedFn: func(ctx context.Context, limit int) ([]*domain.OutboxEvent, error) {
			return events, nil
		},
		markPublishedFn: func(ctx context.Context, id string, publishedAt time.Time) error {
			return nil
		},
	})
	publisher := &mockPublisher{
		publishFn: func(ctx context.Context, exchange, routingKey string, body []byte) error {
			if exchange == "booking.events.dlx" {
				dlqPublished = true
			}
			return nil
		},
	}
	logger, _ := zap.NewDevelopment()
	worker := service.NewOutboxWorker(outboxRepo, publisher, logger)

	ctx, cancel := context.WithTimeout(context.Background(), 100*time.Millisecond)
	defer cancel()
	_ = worker.Run(ctx)

	if !dlqPublished {
		t.Error("expected event to be published to DLQ after max retries")
	}
}

func TestOutboxWorker_ProcessEvents_IncrementRetryOnPublishFailure(t *testing.T) {
	payload, _ := json.Marshal(domain.PaymentInitiatedPayload{PaymentID: "pay-1"})
	events := []*domain.OutboxEvent{
		{
			ID:            "evt-retry",
			AggregateType: "payment",
			AggregateID:   "pay-1",
			EventType:     domain.EventTypeBookingPaymentInitiated,
			Payload:       payload,
			RetryCount:    2,
		},
	}

	retryIncremented := false
	outboxRepo := makeOutboxRepo(mockOutboxRepo{
		listUnpublishedFn: func(ctx context.Context, limit int) ([]*domain.OutboxEvent, error) {
			return events, nil
		},
		incrementRetryFn: func(ctx context.Context, id string) error {
			if id == "evt-retry" {
				retryIncremented = true
			}
			return nil
		},
	})
	publisher := &mockPublisher{
		publishFn: func(ctx context.Context, exchange, routingKey string, body []byte) error {
			return errors.New("broker unavailable")
		},
	}
	logger, _ := zap.NewDevelopment()
	worker := service.NewOutboxWorker(outboxRepo, publisher, logger)

	ctx, cancel := context.WithTimeout(context.Background(), 100*time.Millisecond)
	defer cancel()
	_ = worker.Run(ctx)

	if !retryIncremented {
		t.Error("expected retry count to be incremented on publish failure")
	}
}

func TestOutboxWorker_EventTypeToRoutingKey(t *testing.T) {
	cases := []struct {
		eventType      string
		expectedRouKey string
	}{
		{domain.EventTypeBookingPaymentInitiated, "payment.initiated"},
		{domain.EventTypePaymentSucceeded, "payment.succeeded"},
		{domain.EventTypePaymentFailed, "payment.failed"},
		{domain.EventTypePaymentTimedOut, "payment.timed_out"},
	}

	payload, _ := json.Marshal(domain.PaymentInitiatedPayload{PaymentID: "pay-1"})
	for _, tc := range cases {
		t.Run(tc.eventType, func(t *testing.T) {
			events := []*domain.OutboxEvent{
				{
					ID:            "evt-" + tc.eventType,
					AggregateType: "payment",
					AggregateID:   "pay-1",
					EventType:     tc.eventType,
					Payload:       payload,
					RetryCount:    0,
				},
			}

			var capturedKey string
			outboxRepo := makeOutboxRepo(mockOutboxRepo{
				listUnpublishedFn: func(ctx context.Context, limit int) ([]*domain.OutboxEvent, error) {
					return events, nil
				},
			})
			publisher := &mockPublisher{
				publishFn: func(ctx context.Context, exchange, routingKey string, body []byte) error {
					capturedKey = routingKey
					return nil
				},
			}
			logger, _ := zap.NewDevelopment()
			worker := service.NewOutboxWorker(outboxRepo, publisher, logger)

			ctx, cancel := context.WithTimeout(context.Background(), 100*time.Millisecond)
			defer cancel()
			_ = worker.Run(ctx)

			if capturedKey != tc.expectedRouKey {
				t.Errorf("expected routing key %q, got %q", tc.expectedRouKey, capturedKey)
			}
		})
	}
}
