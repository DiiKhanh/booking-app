package repository

import (
	"booking-app/internal/domain"
	"context"
	"time"
)

// PaymentRepository defines data access operations for payments.
type PaymentRepository interface {
	CreatePayment(ctx context.Context, payment *domain.Payment) (*domain.Payment, error)
	GetPaymentByID(ctx context.Context, id string) (*domain.Payment, error)
	GetPaymentByBookingID(ctx context.Context, bookingID int) (*domain.Payment, error)
	UpdatePaymentStatus(ctx context.Context, id string, status domain.PaymentStatus, gatewayRef, failedReason string) error
	GetPaymentByIdempotencyKey(ctx context.Context, key string) (*domain.Payment, error)
}

// OutboxRepository defines operations for the transactional outbox pattern.
type OutboxRepository interface {
	CreateEvent(ctx context.Context, event *domain.OutboxEvent) error
	ListUnpublishedEvents(ctx context.Context, limit int) ([]*domain.OutboxEvent, error)
	MarkPublished(ctx context.Context, id string, publishedAt time.Time) error
	IncrementRetry(ctx context.Context, id string) error
	IsEventProcessed(ctx context.Context, eventID string) (bool, error)
	MarkProcessed(ctx context.Context, eventID string) error
	// Admin DLQ operations
	ListDLQEvents(ctx context.Context, maxRetries, page, limit int) ([]*domain.OutboxEvent, int, error)
	ResetDLQEvent(ctx context.Context, id string) error
}

// BookingRepository defines data access operations for bookings.
type BookingRepository interface {
	CreateBooking(ctx context.Context, booking *domain.Booking) error
	InitializeInventory(ctx context.Context, roomID int, startDate time.Time, days int, total int) error
	FindBookingByID(ctx context.Context, id int) (*domain.Booking, error)
	ListBookingsByUser(ctx context.Context, userID string, page, limit int) ([]*domain.Booking, int, error)
	UpdateBookingStatus(ctx context.Context, id int, status string) error
	CancelBooking(ctx context.Context, id int, userID string) error
	// Admin operations
	ListAllBookings(ctx context.Context, page, limit int) ([]*domain.Booking, int, error)
}

// UserRepository defines data access operations for users.
type UserRepository interface {
	CreateUser(ctx context.Context, user *domain.User) error
	FindUserByEmail(ctx context.Context, email string) (*domain.User, error)
	FindUserByID(ctx context.Context, id string) (*domain.User, error)
	// Admin operations
	ListUsers(ctx context.Context, page, limit int) ([]*domain.User, int, error)
	UpdateUserRole(ctx context.Context, id string, role domain.Role) error
	DeactivateUser(ctx context.Context, id string) error
}

// TokenRepository defines data access operations for refresh tokens.
type TokenRepository interface {
	CreateRefreshToken(ctx context.Context, token *domain.RefreshToken) error
	FindRefreshTokenByHash(ctx context.Context, tokenHash string) (*domain.RefreshToken, error)
	RevokeRefreshToken(ctx context.Context, tokenID string, revokedAt time.Time) error
	RevokeAllUserTokens(ctx context.Context, userID string, revokedAt time.Time) error
}

// HotelRepository defines data access operations for hotels.
type HotelRepository interface {
	CreateHotel(ctx context.Context, hotel *domain.Hotel) (*domain.Hotel, error)
	GetHotelByID(ctx context.Context, id int) (*domain.Hotel, error)
	ListApprovedHotels(ctx context.Context, page, limit int) ([]*domain.Hotel, int, error)
	ListHotelsByOwner(ctx context.Context, ownerID string, page, limit int) ([]*domain.Hotel, int, error)
	ListPendingHotels(ctx context.Context, page, limit int) ([]*domain.Hotel, int, error)
	UpdateHotel(ctx context.Context, hotel *domain.Hotel) (*domain.Hotel, error)
	UpdateHotelStatus(ctx context.Context, id int, status domain.HotelStatus) error
	DeleteHotel(ctx context.Context, id int, ownerID string) error
}

// RoomRepository defines data access operations for rooms.
type RoomRepository interface {
	CreateRoom(ctx context.Context, room *domain.Room) (*domain.Room, error)
	GetRoomByID(ctx context.Context, id int) (*domain.Room, error)
	ListRoomsByHotel(ctx context.Context, hotelID int) ([]*domain.Room, error)
	UpdateRoom(ctx context.Context, room *domain.Room) (*domain.Room, error)
	DeleteRoom(ctx context.Context, id int, hotelID int) error
}

// InventoryRepository defines data access operations for room inventory.
type InventoryRepository interface {
	SetInventory(ctx context.Context, roomID int, date time.Time, total int) error
	GetInventoryForRoom(ctx context.Context, roomID int, startDate, endDate time.Time) ([]*domain.Inventory, error)
	BulkSetInventory(ctx context.Context, roomID int, startDate time.Time, days, total int) error
}

// SearchRepository defines hotel search operations backed by Elasticsearch.
type SearchRepository interface {
	// IndexHotel upserts a single hotel document.
	IndexHotel(ctx context.Context, hotel *domain.Hotel) error
	// BulkIndexHotels upserts multiple hotel documents in one batch.
	BulkIndexHotels(ctx context.Context, hotels []*domain.Hotel) error
	// SearchHotels executes a geo + filter query and returns paginated results.
	SearchHotels(ctx context.Context, params domain.SearchParams) ([]*domain.Hotel, int, error)
	// DeleteHotel removes a hotel document from the index.
	DeleteHotel(ctx context.Context, id int) error
}

// NotificationRepository defines data access operations for notifications.
type NotificationRepository interface {
	Create(ctx context.Context, n *domain.Notification) (*domain.Notification, error)
	ListByUser(ctx context.Context, userID string, page, limit int) ([]*domain.Notification, int, error)
	GetUnreadCount(ctx context.Context, userID string) (int, error)
	MarkRead(ctx context.Context, id int64, userID string) error
	MarkAllRead(ctx context.Context, userID string) error
}

// ReviewRepository defines data access operations for hotel reviews.
type ReviewRepository interface {
	// CreateReview inserts a new review and updates hotel rating stats atomically.
	CreateReview(ctx context.Context, review *domain.Review) (*domain.Review, error)
	// GetReviewByID fetches a single review by its primary key.
	GetReviewByID(ctx context.Context, id int) (*domain.Review, error)
	// GetReviewByBookingID returns the review tied to a specific booking (or ErrNotFound).
	GetReviewByBookingID(ctx context.Context, bookingID int) (*domain.Review, error)
	// ListReviewsByHotel returns paginated reviews for a hotel, newest first.
	ListReviewsByHotel(ctx context.Context, hotelID, page, limit int) ([]*domain.Review, int, error)
	// UpdateReview replaces editable fields (rating, title, comment) and updates hotel stats.
	UpdateReview(ctx context.Context, review *domain.Review) (*domain.Review, error)
	// DeleteReview removes a review and recalculates hotel rating stats.
	DeleteReview(ctx context.Context, id int) error
	// HasConfirmedBookingAtHotel returns true when the user has at least one
	// confirmed booking for a room belonging to the given hotel.
	HasConfirmedBookingAtHotel(ctx context.Context, userID string, hotelID int) (bool, error)
}
