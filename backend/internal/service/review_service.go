package service

import (
	"booking-app/internal/domain"
	"booking-app/internal/repository"
	"context"
	"errors"
	"fmt"
)

// CreateReviewInput holds validated input for creating a review.
type CreateReviewInput struct {
	BookingID int
	Rating    int
	Title     string
	Comment   string
}

// UpdateReviewInput holds validated input for updating a review.
type UpdateReviewInput struct {
	Rating  int
	Title   string
	Comment string
}

// ReviewServiceInterface defines the contract for review business logic.
type ReviewServiceInterface interface {
	CreateReview(ctx context.Context, userID string, hotelID int, input CreateReviewInput) (*domain.Review, error)
	ListReviewsByHotel(ctx context.Context, hotelID, page, limit int) ([]*domain.Review, int, error)
	UpdateReview(ctx context.Context, id int, callerUserID string, input UpdateReviewInput) (*domain.Review, error)
	DeleteReview(ctx context.Context, id int, callerUserID, callerRole string) error
}

// ReviewService implements ReviewServiceInterface.
type ReviewService struct {
	repo repository.ReviewRepository
}

// NewReviewService creates a new ReviewService.
func NewReviewService(repo repository.ReviewRepository) *ReviewService {
	return &ReviewService{repo: repo}
}

// CreateReview validates input, checks booking eligibility and uniqueness, then persists.
func (s *ReviewService) CreateReview(ctx context.Context, userID string, hotelID int, input CreateReviewInput) (*domain.Review, error) {
	if input.BookingID <= 0 {
		return nil, fmt.Errorf("booking_id is required: %w", domain.ErrBadRequest)
	}
	if input.Rating < 1 || input.Rating > 5 {
		return nil, fmt.Errorf("rating must be between 1 and 5: %w", domain.ErrBadRequest)
	}

	// Guard: user must have a confirmed booking at the hotel.
	eligible, err := s.repo.HasConfirmedBookingAtHotel(ctx, userID, hotelID)
	if err != nil {
		return nil, fmt.Errorf("check booking eligibility: %w", err)
	}
	if !eligible {
		return nil, fmt.Errorf("no confirmed booking at this hotel: %w", domain.ErrForbidden)
	}

	// Guard: one review per booking.
	existing, err := s.repo.GetReviewByBookingID(ctx, input.BookingID)
	if err != nil && !errors.Is(err, domain.ErrNotFound) {
		return nil, fmt.Errorf("check booking review: %w", err)
	}
	if existing != nil {
		return nil, fmt.Errorf("booking already has a review: %w", domain.ErrConflict)
	}

	review := &domain.Review{
		UserID:    userID,
		HotelID:   hotelID,
		BookingID: input.BookingID,
		Rating:    input.Rating,
		Title:     input.Title,
		Comment:   input.Comment,
	}

	return s.repo.CreateReview(ctx, review)
}

// ListReviewsByHotel returns paginated reviews for a hotel.
func (s *ReviewService) ListReviewsByHotel(ctx context.Context, hotelID, page, limit int) ([]*domain.Review, int, error) {
	page, limit = normalizePagination(page, limit)
	return s.repo.ListReviewsByHotel(ctx, hotelID, page, limit)
}

// UpdateReview allows the review author to update rating, title, and comment.
func (s *ReviewService) UpdateReview(ctx context.Context, id int, callerUserID string, input UpdateReviewInput) (*domain.Review, error) {
	if input.Rating < 1 || input.Rating > 5 {
		return nil, fmt.Errorf("rating must be between 1 and 5: %w", domain.ErrBadRequest)
	}

	existing, err := s.repo.GetReviewByID(ctx, id)
	if err != nil {
		return nil, err
	}

	if existing.UserID != callerUserID {
		return nil, fmt.Errorf("review does not belong to caller: %w", domain.ErrForbidden)
	}

	updated := &domain.Review{
		ID:        existing.ID,
		UserID:    existing.UserID,
		HotelID:   existing.HotelID,
		BookingID: existing.BookingID,
		Rating:    input.Rating,
		Title:     input.Title,
		Comment:   input.Comment,
		CreatedAt: existing.CreatedAt,
	}

	return s.repo.UpdateReview(ctx, updated)
}

// DeleteReview allows the review author or an admin to delete a review.
func (s *ReviewService) DeleteReview(ctx context.Context, id int, callerUserID, callerRole string) error {
	existing, err := s.repo.GetReviewByID(ctx, id)
	if err != nil {
		return err
	}

	isAdmin := callerRole == string(domain.RoleAdmin)
	isOwner := existing.UserID == callerUserID

	if !isAdmin && !isOwner {
		return fmt.Errorf("caller is not the review author or an admin: %w", domain.ErrForbidden)
	}

	return s.repo.DeleteReview(ctx, id)
}

