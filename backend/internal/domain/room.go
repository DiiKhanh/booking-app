package domain

import "time"

// Room represents a bookable room within a hotel.
type Room struct {
	ID            int       `json:"id"             db:"id"`
	HotelID       int       `json:"hotel_id"       db:"hotel_id"`
	Name          string    `json:"name"           db:"name"`
	Description   string    `json:"description"    db:"description"`
	Capacity      int       `json:"capacity"       db:"capacity"`
	PricePerNight float64   `json:"price_per_night" db:"price_per_night"`
	Amenities     []string  `json:"amenities"      db:"amenities"`
	Images        []string  `json:"images"         db:"images"`
	IsActive      bool      `json:"is_active"      db:"is_active"`
	CreatedAt     time.Time `json:"created_at"     db:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"     db:"updated_at"`
}
