package repository

import (
	"booking-app/internal/domain"
	"context"
	"time"
)

// BookingRepository defines data access operations for bookings.
type BookingRepository interface {
	CreateBooking(ctx context.Context, booking *domain.Booking) error
	InitializeInventory(ctx context.Context, roomID int, startDate time.Time, days int, total int) error
}
