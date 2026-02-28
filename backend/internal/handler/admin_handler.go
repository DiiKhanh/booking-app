package handler

import (
	"booking-app/internal/domain"
	"booking-app/internal/dto/response"
	"context"
	"errors"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
)

// AdminServiceInterface defines what the admin handler needs from the service layer.
type AdminServiceInterface interface {
	ListUsers(ctx context.Context, page, limit int) ([]*domain.User, int, error)
	GetUser(ctx context.Context, id string) (*domain.User, error)
	UpdateUserRole(ctx context.Context, id string, role domain.Role) error
	DeactivateUser(ctx context.Context, id string) error
	ListAllBookings(ctx context.Context, page, limit int) ([]*domain.Booking, int, error)
	ListDLQEvents(ctx context.Context, page, limit int) ([]*domain.OutboxEvent, int, error)
	RetryDLQEvent(ctx context.Context, id string) error
}

// updateRoleRequest is the request body for updating a user's role.
type updateRoleRequest struct {
	Role string `json:"role" binding:"required"`
}

// AdminHandler handles HTTP requests for admin-only endpoints.
type AdminHandler struct {
	svc AdminServiceInterface
}

// NewAdminHandler creates a new AdminHandler.
func NewAdminHandler(svc AdminServiceInterface) *AdminHandler {
	return &AdminHandler{svc: svc}
}

// ListUsers handles GET /api/v1/admin/users.
func (h *AdminHandler) ListUsers(c *gin.Context) {
	page := queryIntDefault(c, "page", 1)
	limit := queryIntDefault(c, "limit", 20)

	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	users, total, err := h.svc.ListUsers(ctx, page, limit)
	if err != nil {
		handleAdminError(c, err)
		return
	}

	pages := calculatePages(total, limit)
	c.JSON(http.StatusOK, response.OKList(
		response.NewAdminUserListResponse(users),
		response.Meta{Total: total, Page: page, Limit: limit, Pages: pages},
	))
}

// GetUser handles GET /api/v1/admin/users/:id.
func (h *AdminHandler) GetUser(c *gin.Context) {
	id := c.Param("id")

	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	user, err := h.svc.GetUser(ctx, id)
	if err != nil {
		handleAdminError(c, err)
		return
	}

	c.JSON(http.StatusOK, response.OK(response.NewAdminUserResponse(user)))
}

// UpdateUserRole handles PUT /api/v1/admin/users/:id/role.
// Request body: {"role": "owner"}
func (h *AdminHandler) UpdateUserRole(c *gin.Context) {
	id := c.Param("id")

	var req updateRoleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, response.Fail(err.Error()))
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	if err := h.svc.UpdateUserRole(ctx, id, domain.Role(req.Role)); err != nil {
		handleAdminError(c, err)
		return
	}

	c.JSON(http.StatusOK, response.OK(gin.H{"message": "user role updated"}))
}

// DeactivateUser handles PUT /api/v1/admin/users/:id/deactivate.
func (h *AdminHandler) DeactivateUser(c *gin.Context) {
	id := c.Param("id")

	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	if err := h.svc.DeactivateUser(ctx, id); err != nil {
		handleAdminError(c, err)
		return
	}

	c.JSON(http.StatusOK, response.OK(gin.H{"message": "user deactivated"}))
}

// ListAllBookings handles GET /api/v1/admin/bookings.
func (h *AdminHandler) ListAllBookings(c *gin.Context) {
	page := queryIntDefault(c, "page", 1)
	limit := queryIntDefault(c, "limit", 20)

	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	bookings, total, err := h.svc.ListAllBookings(ctx, page, limit)
	if err != nil {
		handleAdminError(c, err)
		return
	}

	pages := calculatePages(total, limit)
	c.JSON(http.StatusOK, response.OKList(
		response.NewAdminBookingListResponse(bookings),
		response.Meta{Total: total, Page: page, Limit: limit, Pages: pages},
	))
}

// SystemHealth handles GET /api/v1/admin/system/health.
// Returns a static health response with current timestamp.
func (h *AdminHandler) SystemHealth(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"status":    "ok",
		"service":   "booking-api",
		"timestamp": time.Now().UTC().Format(time.RFC3339),
	})
}

// ListDLQEvents handles GET /api/v1/admin/events/dlq.
func (h *AdminHandler) ListDLQEvents(c *gin.Context) {
	page := queryIntDefault(c, "page", 1)
	limit := queryIntDefault(c, "limit", 20)

	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	events, total, err := h.svc.ListDLQEvents(ctx, page, limit)
	if err != nil {
		handleAdminError(c, err)
		return
	}

	pages := calculatePages(total, limit)
	c.JSON(http.StatusOK, response.OKList(
		response.NewDLQEventListResponse(events),
		response.Meta{Total: total, Page: page, Limit: limit, Pages: pages},
	))
}

// RetryDLQEvent handles POST /api/v1/admin/events/dlq/:id/retry.
// Returns 204 No Content on success.
func (h *AdminHandler) RetryDLQEvent(c *gin.Context) {
	id := c.Param("id")

	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	if err := h.svc.RetryDLQEvent(ctx, id); err != nil {
		handleAdminError(c, err)
		return
	}

	c.Status(http.StatusNoContent)
}

// handleAdminError maps domain errors to HTTP status codes.
func handleAdminError(c *gin.Context, err error) {
	switch {
	case errors.Is(err, domain.ErrNotFound):
		c.JSON(http.StatusNotFound, response.Fail(err.Error()))
	case errors.Is(err, domain.ErrForbidden):
		c.JSON(http.StatusForbidden, response.Fail(err.Error()))
	case errors.Is(err, domain.ErrBadRequest):
		c.JSON(http.StatusBadRequest, response.Fail(err.Error()))
	case errors.Is(err, domain.ErrConflict):
		c.JSON(http.StatusConflict, response.Fail(err.Error()))
	default:
		c.JSON(http.StatusInternalServerError, response.Fail("internal server error"))
	}
}
