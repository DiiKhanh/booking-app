package response

import (
	"booking-app/internal/domain"
)

// AdminUserResponse is the public admin view of a user.
type AdminUserResponse struct {
	ID        string `json:"id"`
	Email     string `json:"email"`
	FullName  string `json:"full_name"`
	Role      string `json:"role"`
	IsActive  bool   `json:"is_active"`
	CreatedAt string `json:"created_at"`
}

// AdminBookingResponse is the public admin view of a booking.
type AdminBookingResponse struct {
	ID         int     `json:"id"`
	UserID     string  `json:"user_id"`
	RoomID     int     `json:"room_id"`
	TotalPrice float64 `json:"total_price"`
	Status     string  `json:"status"`
	StartDate  string  `json:"start_date"`
	EndDate    string  `json:"end_date"`
	CreatedAt  string  `json:"created_at"`
}

// DLQEventResponse is the public admin view of a dead-letter queue event.
type DLQEventResponse struct {
	ID            string `json:"id"`
	AggregateType string `json:"aggregate_type"`
	AggregateID   string `json:"aggregate_id"`
	EventType     string `json:"event_type"`
	RetryCount    int    `json:"retry_count"`
	CreatedAt     string `json:"created_at"`
}

// NewAdminUserResponse converts a domain User to an AdminUserResponse.
func NewAdminUserResponse(u *domain.User) *AdminUserResponse {
	return &AdminUserResponse{
		ID:        u.ID,
		Email:     u.Email,
		FullName:  u.FullName,
		Role:      string(u.Role),
		IsActive:  u.IsActive,
		CreatedAt: u.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
	}
}

// NewAdminUserListResponse converts a slice of domain Users to AdminUserResponses.
func NewAdminUserListResponse(users []*domain.User) []*AdminUserResponse {
	result := make([]*AdminUserResponse, 0, len(users))
	for _, u := range users {
		result = append(result, NewAdminUserResponse(u))
	}
	return result
}

// NewAdminBookingResponse converts a domain Booking to an AdminBookingResponse.
func NewAdminBookingResponse(b *domain.Booking) *AdminBookingResponse {
	return &AdminBookingResponse{
		ID:         b.ID,
		UserID:     b.UserID,
		RoomID:     b.RoomID,
		TotalPrice: b.TotalPrice,
		Status:     b.Status,
		StartDate:  b.StartDate.Format("2006-01-02"),
		EndDate:    b.EndDate.Format("2006-01-02"),
		CreatedAt:  b.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
	}
}

// NewAdminBookingListResponse converts a slice of domain Bookings to AdminBookingResponses.
func NewAdminBookingListResponse(bookings []*domain.Booking) []*AdminBookingResponse {
	result := make([]*AdminBookingResponse, 0, len(bookings))
	for _, b := range bookings {
		result = append(result, NewAdminBookingResponse(b))
	}
	return result
}

// NewDLQEventResponse converts a domain OutboxEvent to a DLQEventResponse.
func NewDLQEventResponse(e *domain.OutboxEvent) *DLQEventResponse {
	return &DLQEventResponse{
		ID:            e.ID,
		AggregateType: e.AggregateType,
		AggregateID:   e.AggregateID,
		EventType:     e.EventType,
		RetryCount:    e.RetryCount,
		CreatedAt:     e.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
	}
}

// NewDLQEventListResponse converts a slice of domain OutboxEvents to DLQEventResponses.
func NewDLQEventListResponse(events []*domain.OutboxEvent) []*DLQEventResponse {
	result := make([]*DLQEventResponse, 0, len(events))
	for _, e := range events {
		result = append(result, NewDLQEventResponse(e))
	}
	return result
}
