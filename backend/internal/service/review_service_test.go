package service_test

import (
	"booking-app/internal/domain"
	"booking-app/internal/service"
	"context"
	"errors"
	"testing"
	"time"
)

// --- Mock ReviewRepository ---

type mockReviewRepo struct {
	createReviewFn                func(ctx context.Context, r *domain.Review) (*domain.Review, error)
	getReviewByIDFn               func(ctx context.Context, id int) (*domain.Review, error)
	getReviewByBookingIDFn        func(ctx context.Context, bookingID int) (*domain.Review, error)
	listReviewsByHotelFn          func(ctx context.Context, hotelID, page, limit int) ([]*domain.Review, int, error)
	updateReviewFn                func(ctx context.Context, r *domain.Review) (*domain.Review, error)
	deleteReviewFn                func(ctx context.Context, id int) error
	hasConfirmedBookingAtHotelFn  func(ctx context.Context, userID string, hotelID int) (bool, error)
}

func (m *mockReviewRepo) CreateReview(ctx context.Context, r *domain.Review) (*domain.Review, error) {
	return m.createReviewFn(ctx, r)
}

func (m *mockReviewRepo) GetReviewByID(ctx context.Context, id int) (*domain.Review, error) {
	return m.getReviewByIDFn(ctx, id)
}

func (m *mockReviewRepo) GetReviewByBookingID(ctx context.Context, bookingID int) (*domain.Review, error) {
	return m.getReviewByBookingIDFn(ctx, bookingID)
}

func (m *mockReviewRepo) ListReviewsByHotel(ctx context.Context, hotelID, page, limit int) ([]*domain.Review, int, error) {
	return m.listReviewsByHotelFn(ctx, hotelID, page, limit)
}

func (m *mockReviewRepo) UpdateReview(ctx context.Context, r *domain.Review) (*domain.Review, error) {
	return m.updateReviewFn(ctx, r)
}

func (m *mockReviewRepo) DeleteReview(ctx context.Context, id int) error {
	return m.deleteReviewFn(ctx, id)
}

func (m *mockReviewRepo) HasConfirmedBookingAtHotel(ctx context.Context, userID string, hotelID int) (bool, error) {
	return m.hasConfirmedBookingAtHotelFn(ctx, userID, hotelID)
}

// --- Helpers ---

func makeReviewRepo(overrides mockReviewRepo) *mockReviewRepo {
	defaults := &mockReviewRepo{
		createReviewFn: func(ctx context.Context, r *domain.Review) (*domain.Review, error) {
			result := *r
			result.ID = 1
			result.CreatedAt = time.Now()
			result.UpdatedAt = time.Now()
			return &result, nil
		},
		getReviewByIDFn: func(ctx context.Context, id int) (*domain.Review, error) {
			return &domain.Review{ID: id, UserID: "user-1", HotelID: 10, BookingID: 5, Rating: 4}, nil
		},
		getReviewByBookingIDFn: func(ctx context.Context, bookingID int) (*domain.Review, error) {
			return nil, domain.ErrNotFound
		},
		listReviewsByHotelFn: func(ctx context.Context, hotelID, page, limit int) ([]*domain.Review, int, error) {
			return []*domain.Review{}, 0, nil
		},
		updateReviewFn: func(ctx context.Context, r *domain.Review) (*domain.Review, error) {
			result := *r
			return &result, nil
		},
		deleteReviewFn: func(ctx context.Context, id int) error {
			return nil
		},
		hasConfirmedBookingAtHotelFn: func(ctx context.Context, userID string, hotelID int) (bool, error) {
			return true, nil
		},
	}
	if overrides.createReviewFn != nil {
		defaults.createReviewFn = overrides.createReviewFn
	}
	if overrides.getReviewByIDFn != nil {
		defaults.getReviewByIDFn = overrides.getReviewByIDFn
	}
	if overrides.getReviewByBookingIDFn != nil {
		defaults.getReviewByBookingIDFn = overrides.getReviewByBookingIDFn
	}
	if overrides.listReviewsByHotelFn != nil {
		defaults.listReviewsByHotelFn = overrides.listReviewsByHotelFn
	}
	if overrides.updateReviewFn != nil {
		defaults.updateReviewFn = overrides.updateReviewFn
	}
	if overrides.deleteReviewFn != nil {
		defaults.deleteReviewFn = overrides.deleteReviewFn
	}
	if overrides.hasConfirmedBookingAtHotelFn != nil {
		defaults.hasConfirmedBookingAtHotelFn = overrides.hasConfirmedBookingAtHotelFn
	}
	return defaults
}

