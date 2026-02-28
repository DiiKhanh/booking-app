package service_test

import (
	"booking-app/internal/domain"
	"booking-app/internal/service"
	"context"
	"testing"
	"time"
)

// --- Mock InventoryRepository ---

type mockInventoryRepo struct {
	setInventoryFn              func(ctx context.Context, roomID int, date time.Time, total int) error
	getInventoryFn              func(ctx context.Context, roomID int, startDate, endDate time.Time) ([]*domain.Inventory, error)
	bulkSetInventoryFn          func(ctx context.Context, roomID int, startDate time.Time, days, total int) error
	bulkDecrementBookedCountFn  func(ctx context.Context, roomID int, startDate time.Time, days, amount int) error
}

func (m *mockInventoryRepo) SetInventory(ctx context.Context, roomID int, date time.Time, total int) error {
	return m.setInventoryFn(ctx, roomID, date, total)
}

func (m *mockInventoryRepo) GetInventoryForRoom(ctx context.Context, roomID int, startDate, endDate time.Time) ([]*domain.Inventory, error) {
	return m.getInventoryFn(ctx, roomID, startDate, endDate)
}

func (m *mockInventoryRepo) BulkSetInventory(ctx context.Context, roomID int, startDate time.Time, days, total int) error {
	return m.bulkSetInventoryFn(ctx, roomID, startDate, days, total)
}

func (m *mockInventoryRepo) BulkDecrementBookedCount(ctx context.Context, roomID int, startDate time.Time, days, amount int) error {
	if m.bulkDecrementBookedCountFn != nil {
		return m.bulkDecrementBookedCountFn(ctx, roomID, startDate, days, amount)
	}
	return nil
}

// --- Tests: SetInventoryRange ---

func TestInventoryService_SetInventoryRange_Success(t *testing.T) {
	called := false
	inventoryRepo := &mockInventoryRepo{
		bulkSetInventoryFn: func(ctx context.Context, roomID int, startDate time.Time, days, total int) error {
			called = true
			if roomID != 1 {
				t.Errorf("expected roomID 1, got %d", roomID)
			}
			if days != 7 {
				t.Errorf("expected days 7, got %d", days)
			}
			if total != 5 {
				t.Errorf("expected total 5, got %d", total)
			}
			return nil
		},
	}
	roomRepo := &mockRoomRepo{
		getRoomByIDFn: func(ctx context.Context, id int) (*domain.Room, error) {
			return &domain.Room{ID: 1, HotelID: 10, IsActive: true}, nil
		},
	}
	hotelRepo := &mockHotelRepo{
		getHotelByIDFn: func(ctx context.Context, id int) (*domain.Hotel, error) {
			return &domain.Hotel{ID: 10, OwnerID: "owner-uuid"}, nil
		},
	}
	svc := service.NewInventoryService(inventoryRepo, roomRepo, hotelRepo)

	err := svc.SetInventoryRange(context.Background(), "owner-uuid", 1, time.Now(), 7, 5)

	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if !called {
		t.Error("expected BulkSetInventory to be called")
	}
}

func TestInventoryService_SetInventoryRange_RejectsNonOwner(t *testing.T) {
	roomRepo := &mockRoomRepo{
		getRoomByIDFn: func(ctx context.Context, id int) (*domain.Room, error) {
			return &domain.Room{ID: 1, HotelID: 10}, nil
		},
	}
	hotelRepo := &mockHotelRepo{
		getHotelByIDFn: func(ctx context.Context, id int) (*domain.Hotel, error) {
			return &domain.Hotel{ID: 10, OwnerID: "real-owner"}, nil
		},
	}
	svc := service.NewInventoryService(&mockInventoryRepo{}, roomRepo, hotelRepo)

	err := svc.SetInventoryRange(context.Background(), "attacker", 1, time.Now(), 7, 5)

	if err == nil {
		t.Error("expected error for non-owner")
	}
}

func TestInventoryService_SetInventoryRange_InvalidDays(t *testing.T) {
	svc := service.NewInventoryService(&mockInventoryRepo{}, &mockRoomRepo{}, &mockHotelRepo{})

	err := svc.SetInventoryRange(context.Background(), "owner", 1, time.Now(), 0, 5)

	if err == nil {
		t.Error("expected error for zero days")
	}
}

