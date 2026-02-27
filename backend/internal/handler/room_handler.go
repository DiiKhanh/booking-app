package handler

import (
	"booking-app/internal/domain"
	"booking-app/internal/dto/request"
	"booking-app/internal/dto/response"
	"booking-app/internal/service"
	"context"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
)

// RoomServiceInterface defines what the room handler needs from the service.
type RoomServiceInterface interface {
	CreateRoom(ctx context.Context, ownerID string, input service.CreateRoomInput) (*domain.Room, error)
	GetRoomByID(ctx context.Context, id int) (*domain.Room, error)
	ListRoomsByHotel(ctx context.Context, hotelID int) ([]*domain.Room, error)
	UpdateRoom(ctx context.Context, roomID int, ownerID string, input service.UpdateRoomInput) (*domain.Room, error)
	DeleteRoom(ctx context.Context, roomID int, ownerID string) error
}

// InventoryServiceInterface defines what the room handler needs for inventory.
type InventoryServiceInterface interface {
	SetInventoryRange(ctx context.Context, ownerID string, roomID int, startDate time.Time, days int, total int) error
	GetInventoryRange(ctx context.Context, roomID int, startDate time.Time, endDate time.Time) ([]*domain.Inventory, error)
}

// RoomHandler handles HTTP requests for room and inventory endpoints.
type RoomHandler struct {
	roomSvc      RoomServiceInterface
	inventorySvc InventoryServiceInterface
}

// NewRoomHandler creates a new RoomHandler.
func NewRoomHandler(roomSvc RoomServiceInterface, inventorySvc InventoryServiceInterface) *RoomHandler {
	return &RoomHandler{roomSvc: roomSvc, inventorySvc: inventorySvc}
}

// ListRoomsByHotel handles GET /api/v1/hotels/:id/rooms.
func (h *RoomHandler) ListRoomsByHotel(c *gin.Context) {
	hotelID, err := parseIDParam(c, "id")
	if err != nil {
		c.JSON(http.StatusBadRequest, response.Fail("invalid hotel id"))
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	rooms, err := h.roomSvc.ListRoomsByHotel(ctx, hotelID)
	if err != nil {
		handleHotelError(c, err)
		return
	}

	c.JSON(http.StatusOK, response.OK(response.NewRoomListResponse(rooms)))
}

// CreateRoom handles POST /api/v1/owner/hotels/:id/rooms.
func (h *RoomHandler) CreateRoom(c *gin.Context) {
	hotelID, err := parseIDParam(c, "id")
	if err != nil {
		c.JSON(http.StatusBadRequest, response.Fail("invalid hotel id"))
		return
	}

	var req request.CreateRoomRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, response.Fail(err.Error()))
		return
	}

	ownerID := getUserIDFromContext(c)

	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	room, err := h.roomSvc.CreateRoom(ctx, ownerID, service.CreateRoomInput{
		HotelID:       hotelID,
		Name:          req.Name,
		Description:   req.Description,
		Capacity:      req.Capacity,
		PricePerNight: req.PricePerNight,
		Amenities:     req.Amenities,
		Images:        req.Images,
	})
	if err != nil {
		handleHotelError(c, err)
		return
	}

	c.JSON(http.StatusCreated, response.OK(response.NewRoomResponse(room)))
}

// UpdateRoom handles PUT /api/v1/owner/rooms/:id.
func (h *RoomHandler) UpdateRoom(c *gin.Context) {
	roomID, err := parseIDParam(c, "id")
	if err != nil {
		c.JSON(http.StatusBadRequest, response.Fail("invalid room id"))
		return
	}

	var req request.UpdateRoomRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, response.Fail(err.Error()))
		return
	}

	ownerID := getUserIDFromContext(c)

	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	room, err := h.roomSvc.UpdateRoom(ctx, roomID, ownerID, service.UpdateRoomInput{
		Name:          req.Name,
		Description:   req.Description,
		Capacity:      req.Capacity,
		PricePerNight: req.PricePerNight,
		Amenities:     req.Amenities,
		Images:        req.Images,
		IsActive:      req.IsActive,
	})
	if err != nil {
		handleHotelError(c, err)
		return
	}

	c.JSON(http.StatusOK, response.OK(response.NewRoomResponse(room)))
}

// DeleteRoom handles DELETE /api/v1/owner/rooms/:id.
func (h *RoomHandler) DeleteRoom(c *gin.Context) {
	roomID, err := parseIDParam(c, "id")
	if err != nil {
		c.JSON(http.StatusBadRequest, response.Fail("invalid room id"))
		return
	}

	ownerID := getUserIDFromContext(c)

	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	if err := h.roomSvc.DeleteRoom(ctx, roomID, ownerID); err != nil {
		handleHotelError(c, err)
		return
	}

	c.Status(http.StatusNoContent)
}

// SetInventory handles PUT /api/v1/owner/rooms/:id/inventory.
func (h *RoomHandler) SetInventory(c *gin.Context) {
	roomID, err := parseIDParam(c, "id")
	if err != nil {
		c.JSON(http.StatusBadRequest, response.Fail("invalid room id"))
		return
	}

	var req request.SetInventoryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, response.Fail(err.Error()))
		return
	}

	startDate, err := time.Parse("2006-01-02", req.StartDate)
	if err != nil {
		c.JSON(http.StatusBadRequest, response.Fail("invalid start_date format, use YYYY-MM-DD"))
		return
	}

	ownerID := getUserIDFromContext(c)

	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	if err := h.inventorySvc.SetInventoryRange(ctx, ownerID, roomID, startDate, req.Days, req.Total); err != nil {
		handleHotelError(c, err)
		return
	}

	c.JSON(http.StatusOK, response.OK(gin.H{"message": "inventory updated"}))
}

// GetInventory handles GET /api/v1/owner/rooms/:id/inventory.
func (h *RoomHandler) GetInventory(c *gin.Context) {
	roomID, err := parseIDParam(c, "id")
	if err != nil {
		c.JSON(http.StatusBadRequest, response.Fail("invalid room id"))
		return
	}

	startStr := c.Query("start_date")
	endStr := c.Query("end_date")

	if startStr == "" || endStr == "" {
		c.JSON(http.StatusBadRequest, response.Fail("start_date and end_date query params are required"))
		return
	}

	startDate, err := time.Parse("2006-01-02", startStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, response.Fail("invalid start_date format, use YYYY-MM-DD"))
		return
	}

	endDate, err := time.Parse("2006-01-02", endStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, response.Fail("invalid end_date format, use YYYY-MM-DD"))
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	invs, err := h.inventorySvc.GetInventoryRange(ctx, roomID, startDate, endDate)
	if err != nil {
		handleHotelError(c, err)
		return
	}

	c.JSON(http.StatusOK, response.OK(response.NewInventoryListResponse(invs)))
}
