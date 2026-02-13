package handler

import (
	"booking-app/internal/models"
	"booking-app/internal/repository"
	"context"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

type BookingHandler struct {
	Repo *repository.BookingRepo
}

func NewBookingHandler(repo *repository.BookingRepo) *BookingHandler {
	return &BookingHandler{Repo: repo}
}

func (h *BookingHandler) CreateBooking(c *gin.Context) {
	var req models.BookingRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	startDate, err := time.Parse("2006-01-02", req.StartDate)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid start_date format, use YYYY-MM-DD"})
		return
	}

	endDate, err := time.Parse("2006-01-02", req.EndDate)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid end_date format, use YYYY-MM-DD"})
		return
	}

	totalPrice := 100.0 // Simplified: Fixed price for now

	booking := &models.Booking{
		UserID:     req.UserID,
		RoomID:     req.RoomID,
		StartDate:  startDate,
		EndDate:    endDate,
		TotalPrice: totalPrice,
	}

	// Timeout for the entire booking operation including lock acquisition
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := h.Repo.CreateBooking(ctx, booking); err != nil {
		// Differentiate between "room not available" (user error) vs "system error"
		// Lock failures and availability issues return 409 Conflict — client can retry
		// Internal errors return 500 — something unexpected went wrong
		if isConflictError(err) {
			c.JSON(http.StatusConflict, gin.H{
				"error": err.Error(),
				"code":  409,
			})
			return
		}

		c.JSON(http.StatusInternalServerError, gin.H{
			"error": err.Error(),
			"code":  500,
		})
		return
	}

	c.JSON(http.StatusCreated, booking)
}

// isConflictError checks if the error is a booking conflict (not available or lock failure)
// rather than a system-level error (DB down, network issue, etc.)
func isConflictError(err error) bool {
	msg := err.Error()
	return strings.Contains(msg, "not available") ||
		strings.Contains(msg, "could not acquire lock")
}

func (h *BookingHandler) InitializeInventory(c *gin.Context) {
	// Helper endpoint to setup test data
	// roomID=1, startDate=today, days=30, total=1
	ctx := context.Background()
	err := h.Repo.InitializeInventory(ctx, 1, time.Now(), 30, 1)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Inventory initialized for Room 1"})
}