func TestInventoryService_SetInventoryRange_InvalidTotal(t *testing.T) {
	svc := service.NewInventoryService(&mockInventoryRepo{}, &mockRoomRepo{}, &mockHotelRepo{})

	err := svc.SetInventoryRange(context.Background(), "owner", 1, time.Now(), 7, -1)

	if err == nil {
		t.Error("expected error for negative total")
	}
}

// --- Tests: GetInventoryRange ---

func TestInventoryService_GetInventoryRange_ReturnsInventory(t *testing.T) {
	start := time.Now()
	end := start.AddDate(0, 0, 7)
	inventoryData := []*domain.Inventory{
		{ID: 1, RoomID: 1, Date: start, TotalInventory: 5},
		{ID: 2, RoomID: 1, Date: start.AddDate(0, 0, 1), TotalInventory: 5},
	}
	inventoryRepo := &mockInventoryRepo{
		getInventoryFn: func(ctx context.Context, roomID int, startDate, endDate time.Time) ([]*domain.Inventory, error) {
			return inventoryData, nil
		},
	}
	svc := service.NewInventoryService(inventoryRepo, &mockRoomRepo{}, &mockHotelRepo{})

	result, err := svc.GetInventoryRange(context.Background(), 1, start, end)

	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if len(result) != 2 {
		t.Errorf("expected 2 entries, got %d", len(result))
	}
}

func TestInventoryService_GetInventoryRange_InvalidDateRange(t *testing.T) {
	svc := service.NewInventoryService(&mockInventoryRepo{}, &mockRoomRepo{}, &mockHotelRepo{})

	end := time.Now()
	start := end.AddDate(0, 0, 7)

	_, err := svc.GetInventoryRange(context.Background(), 1, start, end)

	if err == nil {
		t.Error("expected error when start > end")
	}
}

// --- Tests: RestoreInventory ---

// TestInventoryService_RestoreInventory_DecrementsBookedCount verifies that
// RestoreInventory calls BulkDecrementBookedCount (not BulkSetInventory) so that
// available_rooms is restored by decrementing booked_count atomically.
// This test was written FIRST (RED phase) to catch the original bug where
// BulkSetInventory was called, which corrupted total_inventory instead of restoring slots.
func TestInventoryService_RestoreInventory_DecrementsBookedCount(t *testing.T) {
	start := time.Now().Truncate(24 * time.Hour)
	end := start.AddDate(0, 0, 3)

	var decrementCalled bool
	var gotRoomID, gotDays, gotAmount int
	var gotStart time.Time

	inventoryRepo := &mockInventoryRepo{
		bulkDecrementBookedCountFn: func(ctx context.Context, roomID int, startDate time.Time, days, amount int) error {
			decrementCalled = true
			gotRoomID = roomID
			gotStart = startDate
			gotDays = days
			gotAmount = amount
			return nil
		},
		// BulkSetInventory must NOT be called during RestoreInventory.
		bulkSetInventoryFn: func(ctx context.Context, roomID int, startDate time.Time, days, total int) error {
			t.Errorf("RestoreInventory must not call BulkSetInventory; got roomID=%d days=%d total=%d", roomID, days, total)
			return nil
		},
	}
	svc := service.NewInventoryService(inventoryRepo, &mockRoomRepo{}, &mockHotelRepo{})

	err := svc.RestoreInventory(context.Background(), 42, start, end)

	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if !decrementCalled {
		t.Fatal("expected BulkDecrementBookedCount to be called")
	}
	if gotRoomID != 42 {
		t.Errorf("expected roomID 42, got %d", gotRoomID)
	}
	if !gotStart.Equal(start) {
		t.Errorf("expected startDate %v, got %v", start, gotStart)
	}
	if gotDays != 3 {
		t.Errorf("expected 3 days, got %d", gotDays)
	}
	if gotAmount != 1 {
		t.Errorf("expected decrement amount 1 (one booking slot), got %d", gotAmount)
	}
}

func TestInventoryService_RestoreInventory_InvalidDateRange(t *testing.T) {
	svc := service.NewInventoryService(&mockInventoryRepo{}, &mockRoomRepo{}, &mockHotelRepo{})

	start := time.Now()
	end := start // same day → 0 days

	err := svc.RestoreInventory(context.Background(), 1, start, end)

	if err == nil {
		t.Error("expected error for zero-day date range")
	}
}
