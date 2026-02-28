package service

import (
	"booking-app/internal/domain"
	"booking-app/internal/repository"
	"context"
	"fmt"
)

// NotificationServiceInterface defines the contract for notification business logic.
type NotificationServiceInterface interface {
	CreateNotification(ctx context.Context, userID string, notifType domain.NotificationType, title, message string, data map[string]any) (*domain.Notification, error)
	ListNotifications(ctx context.Context, userID string, page, limit int) ([]*domain.Notification, int, error)
	GetUnreadCount(ctx context.Context, userID string) (int, error)
	MarkRead(ctx context.Context, id int64, userID string) error
	MarkAllRead(ctx context.Context, userID string) error
}

// NotificationService implements NotificationServiceInterface.
type NotificationService struct {
	repo repository.NotificationRepository
}

// NewNotificationService creates a new NotificationService.
func NewNotificationService(repo repository.NotificationRepository) *NotificationService {
	return &NotificationService{repo: repo}
}

// CreateNotification validates input and persists a new notification.
func (s *NotificationService) CreateNotification(ctx context.Context, userID string, notifType domain.NotificationType, title, message string, data map[string]any) (*domain.Notification, error) {
	if !notifType.IsValid() {
		return nil, fmt.Errorf("unknown notification type %q: %w", notifType, domain.ErrBadRequest)
	}
	if title == "" {
		return nil, fmt.Errorf("title is required: %w", domain.ErrBadRequest)
	}
	if message == "" {
		return nil, fmt.Errorf("message is required: %w", domain.ErrBadRequest)
	}

	n := &domain.Notification{
		UserID:  userID,
		Type:    notifType,
		Title:   title,
		Message: message,
		Data:    data,
	}

	return s.repo.Create(ctx, n)
}

// ListNotifications returns paginated notifications for the given user.
func (s *NotificationService) ListNotifications(ctx context.Context, userID string, page, limit int) ([]*domain.Notification, int, error) {
	page, limit = normalizePagination(page, limit)
	return s.repo.ListByUser(ctx, userID, page, limit)
}

// GetUnreadCount returns the number of unread notifications for the given user.
func (s *NotificationService) GetUnreadCount(ctx context.Context, userID string) (int, error) {
	return s.repo.GetUnreadCount(ctx, userID)
}

// MarkRead marks a single notification as read, scoped to the owning user.
func (s *NotificationService) MarkRead(ctx context.Context, id int64, userID string) error {
	if id <= 0 {
		return fmt.Errorf("notification id must be positive: %w", domain.ErrBadRequest)
	}
	return s.repo.MarkRead(ctx, id, userID)
}

// MarkAllRead marks all notifications for the given user as read.
func (s *NotificationService) MarkAllRead(ctx context.Context, userID string) error {
	return s.repo.MarkAllRead(ctx, userID)
}
