package service_test

import (
	"booking-app/internal/domain"
	"booking-app/internal/service"
	"context"
	"errors"
	"testing"
	"time"
)

// --- Mock UserRepository (admin extension) ---

type mockAdminUserRepo struct {
	createUserFn    func(ctx context.Context, user *domain.User) error
	findByEmailFn   func(ctx context.Context, email string) (*domain.User, error)
	findByIDFn      func(ctx context.Context, id string) (*domain.User, error)
	listUsersFn     func(ctx context.Context, page, limit int) ([]*domain.User, int, error)
	updateRoleFn    func(ctx context.Context, id string, role domain.Role) error
	deactivateFn    func(ctx context.Context, id string) error
}

func (m *mockAdminUserRepo) CreateUser(ctx context.Context, user *domain.User) error {
	if m.createUserFn != nil {
		return m.createUserFn(ctx, user)
	}
	return nil
}

func (m *mockAdminUserRepo) FindUserByEmail(ctx context.Context, email string) (*domain.User, error) {
	if m.findByEmailFn != nil {
		return m.findByEmailFn(ctx, email)
	}
	return &domain.User{}, nil
}

func (m *mockAdminUserRepo) FindUserByID(ctx context.Context, id string) (*domain.User, error) {
	if m.findByIDFn != nil {
		return m.findByIDFn(ctx, id)
	}
	return &domain.User{ID: id, Email: "test@example.com", Role: domain.RoleGuest, IsActive: true}, nil
}

func (m *mockAdminUserRepo) ListUsers(ctx context.Context, page, limit int) ([]*domain.User, int, error) {
	if m.listUsersFn != nil {
		return m.listUsersFn(ctx, page, limit)
	}
	return []*domain.User{}, 0, nil
}

func (m *mockAdminUserRepo) UpdateUserRole(ctx context.Context, id string, role domain.Role) error {
	if m.updateRoleFn != nil {
		return m.updateRoleFn(ctx, id, role)
	}
	return nil
}

func (m *mockAdminUserRepo) DeactivateUser(ctx context.Context, id string) error {
	if m.deactivateFn != nil {
		return m.deactivateFn(ctx, id)
	}
	return nil
}

// --- Mock BookingRepository (admin extension) ---

type mockAdminBookingRepo struct {
	createBookingFn        func(ctx context.Context, booking *domain.Booking) error
	initInventoryFn        func(ctx context.Context, roomID int, startDate time.Time, days, total int) error
	findBookingByIDFn      func(ctx context.Context, id int) (*domain.Booking, error)
	listBookingsByUserFn   func(ctx context.Context, userID string, page, limit int) ([]*domain.Booking, int, error)
	updateBookingStatusFn  func(ctx context.Context, id int, status string) error
	cancelBookingFn        func(ctx context.Context, id int, userID string) error
	listAllBookingsFn      func(ctx context.Context, page, limit int) ([]*domain.Booking, int, error)
}

func (m *mockAdminBookingRepo) CreateBooking(ctx context.Context, booking *domain.Booking) error {
	if m.createBookingFn != nil {
		return m.createBookingFn(ctx, booking)
	}
	return nil
}

func (m *mockAdminBookingRepo) InitializeInventory(ctx context.Context, roomID int, startDate time.Time, days, total int) error {
	if m.initInventoryFn != nil {
		return m.initInventoryFn(ctx, roomID, startDate, days, total)
	}
	return nil
}

func (m *mockAdminBookingRepo) FindBookingByID(ctx context.Context, id int) (*domain.Booking, error) {
	if m.findBookingByIDFn != nil {
		return m.findBookingByIDFn(ctx, id)
	}
	return &domain.Booking{ID: id}, nil
}

func (m *mockAdminBookingRepo) ListBookingsByUser(ctx context.Context, userID string, page, limit int) ([]*domain.Booking, int, error) {
	if m.listBookingsByUserFn != nil {
		return m.listBookingsByUserFn(ctx, userID, page, limit)
	}
	return []*domain.Booking{}, 0, nil
}

func (m *mockAdminBookingRepo) UpdateBookingStatus(ctx context.Context, id int, status string) error {
	if m.updateBookingStatusFn != nil {
		return m.updateBookingStatusFn(ctx, id, status)
	}
	return nil
}

func (m *mockAdminBookingRepo) CancelBooking(ctx context.Context, id int, userID string) error {
	if m.cancelBookingFn != nil {
		return m.cancelBookingFn(ctx, id, userID)
	}
	return nil
}

