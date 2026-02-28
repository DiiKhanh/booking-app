package domain

import "time"

// BookingStatus constants define all possible booking lifecycle states.
const (
	BookingStatusPending         = "pending"
	BookingStatusAwaitingPayment = "awaiting_payment"
	BookingStatusProcessing      = "processing"
	BookingStatusConfirmed       = "confirmed"
	BookingStatusFailed          = "failed"
	BookingStatusCancelled       = "cancelled"
	BookingStatusRefunded        = "refunded"
)

type Booking struct {
	ID         int       `json:"id" db:"id"`
	UserID     string    `json:"user_id" db:"user_id"`
	RoomID     int       `json:"room_id" db:"room_id"`
	StartDate  time.Time `json:"start_date" db:"start_date"`
	EndDate    time.Time `json:"end_date" db:"end_date"`
	TotalPrice float64   `json:"total_price" db:"total_price"`
	Status     string    `json:"status" db:"status"`
	CreatedAt  time.Time `json:"created_at" db:"created_at"`
}

type CreateBookingInput struct {
	UserID    string    `json:"user_id"`
	RoomID    int       `json:"room_id"`
	StartDate time.Time `json:"start_date"`
	EndDate   time.Time `json:"end_date"`
}