// --- Tests: CreateReview ---

func TestReviewService_CreateReview_Success(t *testing.T) {
	repo := makeReviewRepo(mockReviewRepo{})
	svc := service.NewReviewService(repo)

	input := service.CreateReviewInput{BookingID: 5, Rating: 4, Title: "Great stay", Comment: "Loved it"}
	review, err := svc.CreateReview(context.Background(), "user-1", 10, input)

	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if review.ID == 0 {
		t.Error("expected non-zero ID after creation")
	}
	if review.Rating != 4 {
		t.Errorf("expected rating 4, got %d", review.Rating)
	}
	if review.UserID != "user-1" {
		t.Errorf("expected userID %q, got %q", "user-1", review.UserID)
	}
	if review.HotelID != 10 {
		t.Errorf("expected hotelID 10, got %d", review.HotelID)
	}
}

func TestReviewService_CreateReview_NoConfirmedBooking(t *testing.T) {
	repo := makeReviewRepo(mockReviewRepo{
		hasConfirmedBookingAtHotelFn: func(ctx context.Context, userID string, hotelID int) (bool, error) {
			return false, nil
		},
	})
	svc := service.NewReviewService(repo)

	_, err := svc.CreateReview(context.Background(), "user-1", 10, service.CreateReviewInput{BookingID: 5, Rating: 3})

	if !errors.Is(err, domain.ErrForbidden) {
		t.Errorf("expected ErrForbidden when no confirmed booking, got %v", err)
	}
}

func TestReviewService_CreateReview_EligibilityCheckError(t *testing.T) {
	repo := makeReviewRepo(mockReviewRepo{
		hasConfirmedBookingAtHotelFn: func(ctx context.Context, userID string, hotelID int) (bool, error) {
			return false, domain.ErrInternal
		},
	})
	svc := service.NewReviewService(repo)

	_, err := svc.CreateReview(context.Background(), "user-1", 10, service.CreateReviewInput{BookingID: 5, Rating: 3})

	if err == nil {
		t.Error("expected error from eligibility check, got nil")
	}
}

func TestReviewService_CreateReview_DuplicateBookingReview(t *testing.T) {
	repo := makeReviewRepo(mockReviewRepo{
		// booking 5 already has a review
		getReviewByBookingIDFn: func(ctx context.Context, bookingID int) (*domain.Review, error) {
			return &domain.Review{ID: 99, BookingID: bookingID}, nil
		},
	})
	svc := service.NewReviewService(repo)

	_, err := svc.CreateReview(context.Background(), "user-1", 10, service.CreateReviewInput{BookingID: 5, Rating: 3})

	if !errors.Is(err, domain.ErrConflict) {
		t.Errorf("expected ErrConflict for duplicate booking review, got %v", err)
	}
}

func TestReviewService_CreateReview_InvalidRating(t *testing.T) {
	repo := makeReviewRepo(mockReviewRepo{})
	svc := service.NewReviewService(repo)

	_, err := svc.CreateReview(context.Background(), "user-1", 10, service.CreateReviewInput{BookingID: 5, Rating: 6})

	if !errors.Is(err, domain.ErrBadRequest) {
		t.Errorf("expected ErrBadRequest for rating 6, got %v", err)
	}
}

