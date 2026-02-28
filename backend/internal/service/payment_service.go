package service

import (
	"booking-app/internal/domain"
	"booking-app/internal/repository"
	"context"
	"encoding/json"
	"fmt"
	"math/rand"
	"time"
)

// PaymentServiceInterface defines the contract for payment business logic.
type PaymentServiceInterface interface {
	// ProcessPayment simulates payment processing via mock gateway.
	// Called by the worker consumer after receiving BookingPaymentInitiated event.
	ProcessPayment(ctx context.Context, paymentID string) error
	// GetPayment retrieves a payment by ID.
	GetPayment(ctx context.Context, id string, callerUserID string) (*domain.Payment, error)
}

// PaymentService implements PaymentServiceInterface with a mock gateway.
type PaymentService struct {
	payRepo    repository.PaymentRepository
	outboxRepo repository.OutboxRepository
	rng        *rand.Rand
}

// NewPaymentService creates a new PaymentService.
// seed controls the random number generator — use a fixed seed for deterministic tests.
func NewPaymentService(payRepo repository.PaymentRepository, outboxRepo repository.OutboxRepository, seed int64) *PaymentService {
	return &PaymentService{
		payRepo:    payRepo,
		outboxRepo: outboxRepo,
		rng:        rand.New(rand.NewSource(seed)), //nolint:gosec
	}
}

// ProcessPayment runs the mock payment gateway logic:
//   - 80% → success (PaymentSucceeded)
//   - 15% → failure (PaymentFailed)
//   - 5%  → timeout (PaymentTimedOut)
func (s *PaymentService) ProcessPayment(ctx context.Context, paymentID string) error {
	payment, err := s.payRepo.GetPaymentByID(ctx, paymentID)
	if err != nil {
		return fmt.Errorf("get payment: %w", err)
	}

	// Idempotency: if already in a terminal state, skip processing.
	if isTerminalStatus(payment.Status) {
		return nil
	}

	// Mark payment as processing.
	if updateErr := s.payRepo.UpdatePaymentStatus(ctx, paymentID, domain.PaymentStatusProcessing, "", ""); updateErr != nil {
		return fmt.Errorf("mark processing: %w", updateErr)
	}

	// Simulate gateway call.
	outcome := s.rng.Intn(100) //nolint:gosec
	switch {
	case outcome < 80:
		return s.handleGatewaySuccess(ctx, payment)
	case outcome < 95:
		return s.handleGatewayFailure(ctx, payment, "card declined by mock gateway")
	default:
		return s.handleGatewayTimeout(ctx, payment)
	}
}

func (s *PaymentService) handleGatewaySuccess(ctx context.Context, payment *domain.Payment) error {
	gatewayRef := fmt.Sprintf("GW-%d", time.Now().UnixNano())
	if err := s.payRepo.UpdatePaymentStatus(ctx, payment.ID, domain.PaymentStatusSucceeded, gatewayRef, ""); err != nil {
		return fmt.Errorf("update payment succeeded: %w", err)
	}

	payload := domain.PaymentResultPayload{
		PaymentID:  payment.ID,
		BookingID:  payment.BookingID,
		GatewayRef: gatewayRef,
	}
	return s.emitEvent(ctx, payment.ID, domain.EventTypePaymentSucceeded, payload)
}

func (s *PaymentService) handleGatewayFailure(ctx context.Context, payment *domain.Payment, reason string) error {
	if err := s.payRepo.UpdatePaymentStatus(ctx, payment.ID, domain.PaymentStatusFailed, "", reason); err != nil {
		return fmt.Errorf("update payment failed: %w", err)
	}

	payload := domain.PaymentResultPayload{
		PaymentID: payment.ID,
		BookingID: payment.BookingID,
		Reason:    reason,
	}
	return s.emitEvent(ctx, payment.ID, domain.EventTypePaymentFailed, payload)
}

func (s *PaymentService) handleGatewayTimeout(ctx context.Context, payment *domain.Payment) error {
	if err := s.payRepo.UpdatePaymentStatus(ctx, payment.ID, domain.PaymentStatusTimedOut, "", "gateway timeout"); err != nil {
		return fmt.Errorf("update payment timed out: %w", err)
	}

	payload := domain.PaymentResultPayload{
		PaymentID: payment.ID,
		BookingID: payment.BookingID,
		Reason:    "gateway timeout",
	}
	return s.emitEvent(ctx, payment.ID, domain.EventTypePaymentTimedOut, payload)
}

func (s *PaymentService) emitEvent(ctx context.Context, paymentID, eventType string, payload interface{}) error {
	raw, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("marshal event payload: %w", err)
	}

	event := &domain.OutboxEvent{
		AggregateType: "payment",
		AggregateID:   paymentID,
		EventType:     eventType,
		Payload:       raw,
	}
	if createErr := s.outboxRepo.CreateEvent(ctx, event); createErr != nil {
		return fmt.Errorf("create outbox event: %w", createErr)
	}
	return nil
}

// GetPayment retrieves a payment by ID after validating input.
func (s *PaymentService) GetPayment(ctx context.Context, id string, callerUserID string) (*domain.Payment, error) {
	if id == "" {
		return nil, fmt.Errorf("payment id is required: %w", domain.ErrBadRequest)
	}
	return s.payRepo.GetPaymentByID(ctx, id)
}

// isTerminalStatus returns true for statuses that should not be re-processed.
func isTerminalStatus(status domain.PaymentStatus) bool {
	switch status {
	case domain.PaymentStatusSucceeded, domain.PaymentStatusFailed, domain.PaymentStatusTimedOut, domain.PaymentStatusRefunded:
		return true
	}
	return false
}
