package service_test

import (
	"booking-app/internal/domain"
	"booking-app/internal/service"
	"context"
	"errors"
	"testing"
	"time"
)

// --- Mock BookingRepository (used by SagaOrchestrator) ---

type mockSagaBookingRepo struct {
	findBookingByIDFn    func(ctx context.Context, id int) (*domain.Booking, error)
	updateBookingStatusFn func(ctx context.Context, id int, status string) error
}

func (m *mockSagaBookingRepo) FindBookingByID(ctx context.Context, id int) (*domain.Booking, error) {
	return m.findBookingByIDFn(ctx, id)
}

func (m *mockSagaBookingRepo) UpdateBookingStatus(ctx context.Context, id int, status string) error {
	return m.updateBookingStatusFn(ctx, id, status)
}

func makeSagaBookingRepo(overrides mockSagaBookingRepo) *mockSagaBookingRepo {
	defaults := &mockSagaBookingRepo{
		findBookingByIDFn: func(ctx context.Context, id int) (*domain.Booking, error) {
			return &domain.Booking{
				ID:         id,
				UserID:     "user-1",
				RoomID:     10,
				TotalPrice: 200.00,
				Status:     domain.BookingStatusPending,
				StartDate:  time.Now(),
				EndDate:    time.Now().Add(48 * time.Hour),
			}, nil
		},
		updateBookingStatusFn: func(ctx context.Context, id int, status string) error {
			return nil
		},
	}
	if overrides.findBookingByIDFn != nil {
		defaults.findBookingByIDFn = overrides.findBookingByIDFn
	}
	if overrides.updateBookingStatusFn != nil {
		defaults.updateBookingStatusFn = overrides.updateBookingStatusFn
	}
	return defaults
}

// --- Mock InventoryRestorer (used to restore inventory on failure/timeout) ---

type mockInventoryRestorer struct {
	restoreInventoryFn func(ctx context.Context, roomID int, startDate, endDate time.Time) error
}

func (m *mockInventoryRestorer) RestoreInventory(ctx context.Context, roomID int, startDate, endDate time.Time) error {
	return m.restoreInventoryFn(ctx, roomID, startDate, endDate)
}

func makeMockInventoryRestorer(overrides mockInventoryRestorer) *mockInventoryRestorer {
	defaults := &mockInventoryRestorer{
		restoreInventoryFn: func(ctx context.Context, roomID int, startDate, endDate time.Time) error {
			return nil
		},
	}
	if overrides.restoreInventoryFn != nil {
		defaults.restoreInventoryFn = overrides.restoreInventoryFn
	}
	return defaults
}

// --- Tests: SagaOrchestrator.StartCheckout ---

func TestSagaOrchestrator_StartCheckout_Success(t *testing.T) {
	bookingRepo := makeSagaBookingRepo(mockSagaBookingRepo{})
	payRepo := makePaymentRepo(mockPaymentRepo{})
	outboxRepo := makeOutboxRepo(mockOutboxRepo{})
	inventoryRestorer := makeMockInventoryRestorer(mockInventoryRestorer{})

	orch := service.NewSagaOrchestrator(bookingRepo, payRepo, outboxRepo, inventoryRestorer)
	payment, err := orch.StartCheckout(context.Background(), 1, "user-1")

	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if payment == nil {
		t.Fatal("expected payment to be returned")
	}
	if payment.BookingID != 1 {
		t.Errorf("expected BookingID 1, got %d", payment.BookingID)
	}
	if payment.Status != domain.PaymentStatusPending {
		t.Errorf("expected status pending, got %q", payment.Status)
	}
}

