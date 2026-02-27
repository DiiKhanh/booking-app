package service_test

import (
	"booking-app/internal/domain"
	"booking-app/internal/service"
	"context"
	"errors"
	"testing"
	"time"
)

// mockBookingRepo implements repository.BookingRepository for testing.
type mockBookingRepo struct {
	createErr            error
	initInventoryFn      func(ctx context.Context, roomID int, startDate time.Time, days, total int) error
	findByIDFn           func(ctx context.Context, id int) (*domain.Booking, error)
	listByUserFn         func(ctx context.Context, userID string, page, limit int) ([]*domain.Booking, int, error)
	updateStatusFn       func(ctx context.Context, id int, status string) error
	cancelBookingFn      func(ctx context.Context, id int, userID string) error
}

func (m *mockBookingRepo) CreateBooking(ctx context.Context, booking *domain.Booking) error {
	if m.createErr != nil {
		return m.createErr
	}
	booking.ID = 42
	booking.Status = "confirmed"
	booking.CreatedAt = time.Now()
	return nil
}

func (m *mockBookingRepo) InitializeInventory(ctx context.Context, roomID int, startDate time.Time, days, total int) error {
	if m.initInventoryFn != nil {
		return m.initInventoryFn(ctx, roomID, startDate, days, total)
	}
	return nil
}

func (m *mockBookingRepo) FindBookingByID(ctx context.Context, id int) (*domain.Booking, error) {
	if m.findByIDFn != nil {
		return m.findByIDFn(ctx, id)
	}
	return nil, nil
}

func (m *mockBookingRepo) ListBookingsByUser(ctx context.Context, userID string, page, limit int) ([]*domain.Booking, int, error) {
	if m.listByUserFn != nil {
		return m.listByUserFn(ctx, userID, page, limit)
	}
	return []*domain.Booking{}, 0, nil
}

func (m *mockBookingRepo) UpdateBookingStatus(ctx context.Context, id int, status string) error {
	if m.updateStatusFn != nil {
		return m.updateStatusFn(ctx, id, status)
	}
	return nil
}

func (m *mockBookingRepo) CancelBooking(ctx context.Context, id int, userID string) error {
	if m.cancelBookingFn != nil {
		return m.cancelBookingFn(ctx, id, userID)
	}
	return nil
}

// mockBookingRoomRepo implements repository.RoomRepository for booking service tests.
type mockBookingRoomRepo struct {
	getRoomByIDFn func(ctx context.Context, id int) (*domain.Room, error)
}

func (m *mockBookingRoomRepo) CreateRoom(ctx context.Context, room *domain.Room) (*domain.Room, error) {
	return nil, errors.New("not implemented")
}

func (m *mockBookingRoomRepo) GetRoomByID(ctx context.Context, id int) (*domain.Room, error) {
	if m.getRoomByIDFn != nil {
		return m.getRoomByIDFn(ctx, id)
	}
	return nil, errors.New("not configured")
}

func (m *mockBookingRoomRepo) ListRoomsByHotel(ctx context.Context, hotelID int) ([]*domain.Room, error) {
	return nil, errors.New("not implemented")
}

func (m *mockBookingRoomRepo) UpdateRoom(ctx context.Context, room *domain.Room) (*domain.Room, error) {
	return nil, errors.New("not implemented")
}

func (m *mockBookingRoomRepo) DeleteRoom(ctx context.Context, id int, hotelID int) error {
	return errors.New("not implemented")
}

// ---- CreateBooking tests ----

