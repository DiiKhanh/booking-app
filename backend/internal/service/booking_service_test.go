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
	createErr       error
	initInventoryFn func(ctx context.Context, roomID int, startDate time.Time, days, total int) error
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

func TestBookingService_CreateBooking_Success(t *testing.T) {
	repo := &mockBookingRepo{}
	svc := service.NewBookingService(repo)

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
	if booking.TotalPrice <= 0 {
		t.Error("expected positive TotalPrice")
	}
}

func TestBookingService_CreateBooking_InvalidDates(t *testing.T) {
	svc := service.NewBookingService(&mockBookingRepo{})

	input := domain.CreateBookingInput{
		UserID:    "user-1",
		RoomID:    1,
		StartDate: time.Date(2026, 3, 5, 0, 0, 0, 0, time.UTC),
		EndDate:   time.Date(2026, 3, 1, 0, 0, 0, 0, time.UTC), // end before start
	}

	_, err := svc.CreateBooking(context.Background(), input)
	if !errors.Is(err, domain.ErrBadRequest) {
		t.Errorf("expected ErrBadRequest, got %v", err)
	}
}

func TestBookingService_CreateBooking_SameDates(t *testing.T) {
	svc := service.NewBookingService(&mockBookingRepo{})

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
	svc := service.NewBookingService(repo)

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
	svc := service.NewBookingService(repo)

	err := svc.InitializeInventory(context.Background(), 1, time.Now(), 30, 1)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !called {
		t.Error("expected InitializeInventory to be called")
	}
}
