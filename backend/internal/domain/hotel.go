package domain

import "time"

// HotelStatus represents the approval state of a hotel.
type HotelStatus string

const (
	HotelStatusPending  HotelStatus = "pending"
	HotelStatusApproved HotelStatus = "approved"
	HotelStatusRejected HotelStatus = "rejected"
)

// Hotel represents a hotel property in the system.
type Hotel struct {
	ID          int         `json:"id"          db:"id"`
	OwnerID     string      `json:"owner_id"    db:"owner_id"`
	Name        string      `json:"name"        db:"name"`
	Location    string      `json:"location"    db:"location"`
	Address     string      `json:"address"     db:"address"`
	City        string      `json:"city"        db:"city"`
	Country     string      `json:"country"     db:"country"`
	Latitude    float64     `json:"latitude"    db:"latitude"`
	Longitude   float64     `json:"longitude"   db:"longitude"`
	Amenities   []string    `json:"amenities"   db:"amenities"`
	Images      []string    `json:"images"      db:"images"`
	StarRating  int         `json:"star_rating" db:"star_rating"`
	Status      HotelStatus `json:"status"      db:"status"`
	Description string      `json:"description" db:"description"`
	CreatedAt   time.Time   `json:"created_at"  db:"created_at"`
	UpdatedAt   time.Time   `json:"updated_at"  db:"updated_at"`
}