func TestBookingService_CreateBooking_Success(t *testing.T) {
	repo := &mockBookingRepo{}
	roomRepo := &mockBookingRoomRepo{
		getRoomByIDFn: func(_ context.Context, id int) (*domain.Room, error) {
			return &domain.Room{ID: id, PricePerNight: 150.0}, nil
		},
	}
	svc := service.NewBookingService(repo, roomRepo)

	input := domain.CreateBookingInput{
		UserID:    "user-1",
		RoomID:    1,
		StartDate: time.Date(2026, 3, 1, 0, 0, 0, 0, time.UTC),
		EndDate:   time.Date(2026, 3, 5, 0, 0, 0, 0, time.UTC),
	}

	booking, err := svc.CreateBooking(context.Background(), input)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if booking.ID != 42 {
		t.Errorf("expected ID=42, got %d", booking.ID)
	}
	// 4 nights * 150.0 = 600.0
	if booking.TotalPrice != 600.0 {
		t.Errorf("expected TotalPrice=600.0, got %f", booking.TotalPrice)
	}
}

func TestBookingService_CreateBooking_InvalidDates(t *testing.T) {
	svc := service.NewBookingService(&mockBookingRepo{}, &mockBookingRoomRepo{})

	input := domain.CreateBookingInput{
		UserID:    "user-1",
		RoomID:    1,
		StartDate: time.Date(2026, 3, 5, 0, 0, 0, 0, time.UTC),
		EndDate:   time.Date(2026, 3, 1, 0, 0, 0, 0, time.UTC),
	}

	_, err := svc.CreateBooking(context.Background(), input)
	if !errors.Is(err, domain.ErrBadRequest) {
		t.Errorf("expected ErrBadRequest, got %v", err)
	}
}

func TestBookingService_CreateBooking_SameDates(t *testing.T) {
	svc := service.NewBookingService(&mockBookingRepo{}, &mockBookingRoomRepo{})

	same := time.Date(2026, 3, 1, 0, 0, 0, 0, time.UTC)
	input := domain.CreateBookingInput{
		UserID: "user-1", RoomID: 1,
		StartDate: same, EndDate: same,
	}

	_, err := svc.CreateBooking(context.Background(), input)
	if !errors.Is(err, domain.ErrBadRequest) {
		t.Errorf("expected ErrBadRequest for same dates, got %v", err)
	}
}

func TestBookingService_CreateBooking_NotAvailable(t *testing.T) {
	repo := &mockBookingRepo{createErr: domain.ErrNotAvailable}
	roomRepo := &mockBookingRoomRepo{
		getRoomByIDFn: func(_ context.Context, id int) (*domain.Room, error) {
			return &domain.Room{ID: id, PricePerNight: 100.0}, nil
		},
	}
	svc := service.NewBookingService(repo, roomRepo)

	input := domain.CreateBookingInput{
		UserID:    "user-1",
		RoomID:    1,
		StartDate: time.Date(2026, 3, 1, 0, 0, 0, 0, time.UTC),
		EndDate:   time.Date(2026, 3, 5, 0, 0, 0, 0, time.UTC),
	}

	_, err := svc.CreateBooking(context.Background(), input)
	if !errors.Is(err, domain.ErrNotAvailable) {
		t.Errorf("expected ErrNotAvailable, got %v", err)
	}
}

func TestBookingService_CreateBooking_RoomNotFound(t *testing.T) {
	roomRepo := &mockBookingRoomRepo{
		getRoomByIDFn: func(_ context.Context, id int) (*domain.Room, error) {
			return nil, domain.ErrNotFound
		},
	}
	svc := service.NewBookingService(&mockBookingRepo{}, roomRepo)

	input := domain.CreateBookingInput{
		UserID:    "user-1",
		RoomID:    999,
		StartDate: time.Date(2026, 3, 1, 0, 0, 0, 0, time.UTC),
		EndDate:   time.Date(2026, 3, 5, 0, 0, 0, 0, time.UTC),
	}

	_, err := svc.CreateBooking(context.Background(), input)
	if !errors.Is(err, domain.ErrNotFound) {
		t.Errorf("expected ErrNotFound for unknown room, got %v", err)
	}
}

