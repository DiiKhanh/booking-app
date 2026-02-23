package handler

import (
	"booking-app/internal/domain"
	"booking-app/internal/dto/response"
	"booking-app/internal/service"
	"context"
	"errors"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
)

type bookingRequest struct {
	UserID    string `json:"user_id" binding:"required"`
	RoomID    int    `json:"room_id" binding:"required"`
	StartDate string `json:"start_date" binding:"required"`
	EndDate   string `json:"end_date" binding:"required"`
}

// BookingHandler handles HTTP requests for bookings.
type BookingHandler struct {
	svc *service.BookingService
}

// NewBookingHandler creates a new BookingHandler.
func NewBookingHandler(svc *service.BookingService) *BookingHandler {
	return &BookingHandler{svc: svc}
}

// CreateBooking handles POST /api/v1/bookings.
func (h *BookingHandler) CreateBooking(c *gin.Context) {
	var req bookingRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, response.Fail(err.Error()))
		return
	}

	startDate, err := time.Parse("2006-01-02", req.StartDate)
	if err != nil {
		c.JSON(http.StatusBadRequest, response.Fail("invalid start_date format, use YYYY-MM-DD"))
		return
	}

	endDate, err := time.Parse("2006-01-02", req.EndDate)
	if err != nil {
		c.JSON(http.StatusBadRequest, response.Fail("invalid end_date format, use YYYY-MM-DD"))
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	booking, err := h.svc.CreateBooking(ctx, domain.CreateBookingInput{
		UserID:    req.UserID,
		RoomID:    req.RoomID,
		StartDate: startDate,
		EndDate:   endDate,
	})
	if err != nil {
		if errors.Is(err, domain.ErrNotAvailable) || errors.Is(err, domain.ErrLockFailed) {
			c.JSON(http.StatusConflict, response.Fail(err.Error()))
			return
		}
		if errors.Is(err, domain.ErrBadRequest) {
			c.JSON(http.StatusBadRequest, response.Fail(err.Error()))
			return
		}
		c.JSON(http.StatusInternalServerError, response.Fail(err.Error()))
		return
	}

	c.JSON(http.StatusCreated, response.OK(booking))
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
