package request

// CreateHotelRequest is the body for POST /owner/hotels.
type CreateHotelRequest struct {
	Name        string   `json:"name"        binding:"required"`
	Location    string   `json:"location"`
	Address     string   `json:"address"`
	City        string   `json:"city"`
	Country     string   `json:"country"`
	Latitude    float64  `json:"latitude"`
	Longitude   float64  `json:"longitude"`
	Amenities   []string `json:"amenities"`
	Images      []string `json:"images"`
	StarRating  int      `json:"star_rating"`
	Description string   `json:"description"`
}

// UpdateHotelRequest is the body for PUT /owner/hotels/:id.
type UpdateHotelRequest struct {
	Name        string   `json:"name"`
	Location    string   `json:"location"`
	Address     string   `json:"address"`
	City        string   `json:"city"`
	Country     string   `json:"country"`
	Latitude    float64  `json:"latitude"`
	Longitude   float64  `json:"longitude"`
	Amenities   []string `json:"amenities"`
	Images      []string `json:"images"`
	StarRating  int      `json:"star_rating"`
	Description string   `json:"description"`
}

// CreateRoomRequest is the body for POST /owner/hotels/:id/rooms.
type CreateRoomRequest struct {
	Name          string   `json:"name"           binding:"required"`
	Description   string   `json:"description"`
	Capacity      int      `json:"capacity"`
	PricePerNight float64  `json:"price_per_night"`
	Amenities     []string `json:"amenities"`
	Images        []string `json:"images"`
}

// UpdateRoomRequest is the body for PUT /owner/rooms/:id.
type UpdateRoomRequest struct {
	Name          string   `json:"name"`
	Description   string   `json:"description"`
	Capacity      int      `json:"capacity"`
	PricePerNight float64  `json:"price_per_night"`
	Amenities     []string `json:"amenities"`
	Images        []string `json:"images"`
	IsActive      bool     `json:"is_active"`
}

// SetInventoryRequest is the body for PUT /owner/rooms/:id/inventory.
type SetInventoryRequest struct {
	StartDate string `json:"start_date" binding:"required"`
	Days      int    `json:"days"       binding:"required,min=1"`
	Total     int    `json:"total"      binding:"required,min=0"`
}

// RejectHotelRequest is the body for PUT /admin/hotels/:id/reject.
type RejectHotelRequest struct {
	Reason string `json:"reason"`
}
