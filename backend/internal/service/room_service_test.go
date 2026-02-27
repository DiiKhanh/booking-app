package service_test

import (
	"booking-app/internal/domain"
	"booking-app/internal/service"
	"context"
	"errors"
	"testing"
	"time"
)

// --- Mock RoomRepository ---

type mockRoomRepo struct {
	createRoomFn      func(ctx context.Context, room *domain.Room) (*domain.Room, error)
	getRoomByIDFn     func(ctx context.Context, id int) (*domain.Room, error)
	listRoomsByHotelFn func(ctx context.Context, hotelID int) ([]*domain.Room, error)
	updateRoomFn      func(ctx context.Context, room *domain.Room) (*domain.Room, error)
	deleteRoomFn      func(ctx context.Context, id int, hotelID int) error
}

func (m *mockRoomRepo) CreateRoom(ctx context.Context, room *domain.Room) (*domain.Room, error) {
	return m.createRoomFn(ctx, room)
}

func (m *mockRoomRepo) GetRoomByID(ctx context.Context, id int) (*domain.Room, error) {
	return m.getRoomByIDFn(ctx, id)
}

func (m *mockRoomRepo) ListRoomsByHotel(ctx context.Context, hotelID int) ([]*domain.Room, error) {
	return m.listRoomsByHotelFn(ctx, hotelID)
}

func (m *mockRoomRepo) UpdateRoom(ctx context.Context, room *domain.Room) (*domain.Room, error) {
	return m.updateRoomFn(ctx, room)
}

func (m *mockRoomRepo) DeleteRoom(ctx context.Context, id int, hotelID int) error {
	return m.deleteRoomFn(ctx, id, hotelID)
}

// --- Tests: CreateRoom ---

func TestRoomService_CreateRoom_Success(t *testing.T) {
	ownerID := "owner-uuid"
	hotel := &domain.Hotel{ID: 1, OwnerID: ownerID}
	hotelRepo := &mockHotelRepo{
		getHotelByIDFn: func(ctx context.Context, id int) (*domain.Hotel, error) {
			return hotel, nil
		},
	}
	roomRepo := &mockRoomRepo{
		createRoomFn: func(ctx context.Context, room *domain.Room) (*domain.Room, error) {
			result := *room
			result.ID = 10
			result.CreatedAt = time.Now()
			result.UpdatedAt = time.Now()
			return &result, nil
		},
	}
	svc := service.NewRoomService(roomRepo, hotelRepo)

	input := service.CreateRoomInput{
		HotelID:       1,
		Name:          "Deluxe King",
		Description:   "Spacious room",
		Capacity:      2,
		PricePerNight: 150.0,
	}

	room, err := svc.CreateRoom(context.Background(), ownerID, input)

	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if room.ID != 10 {
		t.Errorf("expected ID 10, got %d", room.ID)
	}
	if room.HotelID != 1 {
		t.Errorf("expected HotelID 1, got %d", room.HotelID)
	}
}

func TestRoomService_CreateRoom_RejectsNonOwner(t *testing.T) {
	hotel := &domain.Hotel{ID: 1, OwnerID: "real-owner"}
	hotelRepo := &mockHotelRepo{
		getHotelByIDFn: func(ctx context.Context, id int) (*domain.Hotel, error) {
			return hotel, nil
		},
	}
	svc := service.NewRoomService(&mockRoomRepo{}, hotelRepo)

	_, err := svc.CreateRoom(context.Background(), "attacker", service.CreateRoomInput{
		HotelID: 1,
		Name:    "Room",
	})

	if !errors.Is(err, domain.ErrUnauthorized) {
		t.Errorf("expected ErrUnauthorized, got %v", err)
	}
}

func TestRoomService_CreateRoom_HotelNotFound(t *testing.T) {
	hotelRepo := &mockHotelRepo{
		getHotelByIDFn: func(ctx context.Context, id int) (*domain.Hotel, error) {
			return nil, domain.ErrNotFound
		},
	}
	svc := service.NewRoomService(&mockRoomRepo{}, hotelRepo)

	_, err := svc.CreateRoom(context.Background(), "owner", service.CreateRoomInput{
		HotelID: 999,
		Name:    "Room",
	})

	if !errors.Is(err, domain.ErrNotFound) {
		t.Errorf("expected ErrNotFound, got %v", err)
	}
}

func TestRoomService_CreateRoom_RequiresName(t *testing.T) {
	svc := service.NewRoomService(&mockRoomRepo{}, &mockHotelRepo{})

	_, err := svc.CreateRoom(context.Background(), "owner", service.CreateRoomInput{
		HotelID: 1,
	})

	if !errors.Is(err, domain.ErrBadRequest) {
		t.Errorf("expected ErrBadRequest, got %v", err)
	}
}

func TestRoomService_CreateRoom_RequiresPositivePrice(t *testing.T) {
	svc := service.NewRoomService(&mockRoomRepo{}, &mockHotelRepo{})

	_, err := svc.CreateRoom(context.Background(), "owner", service.CreateRoomInput{
		HotelID:       1,
		Name:          "Room",
		PricePerNight: -10,
	})

	if !errors.Is(err, domain.ErrBadRequest) {
		t.Errorf("expected ErrBadRequest for negative price, got %v", err)
	}
}

// --- Tests: GetRoomByID ---

