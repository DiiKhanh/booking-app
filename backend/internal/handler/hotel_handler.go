package handler

import (
	"booking-app/internal/domain"
	"booking-app/internal/dto/request"
	"booking-app/internal/dto/response"
	"booking-app/internal/service"
	"context"
	"errors"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
)

// HotelServiceInterface defines what the hotel handler needs from the service.
type HotelServiceInterface interface {
	CreateHotel(ctx context.Context, ownerID string, input service.CreateHotelInput) (*domain.Hotel, error)
	GetHotelByID(ctx context.Context, id int) (*domain.Hotel, error)
	ListApprovedHotels(ctx context.Context, page, limit int) ([]*domain.Hotel, int, error)
	ListHotelsByOwner(ctx context.Context, ownerID string, page, limit int) ([]*domain.Hotel, int, error)
	ListPendingHotels(ctx context.Context, page, limit int) ([]*domain.Hotel, int, error)
	UpdateHotel(ctx context.Context, id int, ownerID string, input service.UpdateHotelInput) (*domain.Hotel, error)
	DeleteHotel(ctx context.Context, id int, ownerID string) error
	ApproveHotel(ctx context.Context, id int) error
	RejectHotel(ctx context.Context, id int) error
}

// HotelHandler handles HTTP requests for hotel endpoints.
type HotelHandler struct {
	svc HotelServiceInterface
}

// NewHotelHandler creates a new HotelHandler.
func NewHotelHandler(svc HotelServiceInterface) *HotelHandler {
	return &HotelHandler{svc: svc}
}

// ListHotels handles GET /api/v1/hotels.
func (h *HotelHandler) ListHotels(c *gin.Context) {
	page := queryIntDefault(c, "page", 1)
	limit := queryIntDefault(c, "limit", 20)

	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	hotels, total, err := h.svc.ListApprovedHotels(ctx, page, limit)
	if err != nil {
		handleHotelError(c, err)
		return
	}

	pages := calculatePages(total, limit)
	c.JSON(http.StatusOK, response.OKList(
		response.NewHotelListResponse(hotels),
		response.Meta{Total: total, Page: page, Limit: limit, Pages: pages},
	))
}

// GetHotel handles GET /api/v1/hotels/:id.
func (h *HotelHandler) GetHotel(c *gin.Context) {
	id, err := parseIDParam(c, "id")
	if err != nil {
		c.JSON(http.StatusBadRequest, response.Fail("invalid hotel id"))
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	hotel, err := h.svc.GetHotelByID(ctx, id)
	if err != nil {
		handleHotelError(c, err)
		return
	}

	c.JSON(http.StatusOK, response.OK(response.NewHotelResponse(hotel)))
}

// ListRoomsByHotel handles GET /api/v1/hotels/:id/rooms.
// This delegates to the room part — rooms are returned via the room handler but
// wired here for the public hotel route.
func (h *HotelHandler) ListRoomsByHotel(c *gin.Context) {
	id, err := parseIDParam(c, "id")
	if err != nil {
		c.JSON(http.StatusBadRequest, response.Fail("invalid hotel id"))
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	// Verify hotel exists
	_, err = h.svc.GetHotelByID(ctx, id)
	if err != nil {
		handleHotelError(c, err)
		return
	}

	// Signal to room handler via context param (actual room listing is in room_handler)
	// For this handler, we pass to a shared roomSvc if wired, otherwise return empty.
	// The route will be fulfilled by RoomHandler.ListRoomsByHotel instead.
	c.JSON(http.StatusOK, response.OK([]response.RoomResponse{}))
}

// CreateHotel handles POST /api/v1/owner/hotels.
func (h *HotelHandler) CreateHotel(c *gin.Context) {
	var req request.CreateHotelRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, response.Fail(err.Error()))
		return
	}

	ownerID := getUserIDFromContext(c)

	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	hotel, err := h.svc.CreateHotel(ctx, ownerID, service.CreateHotelInput{
		Name:        req.Name,
		Location:    req.Location,
		Address:     req.Address,
		City:        req.City,
		Country:     req.Country,
		Latitude:    req.Latitude,
		Longitude:   req.Longitude,
		Amenities:   req.Amenities,
		Images:      req.Images,
		StarRating:  req.StarRating,
		Description: req.Description,
	})
	if err != nil {
		handleHotelError(c, err)
		return
	}

	c.JSON(http.StatusCreated, response.OK(response.NewHotelResponse(hotel)))
}

// ListMyHotels handles GET /api/v1/owner/hotels.
func (h *HotelHandler) ListMyHotels(c *gin.Context) {
	ownerID := getUserIDFromContext(c)
	page := queryIntDefault(c, "page", 1)
	limit := queryIntDefault(c, "limit", 20)

	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	hotels, total, err := h.svc.ListHotelsByOwner(ctx, ownerID, page, limit)
	if err != nil {
		handleHotelError(c, err)
		return
	}

	pages := calculatePages(total, limit)
	c.JSON(http.StatusOK, response.OKList(
		response.NewHotelListResponse(hotels),
		response.Meta{Total: total, Page: page, Limit: limit, Pages: pages},
	))
}