func TestBookingService_CreateBooking_PricingIsCorrect(t *testing.T) {
	repo := &mockBookingRepo{}
	roomRepo := &mockBookingRoomRepo{
		getRoomByIDFn: func(_ context.Context, id int) (*domain.Room, error) {
			return &domain.Room{ID: id, PricePerNight: 200.0}, nil
		},
	}
	svc := service.NewBookingService(repo, roomRepo)

	// 7 nights * 200 = 1400
	input := domain.CreateBookingInput{
		UserID:    "user-2",
		RoomID:    2,
		StartDate: time.Date(2026, 4, 1, 0, 0, 0, 0, time.UTC),
		EndDate:   time.Date(2026, 4, 8, 0, 0, 0, 0, time.UTC),
	}

	booking, err := svc.CreateBooking(context.Background(), input)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if booking.TotalPrice != 1400.0 {
		t.Errorf("expected TotalPrice=1400.0, got %f", booking.TotalPrice)
	}
}

// ---- InitializeInventory tests ----

func TestBookingService_InitializeInventory(t *testing.T) {
	called := false
	repo := &mockBookingRepo{
		initInventoryFn: func(_ context.Context, roomID int, _ time.Time, days, total int) error {
			called = true
			if roomID != 1 || days != 30 || total != 1 {
				t.Errorf("unexpected params: roomID=%d days=%d total=%d", roomID, days, total)
			}
			return nil
		},
	}
	svc := service.NewBookingService(repo, &mockBookingRoomRepo{})

	err := svc.InitializeInventory(context.Background(), 1, time.Now(), 30, 1)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !called {
		t.Error("expected InitializeInventory to be called")
	}
}

// ---- GetBooking tests ----

func TestBookingService_GetBooking_Success(t *testing.T) {
	booking := &domain.Booking{ID: 10, UserID: "user-1", RoomID: 1, Status: "confirmed"}
	repo := &mockBookingRepo{
		findByIDFn: func(_ context.Context, id int) (*domain.Booking, error) {
			return booking, nil
		},
	}
	svc := service.NewBookingService(repo, &mockBookingRoomRepo{})

	result, err := svc.GetBooking(context.Background(), 10, "user-1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result.ID != 10 {
		t.Errorf("expected booking ID=10, got %d", result.ID)
	}
}

func TestBookingService_GetBooking_WrongUser_ReturnsForbidden(t *testing.T) {
	booking := &domain.Booking{ID: 10, UserID: "user-1", RoomID: 1, Status: "confirmed"}
	repo := &mockBookingRepo{
		findByIDFn: func(_ context.Context, id int) (*domain.Booking, error) {
			return booking, nil
		},
	}
	svc := service.NewBookingService(repo, &mockBookingRoomRepo{})

	_, err := svc.GetBooking(context.Background(), 10, "other-user")
	if !errors.Is(err, domain.ErrForbidden) {
		t.Errorf("expected ErrForbidden, got %v", err)
	}
}

func TestBookingService_GetBooking_NotFound(t *testing.T) {
	repo := &mockBookingRepo{
		findByIDFn: func(_ context.Context, id int) (*domain.Booking, error) {
			return nil, domain.ErrNotFound
		},
	}
	svc := service.NewBookingService(repo, &mockBookingRoomRepo{})

	_, err := svc.GetBooking(context.Background(), 999, "user-1")
	if !errors.Is(err, domain.ErrNotFound) {
		t.Errorf("expected ErrNotFound, got %v", err)
	}
}

// ---- ListMyBookings tests ----

func TestBookingService_ListMyBookings_Success(t *testing.T) {
	bookings := []*domain.Booking{
		{ID: 1, UserID: "user-1"},
		{ID: 2, UserID: "user-1"},
	}
	repo := &mockBookingRepo{
		listByUserFn: func(_ context.Context, userID string, page, limit int) ([]*domain.Booking, int, error) {
			if userID != "user-1" {
				return nil, 0, errors.New("unexpected userID")
			}
			return bookings, 2, nil
		},
	}
	svc := service.NewBookingService(repo, &mockBookingRoomRepo{})

	result, total, err := svc.ListMyBookings(context.Background(), "user-1", 1, 20)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if total != 2 {
		t.Errorf("expected total=2, got %d", total)
	}
	if len(result) != 2 {
		t.Errorf("expected 2 bookings, got %d", len(result))
	}
}