func TestRoomService_GetRoomByID_ReturnsRoom(t *testing.T) {
	expected := &domain.Room{ID: 5, HotelID: 1, Name: "Suite"}
	roomRepo := &mockRoomRepo{
		getRoomByIDFn: func(ctx context.Context, id int) (*domain.Room, error) {
			return expected, nil
		},
	}
	svc := service.NewRoomService(roomRepo, &mockHotelRepo{})

	room, err := svc.GetRoomByID(context.Background(), 5)

	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if room.ID != 5 {
		t.Errorf("expected ID 5, got %d", room.ID)
	}
}

func TestRoomService_GetRoomByID_NotFound(t *testing.T) {
	roomRepo := &mockRoomRepo{
		getRoomByIDFn: func(ctx context.Context, id int) (*domain.Room, error) {
			return nil, domain.ErrNotFound
		},
	}
	svc := service.NewRoomService(roomRepo, &mockHotelRepo{})

	_, err := svc.GetRoomByID(context.Background(), 999)

	if !errors.Is(err, domain.ErrNotFound) {
		t.Errorf("expected ErrNotFound, got %v", err)
	}
}

// --- Tests: ListRoomsByHotel ---

func TestRoomService_ListRoomsByHotel_ReturnsRooms(t *testing.T) {
	rooms := []*domain.Room{
		{ID: 1, HotelID: 10, Name: "Standard"},
		{ID: 2, HotelID: 10, Name: "Deluxe"},
	}
	roomRepo := &mockRoomRepo{
		listRoomsByHotelFn: func(ctx context.Context, hotelID int) ([]*domain.Room, error) {
			return rooms, nil
		},
	}
	svc := service.NewRoomService(roomRepo, &mockHotelRepo{})

	result, err := svc.ListRoomsByHotel(context.Background(), 10)

	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if len(result) != 2 {
		t.Errorf("expected 2 rooms, got %d", len(result))
	}
}

// --- Tests: UpdateRoom ---

func TestRoomService_UpdateRoom_SuccessForOwner(t *testing.T) {
	ownerID := "owner-uuid"
	hotel := &domain.Hotel{ID: 1, OwnerID: ownerID}
	room := &domain.Room{ID: 5, HotelID: 1, Name: "Old", IsActive: true}

	hotelRepo := &mockHotelRepo{
		getHotelByIDFn: func(ctx context.Context, id int) (*domain.Hotel, error) {
			return hotel, nil
		},
	}
	roomRepo := &mockRoomRepo{
		getRoomByIDFn: func(ctx context.Context, id int) (*domain.Room, error) {
			return room, nil
		},
		updateRoomFn: func(ctx context.Context, r *domain.Room) (*domain.Room, error) {
			updated := *r
			return &updated, nil
		},
	}
	svc := service.NewRoomService(roomRepo, hotelRepo)

	input := service.UpdateRoomInput{Name: "New Name", PricePerNight: 200.0}
	result, err := svc.UpdateRoom(context.Background(), 5, ownerID, input)

	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if result.Name != "New Name" {
		t.Errorf("expected name %q, got %q", "New Name", result.Name)
	}
}

func TestRoomService_UpdateRoom_RejectsNonOwner(t *testing.T) {
	hotel := &domain.Hotel{ID: 1, OwnerID: "real-owner"}
	room := &domain.Room{ID: 5, HotelID: 1}

	hotelRepo := &mockHotelRepo{
		getHotelByIDFn: func(ctx context.Context, id int) (*domain.Hotel, error) {
			return hotel, nil
		},
	}
	roomRepo := &mockRoomRepo{
		getRoomByIDFn: func(ctx context.Context, id int) (*domain.Room, error) {
			return room, nil
		},
	}
	svc := service.NewRoomService(roomRepo, hotelRepo)

	_, err := svc.UpdateRoom(context.Background(), 5, "attacker", service.UpdateRoomInput{Name: "Hack"})

	if !errors.Is(err, domain.ErrUnauthorized) {
		t.Errorf("expected ErrUnauthorized, got %v", err)
	}
}

// --- Tests: DeleteRoom ---

func TestRoomService_DeleteRoom_SoftDeletesRoom(t *testing.T) {
	ownerID := "owner-uuid"
	hotel := &domain.Hotel{ID: 1, OwnerID: ownerID}
	room := &domain.Room{ID: 5, HotelID: 1, IsActive: true}

	hotelRepo := &mockHotelRepo{
		getHotelByIDFn: func(ctx context.Context, id int) (*domain.Hotel, error) {
			return hotel, nil
		},
	}
	roomRepo := &mockRoomRepo{
		getRoomByIDFn: func(ctx context.Context, id int) (*domain.Room, error) {
			return room, nil
		},
		deleteRoomFn: func(ctx context.Context, id int, hotelID int) error {
			return nil
		},
	}
	svc := service.NewRoomService(roomRepo, hotelRepo)

	err := svc.DeleteRoom(context.Background(), 5, ownerID)

	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
}

func TestRoomService_DeleteRoom_RejectsNonOwner(t *testing.T) {
	hotel := &domain.Hotel{ID: 1, OwnerID: "real-owner"}
	room := &domain.Room{ID: 5, HotelID: 1}

	hotelRepo := &mockHotelRepo{
		getHotelByIDFn: func(ctx context.Context, id int) (*domain.Hotel, error) {
			return hotel, nil
		},
	}
	roomRepo := &mockRoomRepo{
		getRoomByIDFn: func(ctx context.Context, id int) (*domain.Room, error) {
			return room, nil
		},
	}
	svc := service.NewRoomService(roomRepo, hotelRepo)

	err := svc.DeleteRoom(context.Background(), 5, "attacker")

	if !errors.Is(err, domain.ErrUnauthorized) {
		t.Errorf("expected ErrUnauthorized, got %v", err)
	}
}
