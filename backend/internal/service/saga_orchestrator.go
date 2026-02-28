package service

import (
	"booking-app/internal/domain"
	"booking-app/internal/repository"
	"context"
	"encoding/json"
	"fmt"
	"time"
)

// SagaOrchestratorInterface defines the contract for the payment saga FSM.
type SagaOrchestratorInterface interface {
	// StartCheckout initiates the payment saga for a booking.
	StartCheckout(ctx context.Context, bookingID int, userID string) (*domain.Payment, error)
	// HandlePaymentSuccess transitions booking to confirmed state.
	HandlePaymentSuccess(ctx context.Context, paymentID string) error
	// HandlePaymentFailure marks booking as failed and restores inventory.
	HandlePaymentFailure(ctx context.Context, paymentID string, reason string) error
	// HandlePaymentTimeout cancels booking and restores inventory.
	HandlePaymentTimeout(ctx context.Context, paymentID string) error
}

// SagaBookingRepository is the minimal booking repo surface needed by the saga.
type SagaBookingRepository interface {
	FindBookingByID(ctx context.Context, id int) (*domain.Booking, error)
	UpdateBookingStatus(ctx context.Context, id int, status string) error
}

// InventoryRestorer restores inventory when a payment fails or times out.
type InventoryRestorer interface {
	RestoreInventory(ctx context.Context, roomID int, startDate, endDate time.Time) error
}

// NotificationSender is an optional side-effect: send a user notification after
// a saga state transition. Errors are logged and treated as non-fatal so they
// never abort the saga.
type NotificationSender interface {
	Notify(ctx context.Context, userID string, notifType domain.NotificationType, title, message string, data map[string]any) error
}

// SagaOption configures a SagaOrchestrator.
type SagaOption func(*SagaOrchestrator)

// WithNotificationSender wires an optional notification sender.
func WithNotificationSender(n NotificationSender) SagaOption {
	return func(s *SagaOrchestrator) { s.notifier = n }
}

// SagaOrchestrator implements the payment saga FSM.
type SagaOrchestrator struct {
	bookingRepo       SagaBookingRepository
	payRepo           repository.PaymentRepository
	outboxRepo        repository.OutboxRepository
	inventoryRestorer InventoryRestorer
	notifier          NotificationSender // optional
}

// NewSagaOrchestrator creates a new SagaOrchestrator.
func NewSagaOrchestrator(
	bookingRepo SagaBookingRepository,
	payRepo repository.PaymentRepository,
	outboxRepo repository.OutboxRepository,
	inventoryRestorer InventoryRestorer,
	opts ...SagaOption,
) *SagaOrchestrator {
	s := &SagaOrchestrator{
		bookingRepo:       bookingRepo,
		payRepo:           payRepo,
		outboxRepo:        outboxRepo,
		inventoryRestorer: inventoryRestorer,
	}
	for _, opt := range opts {
		opt(s)
	}
	return s
}

// StartCheckout initiates the payment saga:
//  1. Validates booking belongs to user and is in a checkable state.
//  2. Creates a Payment record (status=pending).
//  3. Creates an outbox event (BookingPaymentInitiated).
//  4. Updates booking status to awaiting_payment.
func (s *SagaOrchestrator) StartCheckout(ctx context.Context, bookingID int, userID string) (*domain.Payment, error) {
	booking, err := s.bookingRepo.FindBookingByID(ctx, bookingID)
	if err != nil {
		return nil, fmt.Errorf("find booking: %w", err)
	}

	if booking.UserID != userID {
		return nil, fmt.Errorf("booking does not belong to caller: %w", domain.ErrForbidden)
	}

	// Guard: only pending bookings can be checked out.
	if booking.Status != domain.BookingStatusPending {
		return nil, fmt.Errorf("booking status %q cannot be checked out: %w", booking.Status, domain.ErrConflict)
	}

	idempotencyKey := fmt.Sprintf("checkout:%d:%s", bookingID, userID)

	payment := &domain.Payment{
		BookingID:      bookingID,
		Amount:         booking.TotalPrice,
		Currency:       "USD",
		Status:         domain.PaymentStatusPending,
		IdempotencyKey: idempotencyKey,
	}

	created, err := s.payRepo.CreatePayment(ctx, payment)
	if err != nil {
		return nil, fmt.Errorf("create payment: %w", err)
	}

	// Emit BookingPaymentInitiated outbox event.
	if emitErr := s.emitInitiatedEvent(ctx, created, booking); emitErr != nil {
		return nil, fmt.Errorf("emit initiated event: %w", emitErr)
	}

	// Transition booking to awaiting_payment.
	if updateErr := s.bookingRepo.UpdateBookingStatus(ctx, bookingID, domain.BookingStatusAwaitingPayment); updateErr != nil {
		return nil, fmt.Errorf("update booking status: %w", updateErr)
	}

	return created, nil
}

