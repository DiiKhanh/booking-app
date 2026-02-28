package repository

import (
	"booking-app/internal/domain"
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
)

// NotificationRepo handles all database operations for notifications.
type NotificationRepo struct {
	db *sql.DB
}

// NewNotificationRepo creates a new NotificationRepo.
func NewNotificationRepo(db *sql.DB) *NotificationRepo {
	return &NotificationRepo{db: db}
}

// Create inserts a notification and returns it with the generated id and created_at.
func (r *NotificationRepo) Create(ctx context.Context, n *domain.Notification) (*domain.Notification, error) {
	var dataJSON []byte
	if n.Data != nil {
		var err error
		dataJSON, err = json.Marshal(n.Data)
		if err != nil {
			return nil, fmt.Errorf("marshal notification data: %w", err)
		}
	}

	result := *n
	err := r.db.QueryRowContext(ctx, `
		INSERT INTO notifications (user_id, type, title, message, data, is_read)
		VALUES ($1, $2, $3, $4, $5, false)
		RETURNING id, created_at
	`, n.UserID, string(n.Type), n.Title, n.Message, dataJSON).
		Scan(&result.ID, &result.CreatedAt)
	if err != nil {
		return nil, fmt.Errorf("insert notification: %w", err)
	}

	return &result, nil
}

// ListByUser returns paginated notifications for a user, newest first.
func (r *NotificationRepo) ListByUser(ctx context.Context, userID string, page, limit int) ([]*domain.Notification, int, error) {
	offset := (page - 1) * limit

	var total int
	if err := r.db.QueryRowContext(ctx,
		`SELECT COUNT(*) FROM notifications WHERE user_id = $1`, userID,
	).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("count notifications by user: %w", err)
	}

	rows, err := r.db.QueryContext(ctx, `
		SELECT id, user_id, type, title, message, data, is_read, created_at
		FROM notifications
		WHERE user_id = $1
		ORDER BY created_at DESC
		LIMIT $2 OFFSET $3
	`, userID, limit, offset)
	if err != nil {
		return nil, 0, fmt.Errorf("list notifications by user: %w", err)
	}
	defer rows.Close()

	notifications, err := scanNotificationRows(rows)
	if err != nil {
		return nil, 0, err
	}

	return notifications, total, nil
}

// GetUnreadCount returns the count of unread notifications for a user.
func (r *NotificationRepo) GetUnreadCount(ctx context.Context, userID string) (int, error) {
	var count int
	err := r.db.QueryRowContext(ctx,
		`SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = false`,
		userID,
	).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("get unread notification count: %w", err)
	}
	return count, nil
}

// MarkRead sets is_read=true for a specific notification owned by the given user.
// Returns ErrNotFound if no matching row exists.
func (r *NotificationRepo) MarkRead(ctx context.Context, id int64, userID string) error {
	result, err := r.db.ExecContext(ctx,
		`UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2`,
		id, userID,
	)
	if err != nil {
		return fmt.Errorf("mark notification read: %w", err)
	}

	affected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("get rows affected for mark read: %w", err)
	}
	if affected == 0 {
		return fmt.Errorf("notification not found: %w", domain.ErrNotFound)
	}
	return nil
}

// MarkAllRead sets is_read=true for all unread notifications belonging to userID.
func (r *NotificationRepo) MarkAllRead(ctx context.Context, userID string) error {
	_, err := r.db.ExecContext(ctx,
		`UPDATE notifications SET is_read = true WHERE user_id = $1 AND is_read = false`,
		userID,
	)
	if err != nil {
		return fmt.Errorf("mark all notifications read: %w", err)
	}
	return nil
}

// scanNotificationRows scans multiple notification rows into a slice.
func scanNotificationRows(rows *sql.Rows) ([]*domain.Notification, error) {
	var notifications []*domain.Notification

	for rows.Next() {
		n := &domain.Notification{}
		var dataJSON []byte

		if err := rows.Scan(
			&n.ID, &n.UserID, &n.Type, &n.Title, &n.Message,
			&dataJSON, &n.IsRead, &n.CreatedAt,
		); err != nil {
			return nil, fmt.Errorf("scan notification row: %w", err)
		}

		if len(dataJSON) > 0 {
			var data map[string]any
			if err := json.Unmarshal(dataJSON, &data); err != nil {
				return nil, fmt.Errorf("unmarshal notification data: %w", err)
			}
			n.Data = data
		}

		notifications = append(notifications, n)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate notification rows: %w", err)
	}

	if notifications == nil {
		notifications = []*domain.Notification{}
	}

	return notifications, nil
}
