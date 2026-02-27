package response_test

import (
	"booking-app/internal/domain"
	"booking-app/internal/dto/response"
	"testing"
	"time"
)

func TestNewHotelResponse_MapsAllFields(t *testing.T) {
	now := time.Now()
	h := &domain.Hotel{
		ID:          42,
		OwnerID:     "owner-uuid",
		Name:        "Grand Hotel",
		Location:    "Downtown",
		Address:     "123 Main St",
		City:        "Hanoi",
		Country:     "Vietnam",
		Latitude:    21.0278,
		Longitude:   105.8342,
		Amenities:   []string{"wifi", "pool"},
		Images:      []string{"img1.jpg"},
		StarRating:  4,
		Status:      domain.HotelStatusApproved,
		Description: "Luxury hotel",
		CreatedAt:   now,
		UpdatedAt:   now,
	}

	resp := response.NewHotelResponse(h)

	if resp.ID != h.ID {
		t.Errorf("expected ID %d, got %d", h.ID, resp.ID)
	}
	if resp.OwnerID != h.OwnerID {
		t.Errorf("expected OwnerID %q, got %q", h.OwnerID, resp.OwnerID)
	}
	if resp.Name != h.Name {
		t.Errorf("expected Name %q, got %q", h.Name, resp.Name)
	}
	if resp.City != h.City {
		t.Errorf("expected City %q, got %q", h.City, resp.City)
	}
	if resp.StarRating != h.StarRating {
		t.Errorf("expected StarRating %d, got %d", h.StarRating, resp.StarRating)
	}
	if resp.Status != h.Status {
		t.Errorf("expected Status %q, got %q", h.Status, resp.Status)
	}
	if len(resp.Amenities) != 2 {
		t.Errorf("expected 2 amenities, got %d", len(resp.Amenities))
	}
}

func TestNewHotelResponse_NilAmenities_ReturnsEmptySlice(t *testing.T) {
	h := &domain.Hotel{
		ID:       1,
		Name:     "Hotel",
		Amenities: nil,
		Images:   nil,
	}

	resp := response.NewHotelResponse(h)

	if resp.Amenities == nil {
		t.Error("expected non-nil amenities slice")
	}
	if resp.Images == nil {
		t.Error("expected non-nil images slice")
	}
}

func TestNewRoomResponse_MapsAllFields(t *testing.T) {
	now := time.Now()
	r := &domain.Room{
		ID:            5,
		HotelID:       1,
		Name:          "Deluxe King",
		Description:   "Spacious",
		Capacity:      2,
		PricePerNight: 150.0,
		Amenities:     []string{"ac", "tv"},
		Images:        []string{"room.jpg"},
		IsActive:      true,
		CreatedAt:     now,
		UpdatedAt:     now,
	}

	resp := response.NewRoomResponse(r)

	if resp.ID != r.ID {
		t.Errorf("expected ID %d, got %d", r.ID, resp.ID)
	}
	if resp.HotelID != r.HotelID {
		t.Errorf("expected HotelID %d, got %d", r.HotelID, resp.HotelID)
	}
	if resp.PricePerNight != r.PricePerNight {
		t.Errorf("expected PricePerNight %f, got %f", r.PricePerNight, resp.PricePerNight)
	}
	if !resp.IsActive {
		t.Error("expected IsActive=true")
	}
}

func TestNewRoomResponse_NilAmenities_ReturnsEmptySlice(t *testing.T) {
	r := &domain.Room{ID: 1, Amenities: nil, Images: nil}
	resp := response.NewRoomResponse(r)

	if resp.Amenities == nil {
		t.Error("expected non-nil amenities slice")
	}
	if resp.Images == nil {
		t.Error("expected non-nil images slice")
	}
}

func TestNewInventoryResponse_ComputesAvailable(t *testing.T) {
	inv := &domain.Inventory{
		ID:             1,
		RoomID:         5,
		Date:           time.Now(),
		TotalInventory: 10,
		BookedCount:    3,
	}

	resp := response.NewInventoryResponse(inv)

	if resp.Available != 7 {
		t.Errorf("expected Available 7, got %d", resp.Available)
	}
}

func TestNewInventoryResponse_NegativeAvailable_ClampedToZero(t *testing.T) {
	inv := &domain.Inventory{
		TotalInventory: 2,
		BookedCount:    5,
	}

	resp := response.NewInventoryResponse(inv)

	if resp.Available != 0 {
		t.Errorf("expected Available 0, got %d", resp.Available)
	}
}

func TestNewHotelListResponse_ReturnsCorrectLength(t *testing.T) {
	hotels := []*domain.Hotel{
		{ID: 1, Name: "A"},
		{ID: 2, Name: "B"},
		{ID: 3, Name: "C"},
	}

	result := response.NewHotelListResponse(hotels)

	if len(result) != 3 {
		t.Errorf("expected 3, got %d", len(result))
	}
}

func TestNewHotelListResponse_EmptySlice(t *testing.T) {
	result := response.NewHotelListResponse([]*domain.Hotel{})
	if len(result) != 0 {
		t.Errorf("expected 0, got %d", len(result))
	}
}

func TestNewRoomListResponse_ReturnsCorrectLength(t *testing.T) {
	rooms := []*domain.Room{
		{ID: 1, Name: "A"},
		{ID: 2, Name: "B"},
	}

	result := response.NewRoomListResponse(rooms)

	if len(result) != 2 {
		t.Errorf("expected 2, got %d", len(result))
	}
}

func TestNewInventoryListResponse_ReturnsCorrectLength(t *testing.T) {
	invs := []*domain.Inventory{
		{ID: 1, TotalInventory: 5, BookedCount: 1},
		{ID: 2, TotalInventory: 3, BookedCount: 3},
	}

	result := response.NewInventoryListResponse(invs)

	if len(result) != 2 {
		t.Errorf("expected 2, got %d", len(result))
	}
}
