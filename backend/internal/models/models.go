package models

import "time"

type Hotel struct {
	ID       int    `json:"id" db:"id"`
	Name     string `json:"name" db:"name"`
	Location string `json:"location" db:"location"`
}

type Room struct {
	ID       int     `json:"id" db:"id"`
	HotelID  int     `json:"hotel_id" db:"hotel_id"`
	Name     string  `json:"name" db:"name"`
	Capacity int     `json:"capacity" db:"capacity"`
	Price    float64 `json:"price_per_night" db:"price_per_night"`
}

type Inventory struct {
	ID             int       `json:"id" db:"id"`
	RoomID         int       `json:"room_id" db:"room_id"`
	Date           time.Time `json:"date" db:"date"`
	TotalInventory int       `json:"total_inventory" db:"total_inventory"`
	BookedCount    int       `json:"booked_count" db:"booked_count"`
}

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

type BookingRequest struct {
	UserID    string `json:"user_id" binding:"required"`
	RoomID    int    `json:"room_id" binding:"required"`
	StartDate string `json:"start_date" binding:"required"` // Format: YYYY-MM-DD
	EndDate   string `json:"end_date" binding:"required"`   // Format: YYYY-MM-DD
}
