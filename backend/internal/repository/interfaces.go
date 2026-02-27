package repository

import (
	"booking-app/internal/domain"
	"context"
	"time"
)

// BookingRepository defines data access operations for bookings.
type BookingRepository interface {
	CreateBooking(ctx context.Context, booking *domain.Booking) error
	InitializeInventory(ctx context.Context, roomID int, startDate time.Time, days int, total int) error
}

// UserRepository defines data access operations for users.
type UserRepository interface {
	CreateUser(ctx context.Context, user *domain.User) error
	FindUserByEmail(ctx context.Context, email string) (*domain.User, error)
	FindUserByID(ctx context.Context, id string) (*domain.User, error)
}

// TokenRepository defines data access operations for refresh tokens.
type TokenRepository interface {
	CreateRefreshToken(ctx context.Context, token *domain.RefreshToken) error
	FindRefreshTokenByHash(ctx context.Context, tokenHash string) (*domain.RefreshToken, error)
	RevokeRefreshToken(ctx context.Context, tokenID string, revokedAt time.Time) error
	RevokeAllUserTokens(ctx context.Context, userID string, revokedAt time.Time) error
}
