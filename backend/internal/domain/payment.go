package domain

import (
	"encoding/json"
	"time"
)

// PaymentStatus represents the lifecycle state of a payment.
type PaymentStatus string

const (
	PaymentStatusPending    PaymentStatus = "pending"
	PaymentStatusProcessing PaymentStatus = "processing"
	PaymentStatusSucceeded  PaymentStatus = "succeeded"
	PaymentStatusFailed     PaymentStatus = "failed"
	PaymentStatusTimedOut   PaymentStatus = "timed_out"
	PaymentStatusRefunded   PaymentStatus = "refunded"
)

// Payment represents a payment record tied to a booking.
type Payment struct {
	ID             string        `json:"id" db:"id"`
	BookingID      int           `json:"booking_id" db:"booking_id"`
	Amount         float64       `json:"amount" db:"amount"`
	Currency       string        `json:"currency" db:"currency"`
	Status         PaymentStatus `json:"status" db:"status"`
	IdempotencyKey string        `json:"idempotency_key" db:"idempotency_key"`
	GatewayRef     string        `json:"gateway_ref,omitempty" db:"gateway_ref"`
	FailedReason   string        `json:"failed_reason,omitempty" db:"failed_reason"`
	CreatedAt      time.Time     `json:"created_at" db:"created_at"`
	UpdatedAt      time.Time     `json:"updated_at" db:"updated_at"`
}

// OutboxEvent represents a domain event stored in the transactional outbox table.
type OutboxEvent struct {
	ID            string          `json:"id" db:"id"`
	AggregateType string          `json:"aggregate_type" db:"aggregate_type"`
	AggregateID   string          `json:"aggregate_id" db:"aggregate_id"`
	EventType     string          `json:"event_type" db:"event_type"`
	Payload       json.RawMessage `json:"payload" db:"payload"`
	PublishedAt   *time.Time      `json:"published_at,omitempty" db:"published_at"`
	RetryCount    int             `json:"retry_count" db:"retry_count"`
	CreatedAt     time.Time       `json:"created_at" db:"created_at"`
}

// ProcessedEvent tracks consumed events for idempotency.
type ProcessedEvent struct {
	EventID     string    `json:"event_id" db:"event_id"`
	ProcessedAt time.Time `json:"processed_at" db:"processed_at"`
}

// Payment event type constants used as RabbitMQ routing keys and outbox event_type values.
const (
	EventTypeBookingPaymentInitiated = "BookingPaymentInitiated"
	EventTypePaymentSucceeded        = "PaymentSucceeded"
	EventTypePaymentFailed           = "PaymentFailed"
	EventTypePaymentTimedOut         = "PaymentTimedOut"
)

// PaymentInitiatedPayload is the event payload for BookingPaymentInitiated.
type PaymentInitiatedPayload struct {
	PaymentID  string  `json:"payment_id"`
	BookingID  int     `json:"booking_id"`
	Amount     float64 `json:"amount"`
	Currency   string  `json:"currency"`
	UserID     string  `json:"user_id"`
}

// PaymentResultPayload is the event payload for success/failure/timeout events.
type PaymentResultPayload struct {
	PaymentID  string `json:"payment_id"`
	BookingID  int    `json:"booking_id"`
	Reason     string `json:"reason,omitempty"`
	GatewayRef string `json:"gateway_ref,omitempty"`
}
