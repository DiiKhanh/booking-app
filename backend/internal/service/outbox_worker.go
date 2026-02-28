package service

import (
	"booking-app/internal/repository"
	"context"
	"fmt"
	"time"

	"go.uber.org/zap"
)

const (
	outboxMaxRetries = 5
	outboxBatchSize  = 50
	outboxPollDelay  = 2 * time.Second
)

// MessagePublisher abstracts the RabbitMQ publisher used by the outbox worker.
type MessagePublisher interface {
	Publish(ctx context.Context, exchange, routingKey string, body []byte) error
}

// OutboxWorker polls the outbox table and publishes unpublished events to the message broker.
type OutboxWorker struct {
	outboxRepo repository.OutboxRepository
	publisher  MessagePublisher
	logger     *zap.Logger
}

// NewOutboxWorker creates a new OutboxWorker.
func NewOutboxWorker(outboxRepo repository.OutboxRepository, publisher MessagePublisher, logger *zap.Logger) *OutboxWorker {
	return &OutboxWorker{
		outboxRepo: outboxRepo,
		publisher:  publisher,
		logger:     logger,
	}
}

// Run starts the polling loop. It blocks until ctx is cancelled.
// The first batch is processed immediately, then every outboxPollDelay.
func (w *OutboxWorker) Run(ctx context.Context) error {
	w.logger.Info("outbox worker started")

	// Process once immediately before entering the tick loop.
	if err := w.processEvents(ctx); err != nil {
		w.logger.Error("outbox worker iteration error", zap.Error(err))
	}

	ticker := time.NewTicker(outboxPollDelay)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			w.logger.Info("outbox worker stopped")
			return ctx.Err()
		case <-ticker.C:
			if err := w.processEvents(ctx); err != nil {
				w.logger.Error("outbox worker iteration error", zap.Error(err))
			}
		}
	}
}

func (w *OutboxWorker) processEvents(ctx context.Context) error {
	events, err := w.outboxRepo.ListUnpublishedEvents(ctx, outboxBatchSize)
	if err != nil {
		return fmt.Errorf("list unpublished events: %w", err)
	}

	for _, event := range events {
		if event.RetryCount >= outboxMaxRetries {
			// Send to DLQ by publishing to dead letter exchange.
			if dlqErr := w.publisher.Publish(ctx, "booking.events.dlx", "dead."+event.EventType, event.Payload); dlqErr != nil {
				w.logger.Error("failed to send event to DLQ",
					zap.String("event_id", event.ID),
					zap.Error(dlqErr),
				)
			} else {
				// Mark as published to stop retrying.
				_ = w.outboxRepo.MarkPublished(ctx, event.ID, time.Now())
			}
			continue
		}

		routingKey := eventTypeToRoutingKey(event.EventType)
		if err := w.publisher.Publish(ctx, "booking.events", routingKey, event.Payload); err != nil {
			w.logger.Warn("failed to publish outbox event",
				zap.String("event_id", event.ID),
				zap.String("event_type", event.EventType),
				zap.Error(err),
			)
			_ = w.outboxRepo.IncrementRetry(ctx, event.ID)
			continue
		}

		if err := w.outboxRepo.MarkPublished(ctx, event.ID, time.Now()); err != nil {
			w.logger.Error("failed to mark event published",
				zap.String("event_id", event.ID),
				zap.Error(err),
			)
		}
	}
	return nil
}

// eventTypeToRoutingKey converts a domain event type to a RabbitMQ routing key.
func eventTypeToRoutingKey(eventType string) string {
	switch eventType {
	case "BookingPaymentInitiated":
		return "payment.initiated"
	case "PaymentSucceeded":
		return "payment.succeeded"
	case "PaymentFailed":
		return "payment.failed"
	case "PaymentTimedOut":
		return "payment.timed_out"
	default:
		return "payment.unknown"
	}
}
