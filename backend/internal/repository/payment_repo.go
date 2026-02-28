package repository

import (
	"booking-app/internal/domain"
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"

	"github.com/lib/pq"
)

// paymentRepo implements PaymentRepository backed by PostgreSQL.
type paymentRepo struct {
	db *sql.DB
}

// NewPaymentRepo creates a new PaymentRepository.
func NewPaymentRepo(db *sql.DB) PaymentRepository {
	return &paymentRepo{db: db}
}

// CreatePayment inserts a new payment record.
func (r *paymentRepo) CreatePayment(ctx context.Context, payment *domain.Payment) (*domain.Payment, error) {
	const q = `
		INSERT INTO payments (booking_id, amount, currency, status, idempotency_key)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, booking_id, amount, currency, status, idempotency_key,
		          COALESCE(gateway_ref, '') AS gateway_ref,
		          COALESCE(failed_reason, '') AS failed_reason,
		          created_at, updated_at
	`
	created := &domain.Payment{}
	err := r.db.QueryRowContext(ctx, q,
		payment.BookingID,
		payment.Amount,
		payment.Currency,
		payment.Status,
		payment.IdempotencyKey,
	).Scan(
		&created.ID,
		&created.BookingID,
		&created.Amount,
		&created.Currency,
		&created.Status,
		&created.IdempotencyKey,
		&created.GatewayRef,
		&created.FailedReason,
		&created.CreatedAt,
		&created.UpdatedAt,
	)
	if err != nil {
		var pgErr *pq.Error
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			return nil, fmt.Errorf("payment with this idempotency key exists: %w", domain.ErrConflict)
		}
		return nil, fmt.Errorf("create payment: %w", err)
	}
	return created, nil
}

// GetPaymentByID fetches a single payment by primary key.
func (r *paymentRepo) GetPaymentByID(ctx context.Context, id string) (*domain.Payment, error) {
	const q = `
		SELECT id, booking_id, amount, currency, status, idempotency_key,
		       COALESCE(gateway_ref, '') AS gateway_ref,
		       COALESCE(failed_reason, '') AS failed_reason,
		       created_at, updated_at
		FROM payments WHERE id = $1
	`
	p := &domain.Payment{}
	err := r.db.QueryRowContext(ctx, q, id).Scan(
		&p.ID, &p.BookingID, &p.Amount, &p.Currency, &p.Status,
		&p.IdempotencyKey, &p.GatewayRef, &p.FailedReason,
		&p.CreatedAt, &p.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, fmt.Errorf("payment %q not found: %w", id, domain.ErrNotFound)
		}
		return nil, fmt.Errorf("get payment by id: %w", err)
	}
	return p, nil
}

// GetPaymentByBookingID fetches the payment associated with a booking.
func (r *paymentRepo) GetPaymentByBookingID(ctx context.Context, bookingID int) (*domain.Payment, error) {
	const q = `
		SELECT id, booking_id, amount, currency, status, idempotency_key,
		       COALESCE(gateway_ref, '') AS gateway_ref,
		       COALESCE(failed_reason, '') AS failed_reason,
		       created_at, updated_at
		FROM payments WHERE booking_id = $1 LIMIT 1
	`
	p := &domain.Payment{}
	err := r.db.QueryRowContext(ctx, q, bookingID).Scan(
		&p.ID, &p.BookingID, &p.Amount, &p.Currency, &p.Status,
		&p.IdempotencyKey, &p.GatewayRef, &p.FailedReason,
		&p.CreatedAt, &p.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, fmt.Errorf("payment for booking %d not found: %w", bookingID, domain.ErrNotFound)
		}
		return nil, fmt.Errorf("get payment by booking id: %w", err)
	}
	return p, nil
}

// UpdatePaymentStatus updates status, gateway_ref, failed_reason, and updated_at.
func (r *paymentRepo) UpdatePaymentStatus(ctx context.Context, id string, status domain.PaymentStatus, gatewayRef, failedReason string) error {
	const q = `
		UPDATE payments
		SET status = $1,
		    gateway_ref = NULLIF($2, ''),
		    failed_reason = NULLIF($3, ''),
		    updated_at = NOW()
		WHERE id = $4
	`
	res, err := r.db.ExecContext(ctx, q, status, gatewayRef, failedReason, id)
	if err != nil {
		return fmt.Errorf("update payment status: %w", err)
	}
	rows, _ := res.RowsAffected()
	if rows == 0 {
		return fmt.Errorf("payment %q not found: %w", id, domain.ErrNotFound)
	}
	return nil
}

// GetPaymentByIdempotencyKey fetches a payment by its idempotency key.
func (r *paymentRepo) GetPaymentByIdempotencyKey(ctx context.Context, key string) (*domain.Payment, error) {
	const q = `
		SELECT id, booking_id, amount, currency, status, idempotency_key,
		       COALESCE(gateway_ref, '') AS gateway_ref,
		       COALESCE(failed_reason, '') AS failed_reason,
		       created_at, updated_at
		FROM payments WHERE idempotency_key = $1
	`
	p := &domain.Payment{}
	err := r.db.QueryRowContext(ctx, q, key).Scan(
		&p.ID, &p.BookingID, &p.Amount, &p.Currency, &p.Status,
		&p.IdempotencyKey, &p.GatewayRef, &p.FailedReason,
		&p.CreatedAt, &p.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, fmt.Errorf("payment with key %q not found: %w", key, domain.ErrNotFound)
		}
		return nil, fmt.Errorf("get payment by idempotency key: %w", err)
	}
	return p, nil
}

// outboxRepo implements OutboxRepository backed by PostgreSQL.
type outboxRepo struct {
	db *sql.DB
}

// NewOutboxRepo creates a new OutboxRepository.
func NewOutboxRepo(db *sql.DB) OutboxRepository {
	return &outboxRepo{db: db}
}