func TestSagaOrchestrator_StartCheckout_BookingNotFound(t *testing.T) {
	bookingRepo := makeSagaBookingRepo(mockSagaBookingRepo{
		findBookingByIDFn: func(ctx context.Context, id int) (*domain.Booking, error) {
			return nil, domain.ErrNotFound
		},
	})
	payRepo := makePaymentRepo(mockPaymentRepo{})
	outboxRepo := makeOutboxRepo(mockOutboxRepo{})
	inventoryRestorer := makeMockInventoryRestorer(mockInventoryRestorer{})

	orch := service.NewSagaOrchestrator(bookingRepo, payRepo, outboxRepo, inventoryRestorer)
	_, err := orch.StartCheckout(context.Background(), 999, "user-1")

	if !errors.Is(err, domain.ErrNotFound) {
		t.Errorf("expected ErrNotFound, got %v", err)
	}
}

func TestSagaOrchestrator_StartCheckout_WrongUser(t *testing.T) {
	bookingRepo := makeSagaBookingRepo(mockSagaBookingRepo{
		findBookingByIDFn: func(ctx context.Context, id int) (*domain.Booking, error) {
			return &domain.Booking{
				ID:     id,
				UserID: "owner-user",
				Status: domain.BookingStatusPending,
			}, nil
		},
	})
	payRepo := makePaymentRepo(mockPaymentRepo{})
	outboxRepo := makeOutboxRepo(mockOutboxRepo{})
	inventoryRestorer := makeMockInventoryRestorer(mockInventoryRestorer{})

	orch := service.NewSagaOrchestrator(bookingRepo, payRepo, outboxRepo, inventoryRestorer)
	_, err := orch.StartCheckout(context.Background(), 1, "different-user")

	if !errors.Is(err, domain.ErrForbidden) {
		t.Errorf("expected ErrForbidden, got %v", err)
	}
}

func TestSagaOrchestrator_StartCheckout_AlreadyAwaitingPayment(t *testing.T) {
	bookingRepo := makeSagaBookingRepo(mockSagaBookingRepo{
		findBookingByIDFn: func(ctx context.Context, id int) (*domain.Booking, error) {
			return &domain.Booking{
				ID:     id,
				UserID: "user-1",
				Status: domain.BookingStatusAwaitingPayment,
			}, nil
		},
	})
	payRepo := makePaymentRepo(mockPaymentRepo{})
	outboxRepo := makeOutboxRepo(mockOutboxRepo{})
	inventoryRestorer := makeMockInventoryRestorer(mockInventoryRestorer{})

	orch := service.NewSagaOrchestrator(bookingRepo, payRepo, outboxRepo, inventoryRestorer)
	_, err := orch.StartCheckout(context.Background(), 1, "user-1")

	if !errors.Is(err, domain.ErrConflict) {
		t.Errorf("expected ErrConflict for already-awaiting-payment booking, got %v", err)
	}
}

func TestSagaOrchestrator_StartCheckout_BookingStatusUpdated(t *testing.T) {
	var capturedStatus string
	bookingRepo := makeSagaBookingRepo(mockSagaBookingRepo{
		updateBookingStatusFn: func(ctx context.Context, id int, status string) error {
			capturedStatus = status
			return nil
		},
	})
	payRepo := makePaymentRepo(mockPaymentRepo{})
	outboxRepo := makeOutboxRepo(mockOutboxRepo{})
	inventoryRestorer := makeMockInventoryRestorer(mockInventoryRestorer{})

	orch := service.NewSagaOrchestrator(bookingRepo, payRepo, outboxRepo, inventoryRestorer)
	_, err := orch.StartCheckout(context.Background(), 1, "user-1")

	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if capturedStatus != domain.BookingStatusAwaitingPayment {
		t.Errorf("expected booking status %q, got %q", domain.BookingStatusAwaitingPayment, capturedStatus)
	}
}

