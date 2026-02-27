package handler

import (
	"booking-app/internal/domain"
	"booking-app/internal/dto/request"
	"booking-app/internal/dto/response"
	"context"
	"errors"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
)

// BookingServiceInterface defines what the booking handler needs from the service layer.
// Using an interface makes the handler testable without a real service implementation.
type BookingServiceInterface interface {
	CreateBooking(ctx context.Context, input domain.CreateBookingInput) (*domain.Booking, error)
	GetBooking(ctx context.Context, id int, callerUserID string) (*domain.Booking, error)
	ListMyBookings(ctx context.Context, userID string, page, limit int) ([]*domain.Booking, int, error)
	CancelBooking(ctx context.Context, id int, userID string) error
	GetBookingStatus(ctx context.Context, id int, callerUserID string) (string, error)
	InitializeInventory(ctx context.Context, roomID int, startDate time.Time, days int, total int) error
}

// BookingHandler handles HTTP requests for bookings.
type BookingHandler struct {
	svc BookingServiceInterface
}

// NewBookingHandler creates a new BookingHandler.
func NewBookingHandler(svc BookingServiceInterface) *BookingHandler {
	return &BookingHandler{svc: svc}
}

// CreateBooking handles POST /api/v1/bookings.
// The userID is extracted from the JWT context set by JWTAuth middleware.
func (h *BookingHandler) CreateBooking(c *gin.Context) {
	userID := getUserIDFromContext(c)
	if userID == "" {
		c.JSON(http.StatusUnauthorized, response.Fail("authentication required"))
		return
	}

	var req request.CreateBookingRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, response.Fail(err.Error()))
		return
	}

	startDate, endDate, ok := parseDateRange(c, req.StartDate, req.EndDate)
	if !ok {
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	booking, err := h.svc.CreateBooking(ctx, domain.CreateBookingInput{
		UserID:    userID,
		RoomID:    req.RoomID,
		StartDate: startDate,
		EndDate:   endDate,
	})
	if err != nil {
		handleBookingError(c, err)
		return
	}

	c.JSON(http.StatusCreated, response.OK(response.NewBookingResponse(booking)))
}

// CreateBookingLegacy handles POST /api/bookings.
// This legacy endpoint accepts user_id in the request body for backward compatibility
// with existing k6 load tests that do not send JWT tokens.
func (h *BookingHandler) CreateBookingLegacy(c *gin.Context) {
	var req request.LegacyCreateBookingRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, response.Fail(err.Error()))
		return
	}

	startDate, endDate, ok := parseDateRange(c, req.StartDate, req.EndDate)
	if !ok {
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	booking, err := h.svc.CreateBooking(ctx, domain.CreateBookingInput{
		UserID:    req.UserID,
		RoomID:    req.RoomID,
		StartDate: startDate,
		EndDate:   endDate,
	})
	if err != nil {
		handleBookingError(c, err)
		return
	}

	c.JSON(http.StatusCreated, response.OK(response.NewBookingResponse(booking)))
}