func (m *mockAdminBookingRepo) ListAllBookings(ctx context.Context, page, limit int) ([]*domain.Booking, int, error) {
	if m.listAllBookingsFn != nil {
		return m.listAllBookingsFn(ctx, page, limit)
	}
	return []*domain.Booking{}, 0, nil
}

// --- Mock OutboxRepository (admin extension) ---

type mockAdminOutboxRepo struct {
	createEventFn          func(ctx context.Context, event *domain.OutboxEvent) error
	listUnpublishedFn      func(ctx context.Context, limit int) ([]*domain.OutboxEvent, error)
	markPublishedFn        func(ctx context.Context, id string, publishedAt time.Time) error
	incrementRetryFn       func(ctx context.Context, id string) error
	isEventProcessedFn     func(ctx context.Context, eventID string) (bool, error)
	markProcessedFn        func(ctx context.Context, eventID string) error
	listDLQEventsFn        func(ctx context.Context, maxRetries, page, limit int) ([]*domain.OutboxEvent, int, error)
	resetDLQEventFn        func(ctx context.Context, id string) error
}

func (m *mockAdminOutboxRepo) CreateEvent(ctx context.Context, event *domain.OutboxEvent) error {
	if m.createEventFn != nil {
		return m.createEventFn(ctx, event)
	}
	return nil
}

func (m *mockAdminOutboxRepo) ListUnpublishedEvents(ctx context.Context, limit int) ([]*domain.OutboxEvent, error) {
	if m.listUnpublishedFn != nil {
		return m.listUnpublishedFn(ctx, limit)
	}
	return []*domain.OutboxEvent{}, nil
}

func (m *mockAdminOutboxRepo) MarkPublished(ctx context.Context, id string, publishedAt time.Time) error {
	if m.markPublishedFn != nil {
		return m.markPublishedFn(ctx, id, publishedAt)
	}
	return nil
}

func (m *mockAdminOutboxRepo) IncrementRetry(ctx context.Context, id string) error {
	if m.incrementRetryFn != nil {
		return m.incrementRetryFn(ctx, id)
	}
	return nil
}

func (m *mockAdminOutboxRepo) IsEventProcessed(ctx context.Context, eventID string) (bool, error) {
	if m.isEventProcessedFn != nil {
		return m.isEventProcessedFn(ctx, eventID)
	}
	return false, nil
}

func (m *mockAdminOutboxRepo) MarkProcessed(ctx context.Context, eventID string) error {
	if m.markProcessedFn != nil {
		return m.markProcessedFn(ctx, eventID)
	}
	return nil
}

func (m *mockAdminOutboxRepo) ListDLQEvents(ctx context.Context, maxRetries, page, limit int) ([]*domain.OutboxEvent, int, error) {
	if m.listDLQEventsFn != nil {
		return m.listDLQEventsFn(ctx, maxRetries, page, limit)
	}
	return []*domain.OutboxEvent{}, 0, nil
}

func (m *mockAdminOutboxRepo) ResetDLQEvent(ctx context.Context, id string) error {
	if m.resetDLQEventFn != nil {
		return m.resetDLQEventFn(ctx, id)
	}
	return nil
}

// --- Helpers ---

func makeAdminSvc(userRepo *mockAdminUserRepo, bookingRepo *mockAdminBookingRepo, outboxRepo *mockAdminOutboxRepo) service.AdminServiceInterface {
	return service.NewAdminService(userRepo, bookingRepo, outboxRepo)
}

func defaultAdminUserRepo() *mockAdminUserRepo {
	return &mockAdminUserRepo{}
}

func defaultAdminBookingRepo() *mockAdminBookingRepo {
	return &mockAdminBookingRepo{}
}

func defaultAdminOutboxRepo() *mockAdminOutboxRepo {
	return &mockAdminOutboxRepo{}
}

// --- Tests: ListUsers ---

func TestAdminService_ListUsers_ReturnsUsers(t *testing.T) {
	users := []*domain.User{
		{ID: "user-1", Email: "a@example.com", Role: domain.RoleGuest},
		{ID: "user-2", Email: "b@example.com", Role: domain.RoleOwner},
	}
	userRepo := &mockAdminUserRepo{
		listUsersFn: func(ctx context.Context, page, limit int) ([]*domain.User, int, error) {
			return users, 2, nil
		},
	}
	svc := makeAdminSvc(userRepo, defaultAdminBookingRepo(), defaultAdminOutboxRepo())

	result, total, err := svc.ListUsers(context.Background(), 1, 20)

	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if len(result) != 2 {
		t.Errorf("expected 2 users, got %d", len(result))
	}
	if total != 2 {
		t.Errorf("expected total 2, got %d", total)
	}
}