func TestSagaOrchestrator_StartCheckout_OutboxEventCreated(t *testing.T) {
	var capturedEventType string
	bookingRepo := makeSagaBookingRepo(mockSagaBookingRepo{})
	payRepo := makePaymentRepo(mockPaymentRepo{})
	outboxRepo := makeOutboxRepo(mockOutboxRepo{
		createEventFn: func(ctx context.Context, event *domain.OutboxEvent) error {
			capturedEventType = event.EventType
			return nil
		},
	})
	inventoryRestorer := makeMockInventoryRestorer(mockInventoryRestorer{})

	orch := service.NewSagaOrchestrator(bookingRepo, payRepo, outboxRepo, inventoryRestorer)
	_, err := orch.StartCheckout(context.Background(), 1, "user-1")

	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if capturedEventType != domain.EventTypeBookingPaymentInitiated {
		t.Errorf("expected event type %q, got %q", domain.EventTypeBookingPaymentInitiated, capturedEventType)
	}
}

// --- Tests: SagaOrchestrator.HandlePaymentSuccess ---

func TestSagaOrchestrator_HandlePaymentSuccess_BookingConfirmed(t *testing.T) {
	var capturedStatus string
	payRepo := makePaymentRepo(mockPaymentRepo{
		getPaymentByIDFn: func(ctx context.Context, id string) (*domain.Payment, error) {
			return &domain.Payment{
				ID:        id,
				BookingID: 5,
				Status:    domain.PaymentStatusProcessing,
			}, nil
		},
	})
	bookingRepo := makeSagaBookingRepo(mockSagaBookingRepo{
		updateBookingStatusFn: func(ctx context.Context, id int, status string) error {
			capturedStatus = status
			return nil
		},
	})
	outboxRepo := makeOutboxRepo(mockOutboxRepo{})
	inventoryRestorer := makeMockInventoryRestorer(mockInventoryRestorer{})

	orch := service.NewSagaOrchestrator(bookingRepo, payRepo, outboxRepo, inventoryRestorer)
	err := orch.HandlePaymentSuccess(context.Background(), "pay-id")

	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if capturedStatus != domain.BookingStatusConfirmed {
		t.Errorf("expected booking status %q, got %q", domain.BookingStatusConfirmed, capturedStatus)
	}
}

func TestSagaOrchestrator_HandlePaymentSuccess_PaymentNotFound(t *testing.T) {
	payRepo := makePaymentRepo(mockPaymentRepo{
		getPaymentByIDFn: func(ctx context.Context, id string) (*domain.Payment, error) {
			return nil, domain.ErrNotFound
		},
	})
	bookingRepo := makeSagaBookingRepo(mockSagaBookingRepo{})
	outboxRepo := makeOutboxRepo(mockOutboxRepo{})
	inventoryRestorer := makeMockInventoryRestorer(mockInventoryRestorer{})

	orch := service.NewSagaOrchestrator(bookingRepo, payRepo, outboxRepo, inventoryRestorer)
	err := orch.HandlePaymentSuccess(context.Background(), "bad-id")

	if !errors.Is(err, domain.ErrNotFound) {
		t.Errorf("expected ErrNotFound, got %v", err)
	}
}

// --- Tests: SagaOrchestrator.HandlePaymentFailure ---

func TestSagaOrchestrator_HandlePaymentFailure_BookingMarkedFailed(t *testing.T) {
	var capturedStatus string
	inventoryRestored := false
	payRepo := makePaymentRepo(mockPaymentRepo{
		getPaymentByIDFn: func(ctx context.Context, id string) (*domain.Payment, error) {
			return &domain.Payment{
				ID:        id,
				BookingID: 5,
				Status:    domain.PaymentStatusProcessing,
			}, nil
		},
	})
	bookingRepo := makeSagaBookingRepo(mockSagaBookingRepo{
		updateBookingStatusFn: func(ctx context.Context, id int, status string) error {
			capturedStatus = status
			return nil
		},
	})
	outboxRepo := makeOutboxRepo(mockOutboxRepo{})
	inventoryRestorer := makeMockInventoryRestorer(mockInventoryRestorer{
		restoreInventoryFn: func(ctx context.Context, roomID int, startDate, endDate time.Time) error {
			inventoryRestored = true
			return nil
		},
	})

	orch := service.NewSagaOrchestrator(bookingRepo, payRepo, outboxRepo, inventoryRestorer)
	err := orch.HandlePaymentFailure(context.Background(), "pay-id", "card declined")

	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if capturedStatus != domain.BookingStatusFailed {
		t.Errorf("expected booking status %q, got %q", domain.BookingStatusFailed, capturedStatus)
	}
	if !inventoryRestored {
		t.Error("expected inventory to be restored on payment failure")
	}
}

