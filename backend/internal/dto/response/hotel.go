package response

import (
	"booking-app/internal/domain"
	"time"
)

// HotelResponse is the public representation of a hotel.
type HotelResponse struct {
	ID          int                `json:"id"`
	OwnerID     string             `json:"owner_id"`
	Name        string             `json:"name"`
	Location    string             `json:"location"`
	Address     string             `json:"address"`
	City        string             `json:"city"`
	Country     string             `json:"country"`
	Latitude    float64            `json:"latitude"`
	Longitude   float64            `json:"longitude"`
	Amenities   []string           `json:"amenities"`
	Images      []string           `json:"images"`
	StarRating  int                `json:"star_rating"`
	Status      domain.HotelStatus `json:"status"`
	Description string             `json:"description"`
	CreatedAt   time.Time          `json:"created_at"`
	UpdatedAt   time.Time          `json:"updated_at"`
}

// RoomResponse is the public representation of a room.
type RoomResponse struct {
	ID            int       `json:"id"`
	HotelID       int       `json:"hotel_id"`
	Name          string    `json:"name"`
	Description   string    `json:"description"`
	Capacity      int       `json:"capacity"`
	PricePerNight float64   `json:"price_per_night"`
	Amenities     []string  `json:"amenities"`
	Images        []string  `json:"images"`
	IsActive      bool      `json:"is_active"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

// InventoryResponse is the public representation of inventory for a room day.
type InventoryResponse struct {
	ID             int       `json:"id"`
	RoomID         int       `json:"room_id"`
	Date           time.Time `json:"date"`
	TotalInventory int       `json:"total_inventory"`
	BookedCount    int       `json:"booked_count"`
	Available      int       `json:"available"`
}

// OwnerDashboard holds aggregate statistics for an owner.
type OwnerDashboard struct {
	TotalHotels int `json:"total_hotels"`
	TotalRooms  int `json:"total_rooms"`
}

// NewHotelResponse converts a domain Hotel to a HotelResponse.
func NewHotelResponse(h *domain.Hotel) HotelResponse {
	amenities := h.Amenities
	if amenities == nil {
		amenities = []string{}
	}
	images := h.Images
	if images == nil {
		images = []string{}
	}
	return HotelResponse{
		ID:          h.ID,
		OwnerID:     h.OwnerID,
		Name:        h.Name,
		Location:    h.Location,
		Address:     h.Address,
		City:        h.City,
		Country:     h.Country,
		Latitude:    h.Latitude,
		Longitude:   h.Longitude,
		Amenities:   amenities,
		Images:      images,
		StarRating:  h.StarRating,
		Status:      h.Status,
		Description: h.Description,
		CreatedAt:   h.CreatedAt,
		UpdatedAt:   h.UpdatedAt,
	}
}

// NewRoomResponse converts a domain Room to a RoomResponse.
func NewRoomResponse(r *domain.Room) RoomResponse {
	amenities := r.Amenities
	if amenities == nil {
		amenities = []string{}
	}
	images := r.Images
	if images == nil {
		images = []string{}
	}
	return RoomResponse{
		ID:            r.ID,
		HotelID:       r.HotelID,
		Name:          r.Name,
		Description:   r.Description,
		Capacity:      r.Capacity,
		PricePerNight: r.PricePerNight,
		Amenities:     amenities,
		Images:        images,
		IsActive:      r.IsActive,
		CreatedAt:     r.CreatedAt,
		UpdatedAt:     r.UpdatedAt,
	}
}

// NewInventoryResponse converts a domain Inventory to InventoryResponse.
func NewInventoryResponse(inv *domain.Inventory) InventoryResponse {
	available := inv.TotalInventory - inv.BookedCount
	if available < 0 {
		available = 0
	}
	return InventoryResponse{
		ID:             inv.ID,
		RoomID:         inv.RoomID,
		Date:           inv.Date,
		TotalInventory: inv.TotalInventory,
		BookedCount:    inv.BookedCount,
		Available:      available,
	}
}

// NewHotelListResponse converts a slice of domain Hotels to HotelResponses.
func NewHotelListResponse(hotels []*domain.Hotel) []HotelResponse {
	result := make([]HotelResponse, 0, len(hotels))
	for _, h := range hotels {
		result = append(result, NewHotelResponse(h))
	}
	return result
}

// NewRoomListResponse converts a slice of domain Rooms to RoomResponses.
func NewRoomListResponse(rooms []*domain.Room) []RoomResponse {
	result := make([]RoomResponse, 0, len(rooms))
	for _, r := range rooms {
		result = append(result, NewRoomResponse(r))
	}
	return result
}

// NewInventoryListResponse converts a slice of domain Inventory to InventoryResponses.
func NewInventoryListResponse(invs []*domain.Inventory) []InventoryResponse {
	result := make([]InventoryResponse, 0, len(invs))
	for _, inv := range invs {
		result = append(result, NewInventoryResponse(inv))
	}
	return result
}
