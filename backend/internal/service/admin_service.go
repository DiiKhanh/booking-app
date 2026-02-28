package service

import (
	"booking-app/internal/domain"
	"booking-app/internal/repository"
	"context"
	"fmt"
)

// AdminServiceInterface defines admin-only business operations.
type AdminServiceInterface interface {
	ListUsers(ctx context.Context, page, limit int) ([]*domain.User, int, error)
	GetUser(ctx context.Context, id string) (*domain.User, error)
	UpdateUserRole(ctx context.Context, id string, role domain.Role) error
	DeactivateUser(ctx context.Context, id string) error
	ListAllBookings(ctx context.Context, page, limit int) ([]*domain.Booking, int, error)
	ListDLQEvents(ctx context.Context, page, limit int) ([]*domain.OutboxEvent, int, error)
	RetryDLQEvent(ctx context.Context, id string) error
}

// AdminService implements AdminServiceInterface.
type AdminService struct {
	userRepo    repository.UserRepository
	bookingRepo repository.BookingRepository
	outboxRepo  repository.OutboxRepository
}

// dlqMaxRetries is the retry threshold that marks an event as dead-lettered.
const dlqMaxRetries = 5

// NewAdminService creates a new AdminService with the required repositories.
func NewAdminService(
	userRepo repository.UserRepository,
	bookingRepo repository.BookingRepository,
	outboxRepo repository.OutboxRepository,
) *AdminService {
	return &AdminService{
		userRepo:    userRepo,
		bookingRepo: bookingRepo,
		outboxRepo:  outboxRepo,
	}
}

// ListUsers returns a paginated list of all users, newest first.
func (s *AdminService) ListUsers(ctx context.Context, page, limit int) ([]*domain.User, int, error) {
	page, limit = normalizePagination(page, limit)
	return s.userRepo.ListUsers(ctx, page, limit)
}

// GetUser returns a single user by ID, or ErrNotFound if not found.
func (s *AdminService) GetUser(ctx context.Context, id string) (*domain.User, error) {
	return s.userRepo.FindUserByID(ctx, id)
}

// UpdateUserRole updates the role of a user. Returns ErrBadRequest for invalid roles.
func (s *AdminService) UpdateUserRole(ctx context.Context, id string, role domain.Role) error {
	switch role {
	case domain.RoleGuest, domain.RoleOwner, domain.RoleAdmin:
		// valid
	default:
		return fmt.Errorf("invalid role %q: must be one of guest, owner, admin: %w", role, domain.ErrBadRequest)
	}
	return s.userRepo.UpdateUserRole(ctx, id, role)
}

// DeactivateUser sets a user as inactive. Returns ErrNotFound if the user does not exist.
func (s *AdminService) DeactivateUser(ctx context.Context, id string) error {
	_, err := s.userRepo.FindUserByID(ctx, id)
	if err != nil {
		return err
	}
	return s.userRepo.DeactivateUser(ctx, id)
}

// ListAllBookings returns a paginated list of all bookings across all users.
func (s *AdminService) ListAllBookings(ctx context.Context, page, limit int) ([]*domain.Booking, int, error) {
	page, limit = normalizePagination(page, limit)
	return s.bookingRepo.ListAllBookings(ctx, page, limit)
}

// ListDLQEvents returns outbox events that have exceeded the retry threshold.
func (s *AdminService) ListDLQEvents(ctx context.Context, page, limit int) ([]*domain.OutboxEvent, int, error) {
	page, limit = normalizePagination(page, limit)
	return s.outboxRepo.ListDLQEvents(ctx, dlqMaxRetries, page, limit)
}

// RetryDLQEvent resets the retry count for a dead-lettered event so it is republished.
func (s *AdminService) RetryDLQEvent(ctx context.Context, id string) error {
	return s.outboxRepo.ResetDLQEvent(ctx, id)
}