// --- Tests: SagaOrchestrator.HandlePaymentTimeout ---

func TestSagaOrchestrator_HandlePaymentTimeout_BookingCancelled(t *testing.T) {
	var capturedStatus string
	inventoryRestored := false
	payRepo := makePaymentRepo(mockPaymentRepo{
		getPaymentByIDFn: func(ctx context.Context, id string) (*domain.Payment, error) {
			return &domain.Payment{
				ID:        id,
				BookingID: 5,
				Status:    domain.PaymentStatusProcessing,
			}, nil
		},
	})
	bookingRepo := makeSagaBookingRepo(mockSagaBookingRepo{
		updateBookingStatusFn: func(ctx context.Context, id int, status string) error {
			capturedStatus = status
			return nil
		},
	})
	outboxRepo := makeOutboxRepo(mockOutboxRepo{})
	inventoryRestorer := makeMockInventoryRestorer(mockInventoryRestorer{
		restoreInventoryFn: func(ctx context.Context, roomID int, startDate, endDate time.Time) error {
			inventoryRestored = true
			return nil
		},
	})

	orch := service.NewSagaOrchestrator(bookingRepo, payRepo, outboxRepo, inventoryRestorer)
	err := orch.HandlePaymentTimeout(context.Background(), "pay-id")

	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if capturedStatus != domain.BookingStatusCancelled {
		t.Errorf("expected booking status %q, got %q", domain.BookingStatusCancelled, capturedStatus)
	}
	if !inventoryRestored {
		t.Error("expected inventory to be restored on payment timeout")
	}
}

func TestSagaOrchestrator_HandlePaymentFailure_PaymentNotFound(t *testing.T) {
	payRepo := makePaymentRepo(mockPaymentRepo{
		getPaymentByIDFn: func(ctx context.Context, id string) (*domain.Payment, error) {
			return nil, domain.ErrNotFound
		},
	})
	bookingRepo := makeSagaBookingRepo(mockSagaBookingRepo{})
	outboxRepo := makeOutboxRepo(mockOutboxRepo{})
	inventoryRestorer := makeMockInventoryRestorer(mockInventoryRestorer{})

	orch := service.NewSagaOrchestrator(bookingRepo, payRepo, outboxRepo, inventoryRestorer)
	err := orch.HandlePaymentFailure(context.Background(), "bad-id", "declined")

	if !errors.Is(err, domain.ErrNotFound) {
		t.Errorf("expected ErrNotFound, got %v", err)
	}
}

func TestSagaOrchestrator_HandlePaymentFailure_UpdateStatusError(t *testing.T) {
	payRepo := makePaymentRepo(mockPaymentRepo{
		updatePaymentStatusFn: func(ctx context.Context, id string, status domain.PaymentStatus, ref, reason string) error {
			return domain.ErrInternal
		},
	})
	bookingRepo := makeSagaBookingRepo(mockSagaBookingRepo{})
	outboxRepo := makeOutboxRepo(mockOutboxRepo{})
	inventoryRestorer := makeMockInventoryRestorer(mockInventoryRestorer{})

	orch := service.NewSagaOrchestrator(bookingRepo, payRepo, outboxRepo, inventoryRestorer)
	err := orch.HandlePaymentFailure(context.Background(), "pay-id", "declined")

	if err == nil {
		t.Error("expected error when update payment status fails")
	}
}