func TestAdminService_ListUsers_RepoError(t *testing.T) {
	userRepo := &mockAdminUserRepo{
		listUsersFn: func(ctx context.Context, page, limit int) ([]*domain.User, int, error) {
			return nil, 0, domain.ErrInternal
		},
	}
	svc := makeAdminSvc(userRepo, defaultAdminBookingRepo(), defaultAdminOutboxRepo())

	_, _, err := svc.ListUsers(context.Background(), 1, 20)

	if err == nil {
		t.Error("expected error, got nil")
	}
}

func TestAdminService_ListUsers_NormalizesPagination(t *testing.T) {
	capturedPage, capturedLimit := 0, 0
	userRepo := &mockAdminUserRepo{
		listUsersFn: func(ctx context.Context, page, limit int) ([]*domain.User, int, error) {
			capturedPage = page
			capturedLimit = limit
			return []*domain.User{}, 0, nil
		},
	}
	svc := makeAdminSvc(userRepo, defaultAdminBookingRepo(), defaultAdminOutboxRepo())

	svc.ListUsers(context.Background(), 0, 0)

	if capturedPage != 1 {
		t.Errorf("expected normalized page 1, got %d", capturedPage)
	}
	if capturedLimit != 20 {
		t.Errorf("expected normalized limit 20, got %d", capturedLimit)
	}
}

// --- Tests: GetUser ---

func TestAdminService_GetUser_ReturnsUser(t *testing.T) {
	expected := &domain.User{ID: "user-1", Email: "user@example.com", Role: domain.RoleGuest}
	userRepo := &mockAdminUserRepo{
		findByIDFn: func(ctx context.Context, id string) (*domain.User, error) {
			return expected, nil
		},
	}
	svc := makeAdminSvc(userRepo, defaultAdminBookingRepo(), defaultAdminOutboxRepo())

	result, err := svc.GetUser(context.Background(), "user-1")

	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if result.ID != "user-1" {
		t.Errorf("expected user ID user-1, got %s", result.ID)
	}
}

func TestAdminService_GetUser_NotFound(t *testing.T) {
	userRepo := &mockAdminUserRepo{
		findByIDFn: func(ctx context.Context, id string) (*domain.User, error) {
			return nil, domain.ErrNotFound
		},
	}
	svc := makeAdminSvc(userRepo, defaultAdminBookingRepo(), defaultAdminOutboxRepo())

	_, err := svc.GetUser(context.Background(), "nonexistent")

	if !errors.Is(err, domain.ErrNotFound) {
		t.Errorf("expected ErrNotFound, got %v", err)
	}
}

// --- Tests: UpdateUserRole ---

func TestAdminService_UpdateUserRole_Success(t *testing.T) {
	var calledWithRole domain.Role
	userRepo := &mockAdminUserRepo{
		updateRoleFn: func(ctx context.Context, id string, role domain.Role) error {
			calledWithRole = role
			return nil
		},
	}
	svc := makeAdminSvc(userRepo, defaultAdminBookingRepo(), defaultAdminOutboxRepo())

	err := svc.UpdateUserRole(context.Background(), "user-1", domain.RoleOwner)

	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if calledWithRole != domain.RoleOwner {
		t.Errorf("expected role owner, got %s", calledWithRole)
	}
}

func TestAdminService_UpdateUserRole_InvalidRole(t *testing.T) {
	svc := makeAdminSvc(defaultAdminUserRepo(), defaultAdminBookingRepo(), defaultAdminOutboxRepo())

	err := svc.UpdateUserRole(context.Background(), "user-1", domain.Role("superuser"))

	if !errors.Is(err, domain.ErrBadRequest) {
		t.Errorf("expected ErrBadRequest for invalid role, got %v", err)
	}
}