func TestBookingService_ListMyBookings_EmptyResult(t *testing.T) {
	repo := &mockBookingRepo{
		listByUserFn: func(_ context.Context, userID string, page, limit int) ([]*domain.Booking, int, error) {
			return []*domain.Booking{}, 0, nil
		},
	}
	svc := service.NewBookingService(repo, &mockBookingRoomRepo{})

	result, total, err := svc.ListMyBookings(context.Background(), "user-99", 1, 20)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if total != 0 {
		t.Errorf("expected total=0, got %d", total)
	}
	if len(result) != 0 {
		t.Errorf("expected 0 bookings, got %d", len(result))
	}
}

// ---- CancelBooking tests ----

func TestBookingService_CancelBooking_Success(t *testing.T) {
	called := false
	repo := &mockBookingRepo{
		cancelBookingFn: func(_ context.Context, id int, userID string) error {
			called = true
			if id != 10 || userID != "user-1" {
				t.Errorf("unexpected cancel params: id=%d userID=%s", id, userID)
			}
			return nil
		},
	}
	svc := service.NewBookingService(repo, &mockBookingRoomRepo{})

	err := svc.CancelBooking(context.Background(), 10, "user-1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !called {
		t.Error("expected CancelBooking to be called on repo")
	}
}

func TestBookingService_CancelBooking_Unauthorized(t *testing.T) {
	repo := &mockBookingRepo{
		cancelBookingFn: func(_ context.Context, id int, userID string) error {
			return domain.ErrUnauthorized
		},
	}
	svc := service.NewBookingService(repo, &mockBookingRoomRepo{})

	err := svc.CancelBooking(context.Background(), 10, "wrong-user")
	if !errors.Is(err, domain.ErrUnauthorized) {
		t.Errorf("expected ErrUnauthorized, got %v", err)
	}
}

func TestBookingService_CancelBooking_AlreadyCancelled(t *testing.T) {
	repo := &mockBookingRepo{
		cancelBookingFn: func(_ context.Context, id int, userID string) error {
			return domain.ErrConflict
		},
	}
	svc := service.NewBookingService(repo, &mockBookingRoomRepo{})

	err := svc.CancelBooking(context.Background(), 10, "user-1")
	if !errors.Is(err, domain.ErrConflict) {
		t.Errorf("expected ErrConflict, got %v", err)
	}
}

// ---- GetBookingStatus tests ----

func TestBookingService_GetBookingStatus_Success(t *testing.T) {
	booking := &domain.Booking{ID: 5, UserID: "user-1", Status: "confirmed"}
	repo := &mockBookingRepo{
		findByIDFn: func(_ context.Context, id int) (*domain.Booking, error) {
			return booking, nil
		},
	}
	svc := service.NewBookingService(repo, &mockBookingRoomRepo{})

	status, err := svc.GetBookingStatus(context.Background(), 5, "user-1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if status != "confirmed" {
		t.Errorf("expected status=confirmed, got %s", status)
	}
}

func TestBookingService_GetBookingStatus_WrongUser(t *testing.T) {
	booking := &domain.Booking{ID: 5, UserID: "user-1", Status: "confirmed"}
	repo := &mockBookingRepo{
		findByIDFn: func(_ context.Context, id int) (*domain.Booking, error) {
			return booking, nil
		},
	}
	svc := service.NewBookingService(repo, &mockBookingRoomRepo{})

	_, err := svc.GetBookingStatus(context.Background(), 5, "attacker")
	if !errors.Is(err, domain.ErrForbidden) {
		t.Errorf("expected ErrForbidden, got %v", err)
	}
}
