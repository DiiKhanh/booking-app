package handler_test

import (
	"booking-app/internal/domain"
	"booking-app/internal/handler"
	"booking-app/internal/service"
	"context"
	"fmt"
	"net/http"
	"strings"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
)

// --- Mock RoomService ---

type mockRoomSvc struct {
	createRoomFn       func(ctx context.Context, ownerID string, input service.CreateRoomInput) (*domain.Room, error)
	getRoomByIDFn      func(ctx context.Context, id int) (*domain.Room, error)
	listRoomsByHotelFn func(ctx context.Context, hotelID int) ([]*domain.Room, error)
	updateRoomFn       func(ctx context.Context, roomID int, ownerID string, input service.UpdateRoomInput) (*domain.Room, error)
	deleteRoomFn       func(ctx context.Context, roomID int, ownerID string) error
}

func (m *mockRoomSvc) CreateRoom(ctx context.Context, ownerID string, input service.CreateRoomInput) (*domain.Room, error) {
	if m.createRoomFn != nil {
		return m.createRoomFn(ctx, ownerID, input)
	}
	return nil, fmt.Errorf("not configured")
}

func (m *mockRoomSvc) GetRoomByID(ctx context.Context, id int) (*domain.Room, error) {
	if m.getRoomByIDFn != nil {
		return m.getRoomByIDFn(ctx, id)
	}
	return nil, fmt.Errorf("not configured")
}

func (m *mockRoomSvc) ListRoomsByHotel(ctx context.Context, hotelID int) ([]*domain.Room, error) {
	if m.listRoomsByHotelFn != nil {
		return m.listRoomsByHotelFn(ctx, hotelID)
	}
	return nil, fmt.Errorf("not configured")
}

func (m *mockRoomSvc) UpdateRoom(ctx context.Context, roomID int, ownerID string, input service.UpdateRoomInput) (*domain.Room, error) {
	if m.updateRoomFn != nil {
		return m.updateRoomFn(ctx, roomID, ownerID, input)
	}
	return nil, fmt.Errorf("not configured")
}

func (m *mockRoomSvc) DeleteRoom(ctx context.Context, roomID int, ownerID string) error {
	if m.deleteRoomFn != nil {
		return m.deleteRoomFn(ctx, roomID, ownerID)
	}
	return fmt.Errorf("not configured")
}

// --- Mock InventoryService ---

type mockInventorySvc struct {
	setInventoryRangeFn func(ctx context.Context, ownerID string, roomID int, startDate time.Time, days int, total int) error
	getInventoryRangeFn func(ctx context.Context, roomID int, startDate time.Time, endDate time.Time) ([]*domain.Inventory, error)
}

func (m *mockInventorySvc) SetInventoryRange(ctx context.Context, ownerID string, roomID int, startDate time.Time, days int, total int) error {
	if m.setInventoryRangeFn != nil {
		return m.setInventoryRangeFn(ctx, ownerID, roomID, startDate, days, total)
	}
	return fmt.Errorf("not configured")
}

func (m *mockInventorySvc) GetInventoryRange(ctx context.Context, roomID int, startDate time.Time, endDate time.Time) ([]*domain.Inventory, error) {
	if m.getInventoryRangeFn != nil {
		return m.getInventoryRangeFn(ctx, roomID, startDate, endDate)
	}
	return nil, fmt.Errorf("not configured")
}

func buildRoomRouter(roomSvc handler.RoomServiceInterface, invSvc handler.InventoryServiceInterface) *gin.Engine {
	r := gin.New()
	h := handler.NewRoomHandler(roomSvc, invSvc)

	public := r.Group("/api/v1")
	public.GET("/hotels/:id/rooms", h.ListRoomsByHotel)

	owner := r.Group("/api/v1/owner")
	owner.Use(func(c *gin.Context) {
		c.Set("userID", "owner-uuid-test")
		c.Set("userRole", "owner")
		c.Next()
	})
	owner.POST("/hotels/:id/rooms", h.CreateRoom)
	owner.PUT("/rooms/:id", h.UpdateRoom)
	owner.DELETE("/rooms/:id", h.DeleteRoom)
	owner.PUT("/rooms/:id/inventory", h.SetInventory)
	owner.GET("/rooms/:id/inventory", h.GetInventory)

	return r
}

func newTestRoom() *domain.Room {
	return &domain.Room{
		ID:            5,
		HotelID:       1,
		Name:          "Deluxe King",
		Capacity:      2,
		PricePerNight: 150.0,
		IsActive:      true,
		CreatedAt:     time.Now(),
		UpdatedAt:     time.Now(),
	}
}