func TestSagaOrchestrator_HandlePaymentFailure_BookingNotFound(t *testing.T) {
	payRepo := makePaymentRepo(mockPaymentRepo{})
	bookingRepo := makeSagaBookingRepo(mockSagaBookingRepo{
		findBookingByIDFn: func(ctx context.Context, id int) (*domain.Booking, error) {
			return nil, domain.ErrNotFound
		},
	})
	outboxRepo := makeOutboxRepo(mockOutboxRepo{})
	inventoryRestorer := makeMockInventoryRestorer(mockInventoryRestorer{})

	orch := service.NewSagaOrchestrator(bookingRepo, payRepo, outboxRepo, inventoryRestorer)
	err := orch.HandlePaymentFailure(context.Background(), "pay-id", "declined")

	if !errors.Is(err, domain.ErrNotFound) {
		t.Errorf("expected ErrNotFound when booking not found, got %v", err)
	}
}

func TestSagaOrchestrator_HandlePaymentFailure_RestoreInventoryError(t *testing.T) {
	payRepo := makePaymentRepo(mockPaymentRepo{})
	bookingRepo := makeSagaBookingRepo(mockSagaBookingRepo{})
	outboxRepo := makeOutboxRepo(mockOutboxRepo{})
	inventoryRestorer := makeMockInventoryRestorer(mockInventoryRestorer{
		restoreInventoryFn: func(ctx context.Context, roomID int, startDate, endDate time.Time) error {
			return domain.ErrInternal
		},
	})

	orch := service.NewSagaOrchestrator(bookingRepo, payRepo, outboxRepo, inventoryRestorer)
	err := orch.HandlePaymentFailure(context.Background(), "pay-id", "declined")

	if err == nil {
		t.Error("expected error when restore inventory fails")
	}
}

func TestSagaOrchestrator_HandlePaymentTimeout_PaymentNotFound(t *testing.T) {
	payRepo := makePaymentRepo(mockPaymentRepo{
		getPaymentByIDFn: func(ctx context.Context, id string) (*domain.Payment, error) {
			return nil, domain.ErrNotFound
		},
	})
	bookingRepo := makeSagaBookingRepo(mockSagaBookingRepo{})
	outboxRepo := makeOutboxRepo(mockOutboxRepo{})
	inventoryRestorer := makeMockInventoryRestorer(mockInventoryRestorer{})

	orch := service.NewSagaOrchestrator(bookingRepo, payRepo, outboxRepo, inventoryRestorer)
	err := orch.HandlePaymentTimeout(context.Background(), "bad-id")

	if !errors.Is(err, domain.ErrNotFound) {
		t.Errorf("expected ErrNotFound, got %v", err)
	}
}

func TestSagaOrchestrator_HandlePaymentTimeout_UpdateStatusError(t *testing.T) {
	payRepo := makePaymentRepo(mockPaymentRepo{
		updatePaymentStatusFn: func(ctx context.Context, id string, status domain.PaymentStatus, ref, reason string) error {
			return domain.ErrInternal
		},
	})
	bookingRepo := makeSagaBookingRepo(mockSagaBookingRepo{})
	outboxRepo := makeOutboxRepo(mockOutboxRepo{})
	inventoryRestorer := makeMockInventoryRestorer(mockInventoryRestorer{})

	orch := service.NewSagaOrchestrator(bookingRepo, payRepo, outboxRepo, inventoryRestorer)
	err := orch.HandlePaymentTimeout(context.Background(), "pay-id")

	if err == nil {
		t.Error("expected error when update payment status fails")
	}
}