func TestAdminService_UpdateUserRole_ValidRoles(t *testing.T) {
	validRoles := []domain.Role{domain.RoleGuest, domain.RoleOwner, domain.RoleAdmin}
	for _, role := range validRoles {
		userRepo := &mockAdminUserRepo{
			updateRoleFn: func(ctx context.Context, id string, r domain.Role) error {
				return nil
			},
		}
		svc := makeAdminSvc(userRepo, defaultAdminBookingRepo(), defaultAdminOutboxRepo())

		err := svc.UpdateUserRole(context.Background(), "user-1", role)

		if err != nil {
			t.Errorf("expected no error for valid role %s, got %v", role, err)
		}
	}
}

func TestAdminService_UpdateUserRole_RepoError(t *testing.T) {
	userRepo := &mockAdminUserRepo{
		updateRoleFn: func(ctx context.Context, id string, role domain.Role) error {
			return domain.ErrInternal
		},
	}
	svc := makeAdminSvc(userRepo, defaultAdminBookingRepo(), defaultAdminOutboxRepo())

	err := svc.UpdateUserRole(context.Background(), "user-1", domain.RoleAdmin)

	if err == nil {
		t.Error("expected error from repo, got nil")
	}
}

// --- Tests: DeactivateUser ---

func TestAdminService_DeactivateUser_Success(t *testing.T) {
	userRepo := &mockAdminUserRepo{
		findByIDFn: func(ctx context.Context, id string) (*domain.User, error) {
			return &domain.User{ID: id, IsActive: true}, nil
		},
		deactivateFn: func(ctx context.Context, id string) error {
			return nil
		},
	}
	svc := makeAdminSvc(userRepo, defaultAdminBookingRepo(), defaultAdminOutboxRepo())

	err := svc.DeactivateUser(context.Background(), "user-1")

	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
}

func TestAdminService_DeactivateUser_NotFound(t *testing.T) {
	userRepo := &mockAdminUserRepo{
		findByIDFn: func(ctx context.Context, id string) (*domain.User, error) {
			return nil, domain.ErrNotFound
		},
	}
	svc := makeAdminSvc(userRepo, defaultAdminBookingRepo(), defaultAdminOutboxRepo())

	err := svc.DeactivateUser(context.Background(), "nonexistent")

	if !errors.Is(err, domain.ErrNotFound) {
		t.Errorf("expected ErrNotFound, got %v", err)
	}
}

func TestAdminService_DeactivateUser_RepoDeactivateError(t *testing.T) {
	userRepo := &mockAdminUserRepo{
		findByIDFn: func(ctx context.Context, id string) (*domain.User, error) {
			return &domain.User{ID: id}, nil
		},
		deactivateFn: func(ctx context.Context, id string) error {
			return domain.ErrInternal
		},
	}
	svc := makeAdminSvc(userRepo, defaultAdminBookingRepo(), defaultAdminOutboxRepo())

	err := svc.DeactivateUser(context.Background(), "user-1")

	if err == nil {
		t.Error("expected error from deactivate, got nil")
	}
}

// --- Tests: ListAllBookings ---

func TestAdminService_ListAllBookings_ReturnsBookings(t *testing.T) {
	bookings := []*domain.Booking{
		{ID: 1, UserID: "user-1", RoomID: 10, Status: "confirmed"},
		{ID: 2, UserID: "user-2", RoomID: 20, Status: "cancelled"},
	}
	bookingRepo := &mockAdminBookingRepo{
		listAllBookingsFn: func(ctx context.Context, page, limit int) ([]*domain.Booking, int, error) {
			return bookings, 2, nil
		},
	}
	svc := makeAdminSvc(defaultAdminUserRepo(), bookingRepo, defaultAdminOutboxRepo())

	result, total, err := svc.ListAllBookings(context.Background(), 1, 20)

	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if len(result) != 2 {
		t.Errorf("expected 2 bookings, got %d", len(result))
	}
	if total != 2 {
		t.Errorf("expected total 2, got %d", total)
	}
}

func TestAdminService_ListAllBookings_NormalizesPagination(t *testing.T) {
	capturedPage, capturedLimit := 0, 0
	bookingRepo := &mockAdminBookingRepo{
		listAllBookingsFn: func(ctx context.Context, page, limit int) ([]*domain.Booking, int, error) {
			capturedPage = page
			capturedLimit = limit
			return []*domain.Booking{}, 0, nil
		},
	}
	svc := makeAdminSvc(defaultAdminUserRepo(), bookingRepo, defaultAdminOutboxRepo())

	svc.ListAllBookings(context.Background(), 0, 0)

	if capturedPage != 1 {
		t.Errorf("expected normalized page 1, got %d", capturedPage)
	}
	if capturedLimit != 20 {
		t.Errorf("expected normalized limit 20, got %d", capturedLimit)
	}
}