// --- Tests: GET /hotels/:id/rooms ---

func TestRoomHandler_ListRoomsByHotel_Returns200(t *testing.T) {
	roomSvc := &mockRoomSvc{
		listRoomsByHotelFn: func(ctx context.Context, hotelID int) ([]*domain.Room, error) {
			return []*domain.Room{newTestRoom()}, nil
		},
	}
	r := buildRoomRouter(roomSvc, &mockInventorySvc{})

	w := makeHotelRequest(r, http.MethodGet, "/api/v1/hotels/1/rooms", nil)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d: %s", w.Code, w.Body.String())
	}
}

func TestRoomHandler_ListRoomsByHotel_InvalidID_Returns400(t *testing.T) {
	r := buildRoomRouter(&mockRoomSvc{}, &mockInventorySvc{})

	w := makeHotelRequest(r, http.MethodGet, "/api/v1/hotels/abc/rooms", nil)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestRoomHandler_ListRoomsByHotel_ServiceError_Returns500(t *testing.T) {
	roomSvc := &mockRoomSvc{
		listRoomsByHotelFn: func(ctx context.Context, hotelID int) ([]*domain.Room, error) {
			return nil, domain.ErrInternal
		},
	}
	r := buildRoomRouter(roomSvc, &mockInventorySvc{})

	w := makeHotelRequest(r, http.MethodGet, "/api/v1/hotels/1/rooms", nil)

	if w.Code != http.StatusInternalServerError {
		t.Errorf("expected 500, got %d", w.Code)
	}
}

// --- Tests: POST /owner/hotels/:id/rooms ---

func TestRoomHandler_CreateRoom_Returns201(t *testing.T) {
	roomSvc := &mockRoomSvc{
		createRoomFn: func(ctx context.Context, ownerID string, input service.CreateRoomInput) (*domain.Room, error) {
			return newTestRoom(), nil
		},
	}
	r := buildRoomRouter(roomSvc, &mockInventorySvc{})

	body := strings.NewReader(`{"name":"Deluxe King","capacity":2,"price_per_night":150.0}`)
	w := makeHotelRequest(r, http.MethodPost, "/api/v1/owner/hotels/1/rooms", body)

	if w.Code != http.StatusCreated {
		t.Errorf("expected 201, got %d: %s", w.Code, w.Body.String())
	}
}

func TestRoomHandler_CreateRoom_Unauthorized_Returns403(t *testing.T) {
	roomSvc := &mockRoomSvc{
		createRoomFn: func(ctx context.Context, ownerID string, input service.CreateRoomInput) (*domain.Room, error) {
			return nil, domain.ErrUnauthorized
		},
	}
	r := buildRoomRouter(roomSvc, &mockInventorySvc{})

	body := strings.NewReader(`{"name":"Room","capacity":2,"price_per_night":100.0}`)
	w := makeHotelRequest(r, http.MethodPost, "/api/v1/owner/hotels/1/rooms", body)

	if w.Code != http.StatusForbidden {
		t.Errorf("expected 403, got %d", w.Code)
	}
}

func TestRoomHandler_CreateRoom_InvalidHotelID_Returns400(t *testing.T) {
	r := buildRoomRouter(&mockRoomSvc{}, &mockInventorySvc{})

	body := strings.NewReader(`{"name":"Room"}`)
	w := makeHotelRequest(r, http.MethodPost, "/api/v1/owner/hotels/abc/rooms", body)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

// --- Tests: PUT /owner/rooms/:id ---

func TestRoomHandler_UpdateRoom_Returns200(t *testing.T) {
	roomSvc := &mockRoomSvc{
		updateRoomFn: func(ctx context.Context, roomID int, ownerID string, input service.UpdateRoomInput) (*domain.Room, error) {
			r := newTestRoom()
			r.Name = input.Name
			return r, nil
		},
	}
	r := buildRoomRouter(roomSvc, &mockInventorySvc{})

	body := strings.NewReader(`{"name":"Updated Room","price_per_night":200.0,"is_active":true}`)
	w := makeHotelRequest(r, http.MethodPut, "/api/v1/owner/rooms/5", body)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d: %s", w.Code, w.Body.String())
	}
}

func TestRoomHandler_UpdateRoom_NotFound_Returns404(t *testing.T) {
	roomSvc := &mockRoomSvc{
		updateRoomFn: func(ctx context.Context, roomID int, ownerID string, input service.UpdateRoomInput) (*domain.Room, error) {
			return nil, domain.ErrNotFound
		},
	}
	r := buildRoomRouter(roomSvc, &mockInventorySvc{})

	body := strings.NewReader(`{"name":"Room"}`)
	w := makeHotelRequest(r, http.MethodPut, "/api/v1/owner/rooms/999", body)

	if w.Code != http.StatusNotFound {
		t.Errorf("expected 404, got %d", w.Code)
	}
}

// --- Tests: DELETE /owner/rooms/:id ---

func TestRoomHandler_DeleteRoom_Returns204(t *testing.T) {
	roomSvc := &mockRoomSvc{
		deleteRoomFn: func(ctx context.Context, roomID int, ownerID string) error {
			return nil
		},
	}
	r := buildRoomRouter(roomSvc, &mockInventorySvc{})

	w := makeHotelRequest(r, http.MethodDelete, "/api/v1/owner/rooms/5", nil)

	if w.Code != http.StatusNoContent {
		t.Errorf("expected 204, got %d: %s", w.Code, w.Body.String())
	}
}

func TestRoomHandler_DeleteRoom_Unauthorized_Returns403(t *testing.T) {
	roomSvc := &mockRoomSvc{
		deleteRoomFn: func(ctx context.Context, roomID int, ownerID string) error {
			return domain.ErrUnauthorized
		},
	}
	r := buildRoomRouter(roomSvc, &mockInventorySvc{})

	w := makeHotelRequest(r, http.MethodDelete, "/api/v1/owner/rooms/5", nil)

	if w.Code != http.StatusForbidden {
		t.Errorf("expected 403, got %d", w.Code)
	}
}

// --- Tests: PUT /owner/rooms/:id/inventory ---

func TestRoomHandler_SetInventory_Returns200(t *testing.T) {
	invSvc := &mockInventorySvc{
		setInventoryRangeFn: func(ctx context.Context, ownerID string, roomID int, startDate time.Time, days int, total int) error {
			return nil
		},
	}
	r := buildRoomRouter(&mockRoomSvc{}, invSvc)

	body := strings.NewReader(`{"start_date":"2026-03-01","days":7,"total":5}`)
	w := makeHotelRequest(r, http.MethodPut, "/api/v1/owner/rooms/5/inventory", body)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d: %s", w.Code, w.Body.String())
	}
}

