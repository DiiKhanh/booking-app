package service

import (
	"booking-app/internal/domain"
	"booking-app/internal/repository"
	"context"
	"fmt"
)

// CreateHotelInput holds the data needed to create a new hotel.
type CreateHotelInput struct {
	Name        string
	Location    string
	Address     string
	City        string
	Country     string
	Latitude    float64
	Longitude   float64
	Amenities   []string
	Images      []string
	StarRating  int
	Description string
}

// UpdateHotelInput holds the data for updating an existing hotel.
type UpdateHotelInput struct {
	Name        string
	Location    string
	Address     string
	City        string
	Country     string
	Latitude    float64
	Longitude   float64
	Amenities   []string
	Images      []string
	StarRating  int
	Description string
}

// HotelServiceInterface defines the contract for hotel business logic.
// Declared here so it can be imported by the handler package.
type HotelServiceInterface interface {
	CreateHotel(ctx context.Context, ownerID string, input CreateHotelInput) (*domain.Hotel, error)
	GetHotelByID(ctx context.Context, id int) (*domain.Hotel, error)
	ListApprovedHotels(ctx context.Context, page, limit int) ([]*domain.Hotel, int, error)
	ListHotelsByOwner(ctx context.Context, ownerID string, page, limit int) ([]*domain.Hotel, int, error)
	ListPendingHotels(ctx context.Context, page, limit int) ([]*domain.Hotel, int, error)
	UpdateHotel(ctx context.Context, id int, ownerID string, input UpdateHotelInput) (*domain.Hotel, error)
	DeleteHotel(ctx context.Context, id int, ownerID string) error
	ApproveHotel(ctx context.Context, id int) error
	RejectHotel(ctx context.Context, id int) error
}

// HotelService implements HotelServiceInterface.
type HotelService struct {
	repo repository.HotelRepository
}

// NewHotelService creates a new HotelService.
func NewHotelService(repo repository.HotelRepository) *HotelService {
	return &HotelService{repo: repo}
}

// CreateHotel validates input, sets owner and pending status, then persists.
func (s *HotelService) CreateHotel(ctx context.Context, ownerID string, input CreateHotelInput) (*domain.Hotel, error) {
	if ownerID == "" {
		return nil, fmt.Errorf("ownerID is required: %w", domain.ErrBadRequest)
	}
	if input.Name == "" {
		return nil, fmt.Errorf("hotel name is required: %w", domain.ErrBadRequest)
	}
	if input.StarRating < 0 || input.StarRating > 5 {
		return nil, fmt.Errorf("star_rating must be between 0 and 5: %w", domain.ErrBadRequest)
	}

	hotel := &domain.Hotel{
		OwnerID:     ownerID,
		Name:        input.Name,
		Location:    input.Location,
		Address:     input.Address,
		City:        input.City,
		Country:     input.Country,
		Latitude:    input.Latitude,
		Longitude:   input.Longitude,
		Amenities:   input.Amenities,
		Images:      input.Images,
		StarRating:  input.StarRating,
		Status:      domain.HotelStatusPending,
		Description: input.Description,
	}

	return s.repo.CreateHotel(ctx, hotel)
}

// GetHotelByID returns a hotel by its ID.
func (s *HotelService) GetHotelByID(ctx context.Context, id int) (*domain.Hotel, error) {
	return s.repo.GetHotelByID(ctx, id)
}

// ListApprovedHotels returns a paginated list of approved hotels.
func (s *HotelService) ListApprovedHotels(ctx context.Context, page, limit int) ([]*domain.Hotel, int, error) {
	page, limit = normalizePagination(page, limit)
	return s.repo.ListApprovedHotels(ctx, page, limit)
}

// ListHotelsByOwner returns hotels belonging to a specific owner.
func (s *HotelService) ListHotelsByOwner(ctx context.Context, ownerID string, page, limit int) ([]*domain.Hotel, int, error) {
	page, limit = normalizePagination(page, limit)
	return s.repo.ListHotelsByOwner(ctx, ownerID, page, limit)
}

// ListPendingHotels returns hotels awaiting admin approval.
func (s *HotelService) ListPendingHotels(ctx context.Context, page, limit int) ([]*domain.Hotel, int, error) {
	page, limit = normalizePagination(page, limit)
	return s.repo.ListPendingHotels(ctx, page, limit)
}

// UpdateHotel updates a hotel only if the caller is the owner.
func (s *HotelService) UpdateHotel(ctx context.Context, id int, ownerID string, input UpdateHotelInput) (*domain.Hotel, error) {
	existing, err := s.repo.GetHotelByID(ctx, id)
	if err != nil {
		return nil, err
	}

	if existing.OwnerID != ownerID {
		return nil, fmt.Errorf("caller does not own this hotel: %w", domain.ErrUnauthorized)
	}

	updated := &domain.Hotel{
		ID:          existing.ID,
		OwnerID:     existing.OwnerID,
		Status:      existing.Status,
		CreatedAt:   existing.CreatedAt,
		Name:        input.Name,
		Location:    input.Location,
		Address:     input.Address,
		City:        input.City,
		Country:     input.Country,
		Latitude:    input.Latitude,
		Longitude:   input.Longitude,
		Amenities:   input.Amenities,
		Images:      input.Images,
		StarRating:  input.StarRating,
		Description: input.Description,
	}

	return s.repo.UpdateHotel(ctx, updated)
}

// DeleteHotel removes a hotel, delegating ownership check to the repository.
func (s *HotelService) DeleteHotel(ctx context.Context, id int, ownerID string) error {
	return s.repo.DeleteHotel(ctx, id, ownerID)
}

// ApproveHotel sets hotel status to approved (admin operation).
func (s *HotelService) ApproveHotel(ctx context.Context, id int) error {
	hotel, err := s.repo.GetHotelByID(ctx, id)
	if err != nil {
		return err
	}

	if hotel.Status == domain.HotelStatusApproved {
		return fmt.Errorf("hotel is already approved: %w", domain.ErrConflict)
	}

	return s.repo.UpdateHotelStatus(ctx, id, domain.HotelStatusApproved)
}

// RejectHotel sets hotel status to rejected (admin operation).
func (s *HotelService) RejectHotel(ctx context.Context, id int) error {
	hotel, err := s.repo.GetHotelByID(ctx, id)
	if err != nil {
		return err
	}

	if hotel.Status == domain.HotelStatusRejected {
		return fmt.Errorf("hotel is already rejected: %w", domain.ErrConflict)
	}

	return s.repo.UpdateHotelStatus(ctx, id, domain.HotelStatusRejected)
}

// normalizePagination ensures page >= 1 and 1 <= limit <= 100.
func normalizePagination(page, limit int) (int, int) {
	if page < 1 {
		page = 1
	}
	if limit < 1 {
		limit = 20
	}
	if limit > 100 {
		limit = 100
	}
	return page, limit
}