func TestReviewService_CreateReview_RatingZeroInvalid(t *testing.T) {
	repo := makeReviewRepo(mockReviewRepo{})
	svc := service.NewReviewService(repo)

	_, err := svc.CreateReview(context.Background(), "user-1", 10, service.CreateReviewInput{BookingID: 5, Rating: 0})

	if !errors.Is(err, domain.ErrBadRequest) {
		t.Errorf("expected ErrBadRequest for rating 0, got %v", err)
	}
}

func TestReviewService_CreateReview_MissingBookingID(t *testing.T) {
	repo := makeReviewRepo(mockReviewRepo{})
	svc := service.NewReviewService(repo)

	_, err := svc.CreateReview(context.Background(), "user-1", 10, service.CreateReviewInput{Rating: 4})

	if !errors.Is(err, domain.ErrBadRequest) {
		t.Errorf("expected ErrBadRequest for missing booking ID, got %v", err)
	}
}

// --- Tests: ListReviewsByHotel ---

func TestReviewService_ListReviewsByHotel_ReturnsPaginated(t *testing.T) {
	reviews := []*domain.Review{
		{ID: 1, HotelID: 10, Rating: 5},
		{ID: 2, HotelID: 10, Rating: 4},
	}
	repo := makeReviewRepo(mockReviewRepo{
		listReviewsByHotelFn: func(ctx context.Context, hotelID, page, limit int) ([]*domain.Review, int, error) {
			return reviews, 2, nil
		},
	})
	svc := service.NewReviewService(repo)

	result, total, err := svc.ListReviewsByHotel(context.Background(), 10, 1, 20)

	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if len(result) != 2 {
		t.Errorf("expected 2 reviews, got %d", len(result))
	}
	if total != 2 {
		t.Errorf("expected total 2, got %d", total)
	}
}

func TestReviewService_ListReviewsByHotel_DefaultPagination(t *testing.T) {
	capturedPage, capturedLimit := 0, 0
	repo := makeReviewRepo(mockReviewRepo{
		listReviewsByHotelFn: func(ctx context.Context, hotelID, page, limit int) ([]*domain.Review, int, error) {
			capturedPage = page
			capturedLimit = limit
			return []*domain.Review{}, 0, nil
		},
	})
	svc := service.NewReviewService(repo)
	svc.ListReviewsByHotel(context.Background(), 10, 0, 0)

	if capturedPage != 1 {
		t.Errorf("expected default page 1, got %d", capturedPage)
	}
	if capturedLimit != 20 {
		t.Errorf("expected default limit 20, got %d", capturedLimit)
	}
}

// --- Tests: UpdateReview ---

func TestReviewService_UpdateReview_Success(t *testing.T) {
	existing := &domain.Review{ID: 1, UserID: "user-1", HotelID: 10, BookingID: 5, Rating: 3}
	repo := makeReviewRepo(mockReviewRepo{
		getReviewByIDFn: func(ctx context.Context, id int) (*domain.Review, error) {
			return existing, nil
		},
		updateReviewFn: func(ctx context.Context, r *domain.Review) (*domain.Review, error) {
			result := *r
			return &result, nil
		},
	})
	svc := service.NewReviewService(repo)

	input := service.UpdateReviewInput{Rating: 5, Title: "Amazing!", Comment: "Best hotel ever"}
	result, err := svc.UpdateReview(context.Background(), 1, "user-1", input)

	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if result.Rating != 5 {
		t.Errorf("expected rating 5, got %d", result.Rating)
	}
	if result.Title != "Amazing!" {
		t.Errorf("expected title %q, got %q", "Amazing!", result.Title)
	}
}

