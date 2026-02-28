package domain

import "time"

// Review represents a guest's review of a hotel after a completed booking.
type Review struct {
	ID        int       `json:"id" db:"id"`
	UserID    string    `json:"user_id" db:"user_id"`
	HotelID   int       `json:"hotel_id" db:"hotel_id"`
	BookingID int       `json:"booking_id" db:"booking_id"`
	Rating    int       `json:"rating" db:"rating"`
	Title     string    `json:"title" db:"title"`
	Comment   string    `json:"comment" db:"comment"`
	CreatedAt time.Time `json:"created_at" db:"created_at"`
	UpdatedAt time.Time `json:"updated_at" db:"updated_at"`
}
