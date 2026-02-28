package service_test

import (
	"booking-app/internal/domain"
	"booking-app/internal/service"
	"context"
	"errors"
	"testing"
	"time"
)

// --- Mock NotificationRepository ---

type mockNotificationRepo struct {
	createFn        func(ctx context.Context, n *domain.Notification) (*domain.Notification, error)
	listByUserFn    func(ctx context.Context, userID string, page, limit int) ([]*domain.Notification, int, error)
	getUnreadCountFn func(ctx context.Context, userID string) (int, error)
	markReadFn      func(ctx context.Context, id int64, userID string) error
	markAllReadFn   func(ctx context.Context, userID string) error
}

func (m *mockNotificationRepo) Create(ctx context.Context, n *domain.Notification) (*domain.Notification, error) {
	return m.createFn(ctx, n)
}

func (m *mockNotificationRepo) ListByUser(ctx context.Context, userID string, page, limit int) ([]*domain.Notification, int, error) {
	return m.listByUserFn(ctx, userID, page, limit)
}

func (m *mockNotificationRepo) GetUnreadCount(ctx context.Context, userID string) (int, error) {
	return m.getUnreadCountFn(ctx, userID)
}

func (m *mockNotificationRepo) MarkRead(ctx context.Context, id int64, userID string) error {
	return m.markReadFn(ctx, id, userID)
}

func (m *mockNotificationRepo) MarkAllRead(ctx context.Context, userID string) error {
	return m.markAllReadFn(ctx, userID)
}

// makeMockNotificationRepo builds a mock with sensible defaults, overridden by the provided struct.
func makeMockNotificationRepo(overrides mockNotificationRepo) *mockNotificationRepo {
	defaults := mockNotificationRepo{
		createFn: func(_ context.Context, n *domain.Notification) (*domain.Notification, error) {
			result := *n
			result.ID = 1
			result.CreatedAt = time.Now()
			return &result, nil
		},
		listByUserFn: func(_ context.Context, _ string, _, _ int) ([]*domain.Notification, int, error) {
			return []*domain.Notification{}, 0, nil
		},
		getUnreadCountFn: func(_ context.Context, _ string) (int, error) {
			return 0, nil
		},
		markReadFn: func(_ context.Context, _ int64, _ string) error {
			return nil
		},
		markAllReadFn: func(_ context.Context, _ string) error {
			return nil
		},
	}
	if overrides.createFn != nil {
		defaults.createFn = overrides.createFn
	}
	if overrides.listByUserFn != nil {
		defaults.listByUserFn = overrides.listByUserFn
	}
	if overrides.getUnreadCountFn != nil {
		defaults.getUnreadCountFn = overrides.getUnreadCountFn
	}
	if overrides.markReadFn != nil {
		defaults.markReadFn = overrides.markReadFn
	}
	if overrides.markAllReadFn != nil {
		defaults.markAllReadFn = overrides.markAllReadFn
	}
	return &defaults
}

// --- Tests: CreateNotification ---

func TestNotificationService_CreateNotification_Success(t *testing.T) {
	repo := makeMockNotificationRepo(mockNotificationRepo{})
	svc := service.NewNotificationService(repo)

	notif, err := svc.CreateNotification(
		context.Background(),
		"user-1",
		domain.NotificationTypeBookingConfirmed,
		"Booking Confirmed",
		"Your booking #42 has been confirmed.",
		map[string]any{"booking_id": 42},
	)

	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if notif.ID == 0 {
		t.Error("expected non-zero ID after creation")
	}
	if notif.UserID != "user-1" {
		t.Errorf("expected userID %q, got %q", "user-1", notif.UserID)
	}
	if notif.Type != domain.NotificationTypeBookingConfirmed {
		t.Errorf("expected type %q, got %q", domain.NotificationTypeBookingConfirmed, notif.Type)
	}
	if notif.Title != "Booking Confirmed" {
		t.Errorf("expected title %q, got %q", "Booking Confirmed", notif.Title)
	}
}

