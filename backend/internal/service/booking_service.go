package service

import (
	"booking-app/internal/domain"
	"booking-app/internal/repository"
	"context"
	"time"
)

// BookingService handles booking business logic.
type BookingService struct {
	repo repository.BookingRepository
}

// NewBookingService creates a new BookingService.
func NewBookingService(repo repository.BookingRepository) *BookingService {
	return &BookingService{repo: repo}
}

// CreateBooking validates input and creates a booking.
func (s *BookingService) CreateBooking(ctx context.Context, input domain.CreateBookingInput) (*domain.Booking, error) {
	if input.EndDate.Before(input.StartDate) || input.EndDate.Equal(input.StartDate) {
		return nil, domain.ErrBadRequest
	}

	totalPrice := 100.0 // Simplified: fixed price until room pricing is implemented

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

// InitializeInventory seeds inventory for a room (testing helper).
func (s *BookingService) InitializeInventory(ctx context.Context, roomID int, startDate time.Time, days int, total int) error {
	return s.repo.InitializeInventory(ctx, roomID, startDate, days, total)
}