// UpdateHotel handles PUT /api/v1/owner/hotels/:id.
func (h *HotelHandler) UpdateHotel(c *gin.Context) {
	id, err := parseIDParam(c, "id")
	if err != nil {
		c.JSON(http.StatusBadRequest, response.Fail("invalid hotel id"))
		return
	}

	var req request.UpdateHotelRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, response.Fail(err.Error()))
		return
	}

	ownerID := getUserIDFromContext(c)

	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	hotel, err := h.svc.UpdateHotel(ctx, id, ownerID, service.UpdateHotelInput{
		Name:        req.Name,
		Location:    req.Location,
		Address:     req.Address,
		City:        req.City,
		Country:     req.Country,
		Latitude:    req.Latitude,
		Longitude:   req.Longitude,
		Amenities:   req.Amenities,
		Images:      req.Images,
		StarRating:  req.StarRating,
		Description: req.Description,
	})
	if err != nil {
		handleHotelError(c, err)
		return
	}

	c.JSON(http.StatusOK, response.OK(response.NewHotelResponse(hotel)))
}

// DeleteHotel handles DELETE /api/v1/owner/hotels/:id.
func (h *HotelHandler) DeleteHotel(c *gin.Context) {
	id, err := parseIDParam(c, "id")
	if err != nil {
		c.JSON(http.StatusBadRequest, response.Fail("invalid hotel id"))
		return
	}

	ownerID := getUserIDFromContext(c)

	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	if err := h.svc.DeleteHotel(ctx, id, ownerID); err != nil {
		handleHotelError(c, err)
		return
	}

	c.Status(http.StatusNoContent)
}

// ListPendingHotels handles GET /api/v1/admin/hotels/pending.
func (h *HotelHandler) ListPendingHotels(c *gin.Context) {
	page := queryIntDefault(c, "page", 1)
	limit := queryIntDefault(c, "limit", 20)

	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	hotels, total, err := h.svc.ListPendingHotels(ctx, page, limit)
	if err != nil {
		handleHotelError(c, err)
		return
	}

	pages := calculatePages(total, limit)
	c.JSON(http.StatusOK, response.OKList(
		response.NewHotelListResponse(hotels),
		response.Meta{Total: total, Page: page, Limit: limit, Pages: pages},
	))
}

// ApproveHotel handles PUT /api/v1/admin/hotels/:id/approve.
func (h *HotelHandler) ApproveHotel(c *gin.Context) {
	id, err := parseIDParam(c, "id")
	if err != nil {
		c.JSON(http.StatusBadRequest, response.Fail("invalid hotel id"))
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	if err := h.svc.ApproveHotel(ctx, id); err != nil {
		handleHotelError(c, err)
		return
	}

	c.JSON(http.StatusOK, response.OK(gin.H{"message": "hotel approved"}))
}

// RejectHotel handles PUT /api/v1/admin/hotels/:id/reject.
func (h *HotelHandler) RejectHotel(c *gin.Context) {
	id, err := parseIDParam(c, "id")
	if err != nil {
		c.JSON(http.StatusBadRequest, response.Fail("invalid hotel id"))
		return
	}

	var req request.RejectHotelRequest
	_ = c.ShouldBindJSON(&req) // reason is optional

	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	if err := h.svc.RejectHotel(ctx, id); err != nil {
		handleHotelError(c, err)
		return
	}

	c.JSON(http.StatusOK, response.OK(gin.H{"message": "hotel rejected"}))
}

// handleHotelError maps domain errors to HTTP status codes.
func handleHotelError(c *gin.Context, err error) {
	switch {
	case errors.Is(err, domain.ErrNotFound):
		c.JSON(http.StatusNotFound, response.Fail(err.Error()))
	case errors.Is(err, domain.ErrUnauthorized):
		c.JSON(http.StatusForbidden, response.Fail(err.Error()))
	case errors.Is(err, domain.ErrConflict):
		c.JSON(http.StatusConflict, response.Fail(err.Error()))
	case errors.Is(err, domain.ErrBadRequest):
		c.JSON(http.StatusBadRequest, response.Fail(err.Error()))
	case errors.Is(err, domain.ErrForbidden):
		c.JSON(http.StatusForbidden, response.Fail(err.Error()))
	default:
		c.JSON(http.StatusInternalServerError, response.Fail("internal server error"))
	}
}

// parseIDParam parses an integer URL parameter by name.
func parseIDParam(c *gin.Context, name string) (int, error) {
	return strconv.Atoi(c.Param(name))
}

// queryIntDefault returns the integer query param or a default.
func queryIntDefault(c *gin.Context, key string, def int) int {
	if s := c.Query(key); s != "" {
		if n, err := strconv.Atoi(s); err == nil && n > 0 {
			return n
		}
	}
	return def
}

// calculatePages computes total pages given total items and page size.
func calculatePages(total, limit int) int {
	if limit <= 0 {
		return 0
	}
	pages := total / limit
	if total%limit != 0 {
		pages++
	}
	return pages
}