func TestNotificationService_CreateNotification_EmptyTitle_ReturnsError(t *testing.T) {
	repo := makeMockNotificationRepo(mockNotificationRepo{})
	svc := service.NewNotificationService(repo)

	_, err := svc.CreateNotification(
		context.Background(),
		"user-1",
		domain.NotificationTypeBookingConfirmed,
		"",
		"Some message",
		nil,
	)

	if !errors.Is(err, domain.ErrBadRequest) {
		t.Errorf("expected ErrBadRequest for empty title, got %v", err)
	}
}

func TestNotificationService_CreateNotification_EmptyMessage_ReturnsError(t *testing.T) {
	repo := makeMockNotificationRepo(mockNotificationRepo{})
	svc := service.NewNotificationService(repo)

	_, err := svc.CreateNotification(
		context.Background(),
		"user-1",
		domain.NotificationTypeBookingConfirmed,
		"Title",
		"",
		nil,
	)

	if !errors.Is(err, domain.ErrBadRequest) {
		t.Errorf("expected ErrBadRequest for empty message, got %v", err)
	}
}

func TestNotificationService_CreateNotification_InvalidType_ReturnsError(t *testing.T) {
	repo := makeMockNotificationRepo(mockNotificationRepo{})
	svc := service.NewNotificationService(repo)

	_, err := svc.CreateNotification(
		context.Background(),
		"user-1",
		domain.NotificationType("unknown_type"),
		"Title",
		"Message",
		nil,
	)

	if !errors.Is(err, domain.ErrBadRequest) {
		t.Errorf("expected ErrBadRequest for invalid type, got %v", err)
	}
}

func TestNotificationService_CreateNotification_RepoError_Propagates(t *testing.T) {
	repoErr := errors.New("db connection failed")
	repo := makeMockNotificationRepo(mockNotificationRepo{
		createFn: func(_ context.Context, _ *domain.Notification) (*domain.Notification, error) {
			return nil, repoErr
		},
	})
	svc := service.NewNotificationService(repo)

	_, err := svc.CreateNotification(
		context.Background(),
		"user-1",
		domain.NotificationTypeBookingConfirmed,
		"Title",
		"Message",
		nil,
	)

	if err == nil {
		t.Fatal("expected error from repo, got nil")
	}
}

func TestNotificationService_CreateNotification_NilData_IsAllowed(t *testing.T) {
	repo := makeMockNotificationRepo(mockNotificationRepo{})
	svc := service.NewNotificationService(repo)

	notif, err := svc.CreateNotification(
		context.Background(),
		"user-2",
		domain.NotificationTypePaymentSucceeded,
		"Payment OK",
		"Your payment was processed.",
		nil,
	)

	if err != nil {
		t.Fatalf("expected no error with nil data, got %v", err)
	}
	if notif.Data != nil {
		t.Errorf("expected nil data, got %v", notif.Data)
	}
}

// --- Tests: ListNotifications ---

func TestNotificationService_ListNotifications_Success(t *testing.T) {
	notifications := []*domain.Notification{
		{ID: 1, UserID: "user-1", Type: domain.NotificationTypeBookingConfirmed, Title: "t1", Message: "m1"},
		{ID: 2, UserID: "user-1", Type: domain.NotificationTypePaymentSucceeded, Title: "t2", Message: "m2"},
	}
	repo := makeMockNotificationRepo(mockNotificationRepo{
		listByUserFn: func(_ context.Context, _ string, _, _ int) ([]*domain.Notification, int, error) {
			return notifications, 2, nil
		},
	})
	svc := service.NewNotificationService(repo)

	result, total, err := svc.ListNotifications(context.Background(), "user-1", 1, 20)

	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if len(result) != 2 {
		t.Errorf("expected 2 notifications, got %d", len(result))
	}
	if total != 2 {
		t.Errorf("expected total 2, got %d", total)
	}
}

func TestNotificationService_ListNotifications_DefaultPagination(t *testing.T) {
	capturedPage, capturedLimit := 0, 0
	repo := makeMockNotificationRepo(mockNotificationRepo{
		listByUserFn: func(_ context.Context, _ string, page, limit int) ([]*domain.Notification, int, error) {
			capturedPage = page
			capturedLimit = limit
			return []*domain.Notification{}, 0, nil
		},
	})
	svc := service.NewNotificationService(repo)

	svc.ListNotifications(context.Background(), "user-1", 0, 0)

	if capturedPage != 1 {
		t.Errorf("expected default page 1, got %d", capturedPage)
	}
	if capturedLimit != 20 {
		t.Errorf("expected default limit 20, got %d", capturedLimit)
	}
}

