package domain

import "time"

// NotificationType classifies what triggered the notification.
type NotificationType string

const (
	NotificationTypeBookingConfirmed NotificationType = "booking_confirmed"
	NotificationTypeBookingFailed    NotificationType = "booking_failed"
	NotificationTypeBookingCancelled NotificationType = "booking_cancelled"
	NotificationTypePaymentSucceeded NotificationType = "payment_succeeded"
	NotificationTypePaymentFailed    NotificationType = "payment_failed"
	NotificationTypePaymentTimedOut  NotificationType = "payment_timed_out"
)

// validNotificationTypes is the set of allowed notification types.
var validNotificationTypes = map[NotificationType]struct{}{
	NotificationTypeBookingConfirmed: {},
	NotificationTypeBookingFailed:    {},
	NotificationTypeBookingCancelled: {},
	NotificationTypePaymentSucceeded: {},
	NotificationTypePaymentFailed:    {},
	NotificationTypePaymentTimedOut:  {},
}

// IsValid reports whether the NotificationType is a recognised constant.
func (t NotificationType) IsValid() bool {
	_, ok := validNotificationTypes[t]
	return ok
}

// Notification represents a user notification.
type Notification struct {
	ID        int64            `json:"id"`
	UserID    string           `json:"user_id"`
	Type      NotificationType `json:"type"`
	Title     string           `json:"title"`
	Message   string           `json:"message"`
	Data      map[string]any   `json:"data,omitempty"`
	IsRead    bool             `json:"is_read"`
	CreatedAt time.Time        `json:"created_at"`
}