func TestAdminService_ListAllBookings_RepoError(t *testing.T) {
	bookingRepo := &mockAdminBookingRepo{
		listAllBookingsFn: func(ctx context.Context, page, limit int) ([]*domain.Booking, int, error) {
			return nil, 0, domain.ErrInternal
		},
	}
	svc := makeAdminSvc(defaultAdminUserRepo(), bookingRepo, defaultAdminOutboxRepo())

	_, _, err := svc.ListAllBookings(context.Background(), 1, 20)

	if err == nil {
		t.Error("expected error, got nil")
	}
}

// --- Tests: ListDLQEvents ---

func TestAdminService_ListDLQEvents_ReturnsEvents(t *testing.T) {
	events := []*domain.OutboxEvent{
		{ID: "evt-1", EventType: "PaymentFailed", RetryCount: 6},
		{ID: "evt-2", EventType: "PaymentTimedOut", RetryCount: 7},
	}
	outboxRepo := &mockAdminOutboxRepo{
		listDLQEventsFn: func(ctx context.Context, maxRetries, page, limit int) ([]*domain.OutboxEvent, int, error) {
			return events, 2, nil
		},
	}
	svc := makeAdminSvc(defaultAdminUserRepo(), defaultAdminBookingRepo(), outboxRepo)

	result, total, err := svc.ListDLQEvents(context.Background(), 1, 20)

	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if len(result) != 2 {
		t.Errorf("expected 2 DLQ events, got %d", len(result))
	}
	if total != 2 {
		t.Errorf("expected total 2, got %d", total)
	}
}

func TestAdminService_ListDLQEvents_UsesDLQMaxRetries(t *testing.T) {
	capturedMaxRetries := 0
	outboxRepo := &mockAdminOutboxRepo{
		listDLQEventsFn: func(ctx context.Context, maxRetries, page, limit int) ([]*domain.OutboxEvent, int, error) {
			capturedMaxRetries = maxRetries
			return []*domain.OutboxEvent{}, 0, nil
		},
	}
	svc := makeAdminSvc(defaultAdminUserRepo(), defaultAdminBookingRepo(), outboxRepo)

	svc.ListDLQEvents(context.Background(), 1, 20)

	if capturedMaxRetries != 5 {
		t.Errorf("expected maxRetries=5, got %d", capturedMaxRetries)
	}
}

func TestAdminService_ListDLQEvents_RepoError(t *testing.T) {
	outboxRepo := &mockAdminOutboxRepo{
		listDLQEventsFn: func(ctx context.Context, maxRetries, page, limit int) ([]*domain.OutboxEvent, int, error) {
			return nil, 0, domain.ErrInternal
		},
	}
	svc := makeAdminSvc(defaultAdminUserRepo(), defaultAdminBookingRepo(), outboxRepo)

	_, _, err := svc.ListDLQEvents(context.Background(), 1, 20)

	if err == nil {
		t.Error("expected error, got nil")
	}
}

// --- Tests: RetryDLQEvent ---

func TestAdminService_RetryDLQEvent_Success(t *testing.T) {
	var calledWithID string
	outboxRepo := &mockAdminOutboxRepo{
		resetDLQEventFn: func(ctx context.Context, id string) error {
			calledWithID = id
			return nil
		},
	}
	svc := makeAdminSvc(defaultAdminUserRepo(), defaultAdminBookingRepo(), outboxRepo)

	err := svc.RetryDLQEvent(context.Background(), "evt-1")

	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if calledWithID != "evt-1" {
		t.Errorf("expected calledWithID=evt-1, got %s", calledWithID)
	}
}

func TestAdminService_RetryDLQEvent_RepoError(t *testing.T) {
	outboxRepo := &mockAdminOutboxRepo{
		resetDLQEventFn: func(ctx context.Context, id string) error {
			return domain.ErrNotFound
		},
	}
	svc := makeAdminSvc(defaultAdminUserRepo(), defaultAdminBookingRepo(), outboxRepo)

	err := svc.RetryDLQEvent(context.Background(), "nonexistent")

	if !errors.Is(err, domain.ErrNotFound) {
		t.Errorf("expected ErrNotFound, got %v", err)
	}
}