func TestNotificationService_ListNotifications_RepoError_Propagates(t *testing.T) {
	repoErr := errors.New("db error")
	repo := makeMockNotificationRepo(mockNotificationRepo{
		listByUserFn: func(_ context.Context, _ string, _, _ int) ([]*domain.Notification, int, error) {
			return nil, 0, repoErr
		},
	})
	svc := service.NewNotificationService(repo)

	_, _, err := svc.ListNotifications(context.Background(), "user-1", 1, 20)

	if err == nil {
		t.Fatal("expected error from repo, got nil")
	}
}

// --- Tests: GetUnreadCount ---

func TestNotificationService_GetUnreadCount_Success(t *testing.T) {
	repo := makeMockNotificationRepo(mockNotificationRepo{
		getUnreadCountFn: func(_ context.Context, _ string) (int, error) {
			return 5, nil
		},
	})
	svc := service.NewNotificationService(repo)

	count, err := svc.GetUnreadCount(context.Background(), "user-1")

	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if count != 5 {
		t.Errorf("expected count 5, got %d", count)
	}
}

func TestNotificationService_GetUnreadCount_RepoError_Propagates(t *testing.T) {
	repo := makeMockNotificationRepo(mockNotificationRepo{
		getUnreadCountFn: func(_ context.Context, _ string) (int, error) {
			return 0, errors.New("db error")
		},
	})
	svc := service.NewNotificationService(repo)

	_, err := svc.GetUnreadCount(context.Background(), "user-1")

	if err == nil {
		t.Fatal("expected error from repo, got nil")
	}
}

// --- Tests: MarkRead ---

func TestNotificationService_MarkRead_Success(t *testing.T) {
	repo := makeMockNotificationRepo(mockNotificationRepo{})
	svc := service.NewNotificationService(repo)

	err := svc.MarkRead(context.Background(), 1, "user-1")

	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
}

func TestNotificationService_MarkRead_InvalidID_ReturnsError(t *testing.T) {
	repo := makeMockNotificationRepo(mockNotificationRepo{})
	svc := service.NewNotificationService(repo)

	err := svc.MarkRead(context.Background(), 0, "user-1")

	if !errors.Is(err, domain.ErrBadRequest) {
		t.Errorf("expected ErrBadRequest for id=0, got %v", err)
	}
}

func TestNotificationService_MarkRead_NegativeID_ReturnsError(t *testing.T) {
	repo := makeMockNotificationRepo(mockNotificationRepo{})
	svc := service.NewNotificationService(repo)

	err := svc.MarkRead(context.Background(), -5, "user-1")

	if !errors.Is(err, domain.ErrBadRequest) {
		t.Errorf("expected ErrBadRequest for negative id, got %v", err)
	}
}

func TestNotificationService_MarkRead_NotFound_Propagates(t *testing.T) {
	repo := makeMockNotificationRepo(mockNotificationRepo{
		markReadFn: func(_ context.Context, _ int64, _ string) error {
			return domain.ErrNotFound
		},
	})
	svc := service.NewNotificationService(repo)

	err := svc.MarkRead(context.Background(), 999, "user-1")

	if !errors.Is(err, domain.ErrNotFound) {
		t.Errorf("expected ErrNotFound, got %v", err)
	}
}

// --- Tests: MarkAllRead ---

func TestNotificationService_MarkAllRead_Success(t *testing.T) {
	repo := makeMockNotificationRepo(mockNotificationRepo{})
	svc := service.NewNotificationService(repo)

	err := svc.MarkAllRead(context.Background(), "user-1")

	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
}

func TestNotificationService_MarkAllRead_RepoError_Propagates(t *testing.T) {
	repo := makeMockNotificationRepo(mockNotificationRepo{
		markAllReadFn: func(_ context.Context, _ string) error {
			return errors.New("db error")
		},
	})
	svc := service.NewNotificationService(repo)

	err := svc.MarkAllRead(context.Background(), "user-1")

	if err == nil {
		t.Fatal("expected error from repo, got nil")
	}
}