func TestSagaOrchestrator_HandlePaymentTimeout_BookingNotFound(t *testing.T) {
	payRepo := makePaymentRepo(mockPaymentRepo{})
	bookingRepo := makeSagaBookingRepo(mockSagaBookingRepo{
		findBookingByIDFn: func(ctx context.Context, id int) (*domain.Booking, error) {
			return nil, domain.ErrNotFound
		},
	})
	outboxRepo := makeOutboxRepo(mockOutboxRepo{})
	inventoryRestorer := makeMockInventoryRestorer(mockInventoryRestorer{})

	orch := service.NewSagaOrchestrator(bookingRepo, payRepo, outboxRepo, inventoryRestorer)
	err := orch.HandlePaymentTimeout(context.Background(), "pay-id")

	if !errors.Is(err, domain.ErrNotFound) {
		t.Errorf("expected ErrNotFound when booking not found, got %v", err)
	}
}

func TestSagaOrchestrator_HandlePaymentTimeout_RestoreInventoryError(t *testing.T) {
	payRepo := makePaymentRepo(mockPaymentRepo{})
	bookingRepo := makeSagaBookingRepo(mockSagaBookingRepo{})
	outboxRepo := makeOutboxRepo(mockOutboxRepo{})
	inventoryRestorer := makeMockInventoryRestorer(mockInventoryRestorer{
		restoreInventoryFn: func(ctx context.Context, roomID int, startDate, endDate time.Time) error {
			return domain.ErrInternal
		},
	})

	orch := service.NewSagaOrchestrator(bookingRepo, payRepo, outboxRepo, inventoryRestorer)
	err := orch.HandlePaymentTimeout(context.Background(), "pay-id")

	if err == nil {
		t.Error("expected error when restore inventory fails on timeout")
	}
}

// --- Mock NotificationSender ---

type mockNotificationSender struct {
	notifyFn func(ctx context.Context, userID string, notifType domain.NotificationType, title, message string, data map[string]any) error
}

func (m *mockNotificationSender) Notify(ctx context.Context, userID string, notifType domain.NotificationType, title, message string, data map[string]any) error {
	return m.notifyFn(ctx, userID, notifType, title, message, data)
}

func makeMockNotificationSender(overrides mockNotificationSender) *mockNotificationSender {
	defaults := &mockNotificationSender{
		notifyFn: func(ctx context.Context, userID string, notifType domain.NotificationType, title, message string, data map[string]any) error {
			return nil
		},
	}
	if overrides.notifyFn != nil {
		defaults.notifyFn = overrides.notifyFn
	}
	return defaults
}

// --- Tests: SagaOrchestrator NotificationSender integration ---

func TestSagaOrchestrator_HandlePaymentSuccess_NotificationSent(t *testing.T) {
	var capturedUserID string
	var capturedType domain.NotificationType

	payRepo := makePaymentRepo(mockPaymentRepo{
		getPaymentByIDFn: func(ctx context.Context, id string) (*domain.Payment, error) {
			return &domain.Payment{ID: id, BookingID: 5, Status: domain.PaymentStatusProcessing}, nil
		},
	})
	bookingRepo := makeSagaBookingRepo(mockSagaBookingRepo{
		findBookingByIDFn: func(ctx context.Context, id int) (*domain.Booking, error) {
			return &domain.Booking{ID: id, UserID: "user-42", RoomID: 10,
				StartDate: time.Now(), EndDate: time.Now().Add(48 * time.Hour)}, nil
		},
	})
	notifier := makeMockNotificationSender(mockNotificationSender{
		notifyFn: func(ctx context.Context, userID string, notifType domain.NotificationType, title, message string, data map[string]any) error {
			capturedUserID = userID
			capturedType = notifType
			return nil
		},
	})

	orch := service.NewSagaOrchestrator(
		bookingRepo, payRepo, makeOutboxRepo(mockOutboxRepo{}), makeMockInventoryRestorer(mockInventoryRestorer{}),
		service.WithNotificationSender(notifier),
	)

	if err := orch.HandlePaymentSuccess(context.Background(), "pay-id"); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if capturedUserID != "user-42" {
		t.Errorf("expected notification for user-42, got %q", capturedUserID)
	}
	if capturedType != domain.NotificationTypeBookingConfirmed {
		t.Errorf("expected type %q, got %q", domain.NotificationTypeBookingConfirmed, capturedType)
	}
}

