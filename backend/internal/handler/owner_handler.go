package handler

import (
	"booking-app/internal/dto/response"
	"context"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
)

// OwnerDashboardRepository defines the minimal data needed for the owner dashboard.
type OwnerDashboardRepository interface {
	CountHotelsByOwner(ctx context.Context, ownerID string) (int, error)
	CountRoomsByOwner(ctx context.Context, ownerID string) (int, error)
}

// OwnerHandler handles owner-specific aggregate endpoints.
type OwnerHandler struct {
	dashRepo OwnerDashboardRepository
}

// NewOwnerHandler creates a new OwnerHandler.
func NewOwnerHandler(dashRepo OwnerDashboardRepository) *OwnerHandler {
	return &OwnerHandler{dashRepo: dashRepo}
}

// Dashboard handles GET /api/v1/owner/dashboard.
func (h *OwnerHandler) Dashboard(c *gin.Context) {
	ownerID := getUserIDFromContext(c)

	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	totalHotels, err := h.dashRepo.CountHotelsByOwner(ctx, ownerID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, response.Fail("failed to load dashboard"))
		return
	}

	totalRooms, err := h.dashRepo.CountRoomsByOwner(ctx, ownerID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, response.Fail("failed to load dashboard"))
		return
	}

	c.JSON(http.StatusOK, response.OK(response.OwnerDashboard{
		TotalHotels: totalHotels,
		TotalRooms:  totalRooms,
	}))
}