// HandlePaymentSuccess transitions booking to confirmed.
func (s *SagaOrchestrator) HandlePaymentSuccess(ctx context.Context, paymentID string) error {
	payment, err := s.payRepo.GetPaymentByID(ctx, paymentID)
	if err != nil {
		return fmt.Errorf("get payment: %w", err)
	}

	if err := s.payRepo.UpdatePaymentStatus(ctx, paymentID, domain.PaymentStatusSucceeded, "", ""); err != nil {
		return fmt.Errorf("update payment status: %w", err)
	}

	booking, err := s.bookingRepo.FindBookingByID(ctx, payment.BookingID)
	if err != nil {
		return fmt.Errorf("find booking for confirmation: %w", err)
	}

	if err := s.bookingRepo.UpdateBookingStatus(ctx, payment.BookingID, domain.BookingStatusConfirmed); err != nil {
		return fmt.Errorf("update booking confirmed: %w", err)
	}

	s.notify(ctx, booking.UserID, domain.NotificationTypeBookingConfirmed,
		"Booking Confirmed",
		fmt.Sprintf("Your booking #%d has been confirmed. Enjoy your stay!", payment.BookingID),
		map[string]any{"booking_id": payment.BookingID, "payment_id": paymentID},
	)
	return nil
}

// HandlePaymentFailure marks booking as failed and restores inventory.
func (s *SagaOrchestrator) HandlePaymentFailure(ctx context.Context, paymentID string, reason string) error {
	payment, err := s.payRepo.GetPaymentByID(ctx, paymentID)
	if err != nil {
		return fmt.Errorf("get payment: %w", err)
	}

	if err := s.payRepo.UpdatePaymentStatus(ctx, paymentID, domain.PaymentStatusFailed, "", reason); err != nil {
		return fmt.Errorf("update payment status: %w", err)
	}

	booking, err := s.bookingRepo.FindBookingByID(ctx, payment.BookingID)
	if err != nil {
		return fmt.Errorf("find booking for inventory restore: %w", err)
	}

	if err := s.bookingRepo.UpdateBookingStatus(ctx, payment.BookingID, domain.BookingStatusFailed); err != nil {
		return fmt.Errorf("update booking failed: %w", err)
	}

	if err := s.inventoryRestorer.RestoreInventory(ctx, booking.RoomID, booking.StartDate, booking.EndDate); err != nil {
		return fmt.Errorf("restore inventory: %w", err)
	}

	s.notify(ctx, booking.UserID, domain.NotificationTypePaymentFailed,
		"Payment Failed",
		fmt.Sprintf("Payment for booking #%d failed: %s. Please try again.", payment.BookingID, reason),
		map[string]any{"booking_id": payment.BookingID, "payment_id": paymentID, "reason": reason},
	)
	return nil
}

// HandlePaymentTimeout cancels booking and restores inventory.
func (s *SagaOrchestrator) HandlePaymentTimeout(ctx context.Context, paymentID string) error {
	payment, err := s.payRepo.GetPaymentByID(ctx, paymentID)
	if err != nil {
		return fmt.Errorf("get payment: %w", err)
	}

	if err := s.payRepo.UpdatePaymentStatus(ctx, paymentID, domain.PaymentStatusTimedOut, "", "gateway timeout"); err != nil {
		return fmt.Errorf("update payment status: %w", err)
	}

	booking, err := s.bookingRepo.FindBookingByID(ctx, payment.BookingID)
	if err != nil {
		return fmt.Errorf("find booking for inventory restore: %w", err)
	}

	if err := s.bookingRepo.UpdateBookingStatus(ctx, payment.BookingID, domain.BookingStatusCancelled); err != nil {
		return fmt.Errorf("update booking cancelled: %w", err)
	}

	if err := s.inventoryRestorer.RestoreInventory(ctx, booking.RoomID, booking.StartDate, booking.EndDate); err != nil {
		return fmt.Errorf("restore inventory: %w", err)
	}

	s.notify(ctx, booking.UserID, domain.NotificationTypePaymentTimedOut,
		"Payment Timed Out",
		fmt.Sprintf("Payment for booking #%d timed out. Your booking has been cancelled.", payment.BookingID),
		map[string]any{"booking_id": payment.BookingID, "payment_id": paymentID},
	)
	return nil
}

// notify sends a notification if a notifier is configured. Errors are non-fatal.
func (s *SagaOrchestrator) notify(ctx context.Context, userID string, notifType domain.NotificationType, title, message string, data map[string]any) {
	if s.notifier == nil {
		return
	}
	_ = s.notifier.Notify(ctx, userID, notifType, title, message, data) // best-effort
}

func (s *SagaOrchestrator) emitInitiatedEvent(ctx context.Context, payment *domain.Payment, booking *domain.Booking) error {
	payload := domain.PaymentInitiatedPayload{
		PaymentID: payment.ID,
		BookingID: booking.ID,
		Amount:    payment.Amount,
		Currency:  payment.Currency,
		UserID:    booking.UserID,
	}
	raw, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("marshal payload: %w", err)
	}
	event := &domain.OutboxEvent{
		AggregateType: "booking",
		AggregateID:   fmt.Sprintf("%d", booking.ID),
		EventType:     domain.EventTypeBookingPaymentInitiated,
		Payload:       raw,
	}
	return s.outboxRepo.CreateEvent(ctx, event)
}
