package response

import (
	"booking-app/internal/domain"
	"time"
)

// NotificationResponse is the API representation of a notification.
type NotificationResponse struct {
	ID        int64          `json:"id"`
	UserID    string         `json:"user_id"`
	Type      string         `json:"type"`
	Title     string         `json:"title"`
	Message   string         `json:"message"`
	Data      map[string]any `json:"data,omitempty"`
	IsRead    bool           `json:"is_read"`
	CreatedAt time.Time      `json:"created_at"`
}

// UnreadCountResponse carries the unread notification count.
type UnreadCountResponse struct {
	Count int `json:"count"`
}

// NewNotificationResponse maps a domain.Notification to its API representation.
func NewNotificationResponse(n *domain.Notification) *NotificationResponse {
	return &NotificationResponse{
		ID:        n.ID,
		UserID:    n.UserID,
		Type:      string(n.Type),
		Title:     n.Title,
		Message:   n.Message,
		Data:      n.Data,
		IsRead:    n.IsRead,
		CreatedAt: n.CreatedAt,
	}
}

// NewNotificationListResponse maps a slice of domain notifications to their API representations.
func NewNotificationListResponse(ns []*domain.Notification) []*NotificationResponse {
	out := make([]*NotificationResponse, len(ns))
	for i, n := range ns {
		out[i] = NewNotificationResponse(n)
	}
	return out
}