// CreateEvent inserts a new outbox event.
func (r *outboxRepo) CreateEvent(ctx context.Context, event *domain.OutboxEvent) error {
	const q = `
		INSERT INTO outbox_events (aggregate_type, aggregate_id, event_type, payload)
		VALUES ($1, $2, $3, $4)
		RETURNING id, created_at
	`
	err := r.db.QueryRowContext(ctx, q,
		event.AggregateType,
		event.AggregateID,
		event.EventType,
		event.Payload,
	).Scan(&event.ID, &event.CreatedAt)
	if err != nil {
		return fmt.Errorf("create outbox event: %w", err)
	}
	return nil
}

// ListUnpublishedEvents returns unpublished events ordered by created_at ascending,
// with a limit on the count.
func (r *outboxRepo) ListUnpublishedEvents(ctx context.Context, limit int) ([]*domain.OutboxEvent, error) {
	const q = `
		SELECT id, aggregate_type, aggregate_id, event_type, payload,
		       published_at, retry_count, created_at
		FROM outbox_events
		WHERE published_at IS NULL
		ORDER BY created_at ASC
		LIMIT $1
	`
	rows, err := r.db.QueryContext(ctx, q, limit)
	if err != nil {
		return nil, fmt.Errorf("list unpublished events: %w", err)
	}
	defer rows.Close()

	var events []*domain.OutboxEvent
	for rows.Next() {
		e := &domain.OutboxEvent{}
		if err := rows.Scan(
			&e.ID, &e.AggregateType, &e.AggregateID, &e.EventType,
			&e.Payload, &e.PublishedAt, &e.RetryCount, &e.CreatedAt,
		); err != nil {
			return nil, fmt.Errorf("scan outbox event: %w", err)
		}
		events = append(events, e)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate outbox events: %w", err)
	}
	return events, nil
}

// MarkPublished sets the published_at timestamp for an event.
func (r *outboxRepo) MarkPublished(ctx context.Context, id string, publishedAt time.Time) error {
	const q = `UPDATE outbox_events SET published_at = $1 WHERE id = $2`
	_, err := r.db.ExecContext(ctx, q, publishedAt, id)
	if err != nil {
		return fmt.Errorf("mark outbox event published: %w", err)
	}
	return nil
}

// IncrementRetry bumps the retry_count for an event.
func (r *outboxRepo) IncrementRetry(ctx context.Context, id string) error {
	const q = `UPDATE outbox_events SET retry_count = retry_count + 1 WHERE id = $1`
	_, err := r.db.ExecContext(ctx, q, id)
	if err != nil {
		return fmt.Errorf("increment retry count: %w", err)
	}
	return nil
}

// IsEventProcessed returns true if the event has already been processed.
func (r *outboxRepo) IsEventProcessed(ctx context.Context, eventID string) (bool, error) {
	const q = `SELECT 1 FROM processed_events WHERE event_id = $1`
	var dummy int
	err := r.db.QueryRowContext(ctx, q, eventID).Scan(&dummy)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return false, nil
		}
		return false, fmt.Errorf("check processed event: %w", err)
	}
	return true, nil
}

// MarkProcessed records an event as processed for idempotency.
func (r *outboxRepo) MarkProcessed(ctx context.Context, eventID string) error {
	const q = `
		INSERT INTO processed_events (event_id) VALUES ($1)
		ON CONFLICT (event_id) DO NOTHING
	`
	_, err := r.db.ExecContext(ctx, q, eventID)
	if err != nil {
		return fmt.Errorf("mark event processed: %w", err)
	}
	return nil
}

// ListDLQEvents returns outbox events where retry_count >= maxRetries, paginated.
func (r *outboxRepo) ListDLQEvents(ctx context.Context, maxRetries, page, limit int) ([]*domain.OutboxEvent, int, error) {
	offset := (page - 1) * limit

	var total int
	if err := r.db.QueryRowContext(ctx,
		`SELECT COUNT(*) FROM outbox_events WHERE retry_count >= $1`,
		maxRetries,
	).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("count DLQ events: %w", err)
	}

	const q = `
		SELECT id, aggregate_type, aggregate_id, event_type, payload,
		       published_at, retry_count, created_at
		FROM outbox_events
		WHERE retry_count >= $1
		ORDER BY created_at DESC
		LIMIT $2 OFFSET $3
	`
	rows, err := r.db.QueryContext(ctx, q, maxRetries, limit, offset)
	if err != nil {
		return nil, 0, fmt.Errorf("list DLQ events: %w", err)
	}
	defer rows.Close()

	var events []*domain.OutboxEvent
	for rows.Next() {
		e := &domain.OutboxEvent{}
		if err := rows.Scan(
			&e.ID, &e.AggregateType, &e.AggregateID, &e.EventType,
			&e.Payload, &e.PublishedAt, &e.RetryCount, &e.CreatedAt,
		); err != nil {
			return nil, 0, fmt.Errorf("scan DLQ event: %w", err)
		}
		events = append(events, e)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("iterate DLQ events: %w", err)
	}
	if events == nil {
		events = []*domain.OutboxEvent{}
	}
	return events, total, nil
}

// ResetDLQEvent sets retry_count=0 and published_at=NULL for an event so it is retried.
func (r *outboxRepo) ResetDLQEvent(ctx context.Context, id string) error {
	const q = `UPDATE outbox_events SET retry_count = 0, published_at = NULL WHERE id = $1`
	res, err := r.db.ExecContext(ctx, q, id)
	if err != nil {
		return fmt.Errorf("reset DLQ event: %w", err)
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return fmt.Errorf("outbox event %q not found: %w", id, domain.ErrNotFound)
	}
	return nil
}