func TestSagaOrchestrator_HandlePaymentFailure_NotificationSent(t *testing.T) {
	var capturedType domain.NotificationType

	payRepo := makePaymentRepo(mockPaymentRepo{
		getPaymentByIDFn: func(ctx context.Context, id string) (*domain.Payment, error) {
			return &domain.Payment{ID: id, BookingID: 5, Status: domain.PaymentStatusProcessing}, nil
		},
	})
	bookingRepo := makeSagaBookingRepo(mockSagaBookingRepo{
		findBookingByIDFn: func(ctx context.Context, id int) (*domain.Booking, error) {
			return &domain.Booking{ID: id, UserID: "user-42", RoomID: 10,
				StartDate: time.Now(), EndDate: time.Now().Add(48 * time.Hour)}, nil
		},
	})
	notifier := makeMockNotificationSender(mockNotificationSender{
		notifyFn: func(ctx context.Context, userID string, notifType domain.NotificationType, title, message string, data map[string]any) error {
			capturedType = notifType
			return nil
		},
	})

	orch := service.NewSagaOrchestrator(
		bookingRepo, payRepo, makeOutboxRepo(mockOutboxRepo{}), makeMockInventoryRestorer(mockInventoryRestorer{}),
		service.WithNotificationSender(notifier),
	)

	if err := orch.HandlePaymentFailure(context.Background(), "pay-id", "card declined"); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if capturedType != domain.NotificationTypePaymentFailed {
		t.Errorf("expected type %q, got %q", domain.NotificationTypePaymentFailed, capturedType)
	}
}

func TestSagaOrchestrator_HandlePaymentTimeout_NotificationSent(t *testing.T) {
	var capturedType domain.NotificationType

	payRepo := makePaymentRepo(mockPaymentRepo{
		getPaymentByIDFn: func(ctx context.Context, id string) (*domain.Payment, error) {
			return &domain.Payment{ID: id, BookingID: 5, Status: domain.PaymentStatusProcessing}, nil
		},
	})
	bookingRepo := makeSagaBookingRepo(mockSagaBookingRepo{
		findBookingByIDFn: func(ctx context.Context, id int) (*domain.Booking, error) {
			return &domain.Booking{ID: id, UserID: "user-42", RoomID: 10,
				StartDate: time.Now(), EndDate: time.Now().Add(48 * time.Hour)}, nil
		},
	})
	notifier := makeMockNotificationSender(mockNotificationSender{
		notifyFn: func(ctx context.Context, userID string, notifType domain.NotificationType, title, message string, data map[string]any) error {
			capturedType = notifType
			return nil
		},
	})

	orch := service.NewSagaOrchestrator(
		bookingRepo, payRepo, makeOutboxRepo(mockOutboxRepo{}), makeMockInventoryRestorer(mockInventoryRestorer{}),
		service.WithNotificationSender(notifier),
	)

	if err := orch.HandlePaymentTimeout(context.Background(), "pay-id"); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if capturedType != domain.NotificationTypePaymentTimedOut {
		t.Errorf("expected type %q, got %q", domain.NotificationTypePaymentTimedOut, capturedType)
	}
}

