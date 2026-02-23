package domain

import "time"

type Inventory struct {
	ID             int       `json:"id" db:"id"`
	RoomID         int       `json:"room_id" db:"room_id"`
	Date           time.Time `json:"date" db:"date"`
	TotalInventory int       `json:"total_inventory" db:"total_inventory"`
	BookedCount    int       `json:"booked_count" db:"booked_count"`
}
