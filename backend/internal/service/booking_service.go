package service

import (
	"booking-app/internal/domain"
	"booking-app/internal/repository"
	"context"
	"fmt"
	"time"
)

// BookingService handles booking business logic.
type BookingService struct {
	repo     repository.BookingRepository
	roomRepo repository.RoomRepository
}

// NewBookingService creates a new BookingService.
// It requires both a BookingRepository for booking operations and a
// RoomRepository to fetch room pricing for total price calculation.
func NewBookingService(repo repository.BookingRepository, roomRepo repository.RoomRepository) *BookingService {
	return &BookingService{
		repo:     repo,
		roomRepo: roomRepo,
	}
}

// CreateBooking validates input, fetches room pricing, and creates a booking.
func (s *BookingService) CreateBooking(ctx context.Context, input domain.CreateBookingInput) (*domain.Booking, error) {
	if input.EndDate.Before(input.StartDate) || input.EndDate.Equal(input.StartDate) {
		return nil, domain.ErrBadRequest
	}

	room, err := s.roomRepo.GetRoomByID(ctx, input.RoomID)
	if err != nil {
		return nil, fmt.Errorf("fetch room for pricing: %w", err)
	}

	nights := int(input.EndDate.Sub(input.StartDate).Hours() / 24)
	totalPrice := float64(nights) * room.PricePerNight

	booking := &domain.Booking{
		UserID:     input.UserID,
		RoomID:     input.RoomID,
		StartDate:  input.StartDate,
		EndDate:    input.EndDate,
		TotalPrice: totalPrice,
	}

	if err := s.repo.CreateBooking(ctx, booking); err != nil {
		return nil, err
	}

	return booking, nil
}

// GetBooking retrieves a booking by ID and verifies ownership.
// Returns ErrForbidden if the caller is not the booking owner.
func (s *BookingService) GetBooking(ctx context.Context, id int, callerUserID string) (*domain.Booking, error) {
	booking, err := s.repo.FindBookingByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("get booking: %w", err)
	}

	if booking.UserID != callerUserID {
		return nil, domain.ErrForbidden
	}

	return booking, nil
}

// ListMyBookings returns paginated bookings for the given user.
func (s *BookingService) ListMyBookings(ctx context.Context, userID string, page, limit int) ([]*domain.Booking, int, error) {
	return s.repo.ListBookingsByUser(ctx, userID, page, limit)
}

// CancelBooking cancels a booking and restores inventory.
// The repo layer handles ownership verification.
func (s *BookingService) CancelBooking(ctx context.Context, id int, userID string) error {
	return s.repo.CancelBooking(ctx, id, userID)
}

// GetBookingStatus returns the status string for a booking, after verifying ownership.
func (s *BookingService) GetBookingStatus(ctx context.Context, id int, callerUserID string) (string, error) {
	booking, err := s.GetBooking(ctx, id, callerUserID)
	if err != nil {
		return "", fmt.Errorf("get booking status: %w", err)
	}
	return booking.Status, nil
}

// InitializeInventory seeds inventory for a room (testing helper).
func (s *BookingService) InitializeInventory(ctx context.Context, roomID int, startDate time.Time, days int, total int) error {
	return s.repo.InitializeInventory(ctx, roomID, startDate, days, total)
}
