package response

import (
	"booking-app/internal/domain"
	"time"
)

// BookingResponse is the public representation of a booking.
type BookingResponse struct {
	ID         int       `json:"id"`
	UserID     string    `json:"user_id"`
	RoomID     int       `json:"room_id"`
	StartDate  time.Time `json:"start_date"`
	EndDate    time.Time `json:"end_date"`
	TotalPrice float64   `json:"total_price"`
	Status     string    `json:"status"`
	CreatedAt  time.Time `json:"created_at"`
}

// BookingStatusResponse wraps just the status string.
type BookingStatusResponse struct {
	ID     int    `json:"id"`
	Status string `json:"status"`
}

// NewBookingResponse converts a domain Booking to a BookingResponse.
func NewBookingResponse(b *domain.Booking) BookingResponse {
	return BookingResponse{
		ID:         b.ID,
		UserID:     b.UserID,
		RoomID:     b.RoomID,
		StartDate:  b.StartDate,
		EndDate:    b.EndDate,
		TotalPrice: b.TotalPrice,
		Status:     b.Status,
		CreatedAt:  b.CreatedAt,
	}
}

// NewBookingListResponse converts a slice of domain Bookings to BookingResponses.
func NewBookingListResponse(bookings []*domain.Booking) []BookingResponse {
	result := make([]BookingResponse, 0, len(bookings))
	for _, b := range bookings {
		result = append(result, NewBookingResponse(b))
	}
	return result
}
