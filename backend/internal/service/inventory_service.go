package service

import (
	"booking-app/internal/domain"
	"booking-app/internal/repository"
	"context"
	"fmt"
	"time"
)

// InventoryService handles inventory business logic.
type InventoryService struct {
	inventoryRepo repository.InventoryRepository
	roomRepo      repository.RoomRepository
	hotelRepo     repository.HotelRepository
}

// NewInventoryService creates a new InventoryService.
func NewInventoryService(
	inventoryRepo repository.InventoryRepository,
	roomRepo repository.RoomRepository,
	hotelRepo repository.HotelRepository,
) *InventoryService {
	return &InventoryService{
		inventoryRepo: inventoryRepo,
		roomRepo:      roomRepo,
		hotelRepo:     hotelRepo,
	}
}

// SetInventoryRange sets inventory for a contiguous range of days.
// Verifies the caller owns the hotel that contains the room.
func (s *InventoryService) SetInventoryRange(
	ctx context.Context,
	ownerID string,
	roomID int,
	startDate time.Time,
	days int,
	total int,
) error {
	if days <= 0 {
		return fmt.Errorf("days must be positive: %w", domain.ErrBadRequest)
	}
	if total < 0 {
		return fmt.Errorf("total must be non-negative: %w", domain.ErrBadRequest)
	}

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

	return s.inventoryRepo.BulkSetInventory(ctx, roomID, startDate, days, total)
}

// GetInventoryRange returns inventory records for a room over a date range.
func (s *InventoryService) GetInventoryRange(
	ctx context.Context,
	roomID int,
	startDate time.Time,
	endDate time.Time,
) ([]*domain.Inventory, error) {
	if !startDate.Before(endDate) {
		return nil, fmt.Errorf("start_date must be before end_date: %w", domain.ErrBadRequest)
	}

	return s.inventoryRepo.GetInventoryForRoom(ctx, roomID, startDate, endDate)
}

// RestoreInventory increments inventory for a room over a date range by 1 unit.
// Used by the payment saga when a payment fails or times out.
func (s *InventoryService) RestoreInventory(ctx context.Context, roomID int, startDate, endDate time.Time) error {
	days := int(endDate.Sub(startDate).Hours() / 24)
	if days <= 0 {
		return fmt.Errorf("invalid date range for inventory restore: %w", domain.ErrBadRequest)
	}
	// Restore 1 slot per day.
	return s.inventoryRepo.BulkSetInventory(ctx, roomID, startDate, days, 1)
}
