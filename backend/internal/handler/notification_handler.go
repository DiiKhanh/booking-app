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

// NotificationServiceInterface defines what the notification handler needs from the service.
type NotificationServiceInterface interface {
	CreateNotification(ctx context.Context, userID string, notifType domain.NotificationType, title, message string, data map[string]any) (*domain.Notification, error)
	ListNotifications(ctx context.Context, userID string, page, limit int) ([]*domain.Notification, int, error)
	GetUnreadCount(ctx context.Context, userID string) (int, error)
	MarkRead(ctx context.Context, id int64, userID string) error
	MarkAllRead(ctx context.Context, userID string) error
}

// NotificationHandler handles HTTP requests for notification endpoints.
type NotificationHandler struct {
	svc NotificationServiceInterface
}

// NewNotificationHandler creates a new NotificationHandler.
func NewNotificationHandler(svc NotificationServiceInterface) *NotificationHandler {
	return &NotificationHandler{svc: svc}
}

// ListNotifications handles GET /api/v1/notifications.
func (h *NotificationHandler) ListNotifications(c *gin.Context) {
	userID := getUserIDFromContext(c)
	page := queryIntDefault(c, "page", 1)
	limit := queryIntDefault(c, "limit", 20)

	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	notifications, total, err := h.svc.ListNotifications(ctx, userID, page, limit)
	if err != nil {
		handleNotificationError(c, err)
		return
	}

	pages := calculatePages(total, limit)
	c.JSON(http.StatusOK, response.OKList(
		response.NewNotificationListResponse(notifications),
		response.Meta{Total: total, Page: page, Limit: limit, Pages: pages},
	))
}

// UnreadCount handles GET /api/v1/notifications/unread-count.
func (h *NotificationHandler) UnreadCount(c *gin.Context) {
	userID := getUserIDFromContext(c)

	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	count, err := h.svc.GetUnreadCount(ctx, userID)
	if err != nil {
		handleNotificationError(c, err)
		return
	}

	c.JSON(http.StatusOK, response.OK(response.UnreadCountResponse{Count: count}))
}

// MarkRead handles PUT /api/v1/notifications/:id/read.
func (h *NotificationHandler) MarkRead(c *gin.Context) {
	id, err := parseIDParam(c, "id")
	if err != nil {
		c.JSON(http.StatusBadRequest, response.Fail("invalid notification id"))
		return
	}

	userID := getUserIDFromContext(c)

	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	if err := h.svc.MarkRead(ctx, int64(id), userID); err != nil {
		handleNotificationError(c, err)
		return
	}

	c.JSON(http.StatusOK, response.OK(gin.H{"marked_read": true}))
}

// MarkAllRead handles PUT /api/v1/notifications/read-all.
func (h *NotificationHandler) MarkAllRead(c *gin.Context) {
	userID := getUserIDFromContext(c)

	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	if err := h.svc.MarkAllRead(ctx, userID); err != nil {
		handleNotificationError(c, err)
		return
	}

	c.JSON(http.StatusOK, response.OK(gin.H{"marked_all_read": true}))
}

// handleNotificationError maps domain errors to HTTP status codes.
func handleNotificationError(c *gin.Context, err error) {
	switch {
	case errors.Is(err, domain.ErrNotFound):
		c.JSON(http.StatusNotFound, response.Fail(err.Error()))
	case errors.Is(err, domain.ErrForbidden):
		c.JSON(http.StatusForbidden, response.Fail(err.Error()))
	case errors.Is(err, domain.ErrBadRequest):
		c.JSON(http.StatusBadRequest, response.Fail(err.Error()))
	default:
		c.JSON(http.StatusInternalServerError, response.Fail("internal server error"))
	}
}