func TestSagaOrchestrator_HandlePaymentSuccess_NotificationFailure_NonFatal(t *testing.T) {
	// Notification errors must not abort the saga transition.
	payRepo := makePaymentRepo(mockPaymentRepo{
		getPaymentByIDFn: func(ctx context.Context, id string) (*domain.Payment, error) {
			return &domain.Payment{ID: id, BookingID: 5, Status: domain.PaymentStatusProcessing}, nil
		},
	})
	bookingRepo := makeSagaBookingRepo(mockSagaBookingRepo{
		findBookingByIDFn: func(ctx context.Context, id int) (*domain.Booking, error) {
			return &domain.Booking{ID: id, UserID: "user-42", RoomID: 10,
				StartDate: time.Now(), EndDate: time.Now().Add(48 * time.Hour)}, nil
		},
	})
	notifier := makeMockNotificationSender(mockNotificationSender{
		notifyFn: func(ctx context.Context, userID string, notifType domain.NotificationType, title, message string, data map[string]any) error {
			return domain.ErrInternal // notification fails
		},
	})

	orch := service.NewSagaOrchestrator(
		bookingRepo, payRepo, makeOutboxRepo(mockOutboxRepo{}), makeMockInventoryRestorer(mockInventoryRestorer{}),
		service.WithNotificationSender(notifier),
	)

	// Must succeed even though notification failed.
	if err := orch.HandlePaymentSuccess(context.Background(), "pay-id"); err != nil {
		t.Errorf("saga must succeed even when notification fails; got: %v", err)
	}
}

func TestSagaOrchestrator_WithoutNotifier_HandlePaymentSuccess_StillWorks(t *testing.T) {
	// No notifier set — existing behaviour preserved.
	payRepo := makePaymentRepo(mockPaymentRepo{
		getPaymentByIDFn: func(ctx context.Context, id string) (*domain.Payment, error) {
			return &domain.Payment{ID: id, BookingID: 5, Status: domain.PaymentStatusProcessing}, nil
		},
	})
	bookingRepo := makeSagaBookingRepo(mockSagaBookingRepo{
		findBookingByIDFn: func(ctx context.Context, id int) (*domain.Booking, error) {
			return &domain.Booking{ID: id, UserID: "user-42", RoomID: 10,
				StartDate: time.Now(), EndDate: time.Now().Add(48 * time.Hour)}, nil
		},
	})

	orch := service.NewSagaOrchestrator(
		bookingRepo, payRepo, makeOutboxRepo(mockOutboxRepo{}), makeMockInventoryRestorer(mockInventoryRestorer{}),
	)

	if err := orch.HandlePaymentSuccess(context.Background(), "pay-id"); err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
}

func TestSagaOrchestrator_StartCheckout_CreatePaymentError(t *testing.T) {
	bookingRepo := makeSagaBookingRepo(mockSagaBookingRepo{})
	payRepo := makePaymentRepo(mockPaymentRepo{
		createPaymentFn: func(ctx context.Context, p *domain.Payment) (*domain.Payment, error) {
			return nil, domain.ErrInternal
		},
	})
	outboxRepo := makeOutboxRepo(mockOutboxRepo{})
	inventoryRestorer := makeMockInventoryRestorer(mockInventoryRestorer{})

	orch := service.NewSagaOrchestrator(bookingRepo, payRepo, outboxRepo, inventoryRestorer)
	_, err := orch.StartCheckout(context.Background(), 1, "user-1")

	if err == nil {
		t.Error("expected error when create payment fails")
	}
}

func TestSagaOrchestrator_HandlePaymentSuccess_UpdateStatusError(t *testing.T) {
	payRepo := makePaymentRepo(mockPaymentRepo{
		updatePaymentStatusFn: func(ctx context.Context, id string, status domain.PaymentStatus, ref, reason string) error {
			return domain.ErrInternal
		},
	})
	bookingRepo := makeSagaBookingRepo(mockSagaBookingRepo{})
	outboxRepo := makeOutboxRepo(mockOutboxRepo{})
	inventoryRestorer := makeMockInventoryRestorer(mockInventoryRestorer{})

	orch := service.NewSagaOrchestrator(bookingRepo, payRepo, outboxRepo, inventoryRestorer)
	err := orch.HandlePaymentSuccess(context.Background(), "pay-id")

	if err == nil {
		t.Error("expected error when update payment status fails")
	}
}