func TestReviewService_UpdateReview_RejectsNonOwner(t *testing.T) {
	existing := &domain.Review{ID: 1, UserID: "real-owner"}
	repo := makeReviewRepo(mockReviewRepo{
		getReviewByIDFn: func(ctx context.Context, id int) (*domain.Review, error) {
			return existing, nil
		},
	})
	svc := service.NewReviewService(repo)

	_, err := svc.UpdateReview(context.Background(), 1, "different-user", service.UpdateReviewInput{Rating: 5})

	if !errors.Is(err, domain.ErrForbidden) {
		t.Errorf("expected ErrForbidden for non-owner update, got %v", err)
	}
}

func TestReviewService_UpdateReview_NotFound(t *testing.T) {
	repo := makeReviewRepo(mockReviewRepo{
		getReviewByIDFn: func(ctx context.Context, id int) (*domain.Review, error) {
			return nil, domain.ErrNotFound
		},
	})
	svc := service.NewReviewService(repo)

	_, err := svc.UpdateReview(context.Background(), 999, "user-1", service.UpdateReviewInput{Rating: 4})

	if !errors.Is(err, domain.ErrNotFound) {
		t.Errorf("expected ErrNotFound, got %v", err)
	}
}

func TestReviewService_UpdateReview_InvalidRating(t *testing.T) {
	repo := makeReviewRepo(mockReviewRepo{})
	svc := service.NewReviewService(repo)

	_, err := svc.UpdateReview(context.Background(), 1, "user-1", service.UpdateReviewInput{Rating: 0})

	if !errors.Is(err, domain.ErrBadRequest) {
		t.Errorf("expected ErrBadRequest for invalid rating, got %v", err)
	}
}

// --- Tests: DeleteReview ---

func TestReviewService_DeleteReview_SuccessAsOwner(t *testing.T) {
	existing := &domain.Review{ID: 1, UserID: "user-1"}
	repo := makeReviewRepo(mockReviewRepo{
		getReviewByIDFn: func(ctx context.Context, id int) (*domain.Review, error) {
			return existing, nil
		},
	})
	svc := service.NewReviewService(repo)

	err := svc.DeleteReview(context.Background(), 1, "user-1", string(domain.RoleGuest))

	if err != nil {
		t.Fatalf("expected no error for owner delete, got %v", err)
	}
}

func TestReviewService_DeleteReview_SuccessAsAdmin(t *testing.T) {
	existing := &domain.Review{ID: 1, UserID: "some-user"}
	repo := makeReviewRepo(mockReviewRepo{
		getReviewByIDFn: func(ctx context.Context, id int) (*domain.Review, error) {
			return existing, nil
		},
	})
	svc := service.NewReviewService(repo)

	err := svc.DeleteReview(context.Background(), 1, "admin-id", string(domain.RoleAdmin))

	if err != nil {
		t.Fatalf("expected no error for admin delete, got %v", err)
	}
}

func TestReviewService_DeleteReview_RejectsOtherGuest(t *testing.T) {
	existing := &domain.Review{ID: 1, UserID: "owner-user"}
	repo := makeReviewRepo(mockReviewRepo{
		getReviewByIDFn: func(ctx context.Context, id int) (*domain.Review, error) {
			return existing, nil
		},
	})
	svc := service.NewReviewService(repo)

	err := svc.DeleteReview(context.Background(), 1, "other-guest", string(domain.RoleGuest))

	if !errors.Is(err, domain.ErrForbidden) {
		t.Errorf("expected ErrForbidden for non-owner, non-admin delete, got %v", err)
	}
}

func TestReviewService_DeleteReview_NotFound(t *testing.T) {
	repo := makeReviewRepo(mockReviewRepo{
		getReviewByIDFn: func(ctx context.Context, id int) (*domain.Review, error) {
			return nil, domain.ErrNotFound
		},
	})
	svc := service.NewReviewService(repo)

	err := svc.DeleteReview(context.Background(), 999, "user-1", string(domain.RoleGuest))

	if !errors.Is(err, domain.ErrNotFound) {
		t.Errorf("expected ErrNotFound, got %v", err)
	}
}