// GetBooking handles GET /api/v1/bookings/:id.
// Only the booking owner can retrieve the booking.
func (h *BookingHandler) GetBooking(c *gin.Context) {
	userID := getUserIDFromContext(c)
	if userID == "" {
		c.JSON(http.StatusUnauthorized, response.Fail("authentication required"))
		return
	}

	id, err := parseIDParam(c, "id")
	if err != nil {
		c.JSON(http.StatusBadRequest, response.Fail("invalid booking id"))
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	booking, err := h.svc.GetBooking(ctx, id, userID)
	if err != nil {
		handleBookingError(c, err)
		return
	}

	c.JSON(http.StatusOK, response.OK(response.NewBookingResponse(booking)))
}

// ListMyBookings handles GET /api/v1/bookings.
// Returns paginated list of the authenticated user's bookings.
func (h *BookingHandler) ListMyBookings(c *gin.Context) {
	userID := getUserIDFromContext(c)
	if userID == "" {
		c.JSON(http.StatusUnauthorized, response.Fail("authentication required"))
		return
	}

	page := queryIntDefault(c, "page", 1)
	limit := queryIntDefault(c, "limit", 20)

	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	bookings, total, err := h.svc.ListMyBookings(ctx, userID, page, limit)
	if err != nil {
		handleBookingError(c, err)
		return
	}

	pages := calculatePages(total, limit)
	c.JSON(http.StatusOK, response.OKList(
		response.NewBookingListResponse(bookings),
		response.Meta{Total: total, Page: page, Limit: limit, Pages: pages},
	))
}

// GetBookingStatus handles GET /api/v1/bookings/:id/status.
// Only the booking owner can retrieve the status.
func (h *BookingHandler) GetBookingStatus(c *gin.Context) {
	userID := getUserIDFromContext(c)
	if userID == "" {
		c.JSON(http.StatusUnauthorized, response.Fail("authentication required"))
		return
	}

	id, err := parseIDParam(c, "id")
	if err != nil {
		c.JSON(http.StatusBadRequest, response.Fail("invalid booking id"))
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	status, err := h.svc.GetBookingStatus(ctx, id, userID)
	if err != nil {
		handleBookingError(c, err)
		return
	}

	c.JSON(http.StatusOK, response.OK(response.BookingStatusResponse{ID: id, Status: status}))
}

// CancelBooking handles DELETE /api/v1/bookings/:id.
// Only the booking owner can cancel a booking.
func (h *BookingHandler) CancelBooking(c *gin.Context) {
	userID := getUserIDFromContext(c)
	if userID == "" {
		c.JSON(http.StatusUnauthorized, response.Fail("authentication required"))
		return
	}

	id, err := parseIDParam(c, "id")
	if err != nil {
		c.JSON(http.StatusBadRequest, response.Fail("invalid booking id"))
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	if err := h.svc.CancelBooking(ctx, id, userID); err != nil {
		handleBookingError(c, err)
		return
	}

	c.Status(http.StatusNoContent)
}

// InitializeInventory handles POST /api/v1/admin/init.
func (h *BookingHandler) InitializeInventory(c *gin.Context) {
	ctx := context.Background()
	if err := h.svc.InitializeInventory(ctx, 1, time.Now(), 30, 1); err != nil {
		c.JSON(http.StatusInternalServerError, response.Fail(err.Error()))
		return
	}
	c.JSON(http.StatusOK, response.OK(gin.H{"message": "Inventory initialized for Room 1"}))
}

// handleBookingError maps domain errors to HTTP status codes for booking endpoints.
func handleBookingError(c *gin.Context, err error) {
	switch {
	case errors.Is(err, domain.ErrNotFound):
		c.JSON(http.StatusNotFound, response.Fail(err.Error()))
	case errors.Is(err, domain.ErrForbidden):
		c.JSON(http.StatusForbidden, response.Fail(err.Error()))
	case errors.Is(err, domain.ErrUnauthorized):
		c.JSON(http.StatusForbidden, response.Fail(err.Error()))
	case errors.Is(err, domain.ErrConflict):
		c.JSON(http.StatusConflict, response.Fail(err.Error()))
	case errors.Is(err, domain.ErrNotAvailable):
		c.JSON(http.StatusConflict, response.Fail(err.Error()))
	case errors.Is(err, domain.ErrLockFailed):
		c.JSON(http.StatusConflict, response.Fail(err.Error()))
	case errors.Is(err, domain.ErrBadRequest):
		c.JSON(http.StatusBadRequest, response.Fail(err.Error()))
	default:
		c.JSON(http.StatusInternalServerError, response.Fail("internal server error"))
	}
}

// parseDateRange parses start and end date strings (YYYY-MM-DD).
// Returns false and writes the error response if parsing fails.
func parseDateRange(c *gin.Context, startStr, endStr string) (time.Time, time.Time, bool) {
	startDate, err := time.Parse("2006-01-02", startStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, response.Fail("invalid start_date format, use YYYY-MM-DD"))
		return time.Time{}, time.Time{}, false
	}

	endDate, err := time.Parse("2006-01-02", endStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, response.Fail("invalid end_date format, use YYYY-MM-DD"))
		return time.Time{}, time.Time{}, false
	}

	return startDate, endDate, true
}
