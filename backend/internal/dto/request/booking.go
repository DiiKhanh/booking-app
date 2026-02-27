package request

// CreateBookingRequest contains fields for creating a new booking.
// UserID is intentionally absent — it is taken from the JWT context.
type CreateBookingRequest struct {
	RoomID    int    `json:"room_id" binding:"required"`
	StartDate string `json:"start_date" binding:"required"`
	EndDate   string `json:"end_date" binding:"required"`
}

// LegacyCreateBookingRequest is used by the legacy /api/bookings endpoint
// that accepts user_id in the request body (backward compat for k6 load tests).
type LegacyCreateBookingRequest struct {
	UserID    string `json:"user_id" binding:"required"`
	RoomID    int    `json:"room_id" binding:"required"`
	StartDate string `json:"start_date" binding:"required"`
	EndDate   string `json:"end_date" binding:"required"`
}