func TestRoomHandler_SetInventory_InvalidDate_Returns400(t *testing.T) {
	r := buildRoomRouter(&mockRoomSvc{}, &mockInventorySvc{})

	body := strings.NewReader(`{"start_date":"not-a-date","days":7,"total":5}`)
	w := makeHotelRequest(r, http.MethodPut, "/api/v1/owner/rooms/5/inventory", body)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestRoomHandler_SetInventory_MissingBody_Returns400(t *testing.T) {
	r := buildRoomRouter(&mockRoomSvc{}, &mockInventorySvc{})

	w := makeHotelRequest(r, http.MethodPut, "/api/v1/owner/rooms/5/inventory", strings.NewReader(`{}`))

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

// --- Tests: GET /owner/rooms/:id/inventory ---

func TestRoomHandler_GetInventory_Returns200(t *testing.T) {
	invSvc := &mockInventorySvc{
		getInventoryRangeFn: func(ctx context.Context, roomID int, startDate time.Time, endDate time.Time) ([]*domain.Inventory, error) {
			return []*domain.Inventory{
				{ID: 1, RoomID: roomID, Date: startDate, TotalInventory: 5, BookedCount: 2},
			}, nil
		},
	}
	r := buildRoomRouter(&mockRoomSvc{}, invSvc)

	w := makeHotelRequest(r, http.MethodGet, "/api/v1/owner/rooms/5/inventory?start_date=2026-03-01&end_date=2026-03-08", nil)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d: %s", w.Code, w.Body.String())
	}
}

func TestRoomHandler_GetInventory_MissingDates_Returns400(t *testing.T) {
	r := buildRoomRouter(&mockRoomSvc{}, &mockInventorySvc{})

	w := makeHotelRequest(r, http.MethodGet, "/api/v1/owner/rooms/5/inventory", nil)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestRoomHandler_GetInventory_InvalidStartDate_Returns400(t *testing.T) {
	r := buildRoomRouter(&mockRoomSvc{}, &mockInventorySvc{})

	w := makeHotelRequest(r, http.MethodGet, "/api/v1/owner/rooms/5/inventory?start_date=bad&end_date=2026-03-08", nil)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}
