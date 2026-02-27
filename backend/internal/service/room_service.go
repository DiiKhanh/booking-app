package service

import (
	"booking-app/internal/domain"
	"booking-app/internal/repository"
	"context"
	"fmt"
)

// CreateRoomInput holds the data needed to create a new room.
type CreateRoomInput struct {
	HotelID       int
	Name          string
	Description   string
	Capacity      int
	PricePerNight float64
	Amenities     []string
	Images        []string
}

// UpdateRoomInput holds the data for updating an existing room.
type UpdateRoomInput struct {
	Name          string
	Description   string
	Capacity      int
	PricePerNight float64
	Amenities     []string
	Images        []string
	IsActive      bool
}

// RoomService handles room business logic.
type RoomService struct {
	roomRepo  repository.RoomRepository
	hotelRepo repository.HotelRepository
}

// NewRoomService creates a new RoomService.
func NewRoomService(roomRepo repository.RoomRepository, hotelRepo repository.HotelRepository) *RoomService {
	return &RoomService{roomRepo: roomRepo, hotelRepo: hotelRepo}
}

// CreateRoom validates ownership then creates a room under the given hotel.
func (s *RoomService) CreateRoom(ctx context.Context, ownerID string, input CreateRoomInput) (*domain.Room, error) {
	if input.Name == "" {
		return nil, fmt.Errorf("room name is required: %w", domain.ErrBadRequest)
	}
	if input.PricePerNight < 0 {
		return nil, fmt.Errorf("price_per_night must be non-negative: %w", domain.ErrBadRequest)
	}

	hotel, err := s.hotelRepo.GetHotelByID(ctx, input.HotelID)
	if err != nil {
		return nil, err
	}

	if hotel.OwnerID != ownerID {
		return nil, fmt.Errorf("caller does not own this hotel: %w", domain.ErrUnauthorized)
	}

	room := &domain.Room{
		HotelID:       input.HotelID,
		Name:          input.Name,
		Description:   input.Description,
		Capacity:      input.Capacity,
		PricePerNight: input.PricePerNight,
		Amenities:     input.Amenities,
		Images:        input.Images,
		IsActive:      true,
	}

	return s.roomRepo.CreateRoom(ctx, room)
}

// GetRoomByID returns a room by its ID.
func (s *RoomService) GetRoomByID(ctx context.Context, id int) (*domain.Room, error) {
	return s.roomRepo.GetRoomByID(ctx, id)
}

// ListRoomsByHotel returns all active rooms for a hotel.
func (s *RoomService) ListRoomsByHotel(ctx context.Context, hotelID int) ([]*domain.Room, error) {
	return s.roomRepo.ListRoomsByHotel(ctx, hotelID)
}

// UpdateRoom updates a room after verifying the caller owns the parent hotel.
func (s *RoomService) UpdateRoom(ctx context.Context, roomID int, ownerID string, input UpdateRoomInput) (*domain.Room, error) {
	room, err := s.roomRepo.GetRoomByID(ctx, roomID)
	if err != nil {
		return nil, err
	}

	hotel, err := s.hotelRepo.GetHotelByID(ctx, room.HotelID)
	if err != nil {
		return nil, err
	}

	if hotel.OwnerID != ownerID {
		return nil, fmt.Errorf("caller does not own this hotel: %w", domain.ErrUnauthorized)
	}

	updated := &domain.Room{
		ID:            room.ID,
		HotelID:       room.HotelID,
		CreatedAt:     room.CreatedAt,
		Name:          input.Name,
		Description:   input.Description,
		Capacity:      input.Capacity,
		PricePerNight: input.PricePerNight,
		Amenities:     input.Amenities,
		Images:        input.Images,
		IsActive:      input.IsActive,
	}

	return s.roomRepo.UpdateRoom(ctx, updated)
}

// DeleteRoom soft-deletes a room by setting is_active = false.
// Ownership of the parent hotel is verified before deletion.
func (s *RoomService) DeleteRoom(ctx context.Context, roomID int, ownerID string) error {
	room, err := s.roomRepo.GetRoomByID(ctx, roomID)
	if err != nil {
		return err
	}

	hotel, err := s.hotelRepo.GetHotelByID(ctx, room.HotelID)
	if err != nil {
		return err
	}

	if hotel.OwnerID != ownerID {
		return fmt.Errorf("caller does not own this hotel: %w", domain.ErrUnauthorized)
	}

	return s.roomRepo.DeleteRoom(ctx, roomID, room.HotelID)
}
