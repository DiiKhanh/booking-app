package service_test

import (
	"booking-app/internal/domain"
	"booking-app/internal/service"
	"context"
	"errors"
	"testing"
	"time"
)

// --- Mock HotelRepository ---

type mockHotelRepo struct {
	createHotelFn       func(ctx context.Context, hotel *domain.Hotel) (*domain.Hotel, error)
	getHotelByIDFn      func(ctx context.Context, id int) (*domain.Hotel, error)
	listApprovedFn      func(ctx context.Context, page, limit int) ([]*domain.Hotel, int, error)
	listByOwnerFn       func(ctx context.Context, ownerID string, page, limit int) ([]*domain.Hotel, int, error)
	listPendingFn       func(ctx context.Context, page, limit int) ([]*domain.Hotel, int, error)
	updateHotelFn       func(ctx context.Context, hotel *domain.Hotel) (*domain.Hotel, error)
	updateHotelStatusFn func(ctx context.Context, id int, status domain.HotelStatus) error
	deleteHotelFn       func(ctx context.Context, id int, ownerID string) error
}

func (m *mockHotelRepo) CreateHotel(ctx context.Context, hotel *domain.Hotel) (*domain.Hotel, error) {
	return m.createHotelFn(ctx, hotel)
}

func (m *mockHotelRepo) GetHotelByID(ctx context.Context, id int) (*domain.Hotel, error) {
	return m.getHotelByIDFn(ctx, id)
}

func (m *mockHotelRepo) ListApprovedHotels(ctx context.Context, page, limit int) ([]*domain.Hotel, int, error) {
	return m.listApprovedFn(ctx, page, limit)
}

func (m *mockHotelRepo) ListHotelsByOwner(ctx context.Context, ownerID string, page, limit int) ([]*domain.Hotel, int, error) {
	return m.listByOwnerFn(ctx, ownerID, page, limit)
}

func (m *mockHotelRepo) ListPendingHotels(ctx context.Context, page, limit int) ([]*domain.Hotel, int, error) {
	return m.listPendingFn(ctx, page, limit)
}

func (m *mockHotelRepo) UpdateHotel(ctx context.Context, hotel *domain.Hotel) (*domain.Hotel, error) {
	return m.updateHotelFn(ctx, hotel)
}

func (m *mockHotelRepo) UpdateHotelStatus(ctx context.Context, id int, status domain.HotelStatus) error {
	return m.updateHotelStatusFn(ctx, id, status)
}

func (m *mockHotelRepo) DeleteHotel(ctx context.Context, id int, ownerID string) error {
	return m.deleteHotelFn(ctx, id, ownerID)
}

// --- Tests: CreateHotel ---

func TestHotelService_CreateHotel_SetsOwnerAndPendingStatus(t *testing.T) {
	ownerID := "owner-uuid-123"
	repo := &mockHotelRepo{
		createHotelFn: func(ctx context.Context, hotel *domain.Hotel) (*domain.Hotel, error) {
			result := *hotel
			result.ID = 1
			result.CreatedAt = time.Now()
			result.UpdatedAt = time.Now()
			return &result, nil
		},
	}
	svc := service.NewHotelService(repo)

	input := service.CreateHotelInput{
		Name:       "Grand Hotel",
		Location:   "Downtown",
		Address:    "123 Main St",
		City:       "Hanoi",
		Country:    "Vietnam",
		StarRating: 4,
	}

	hotel, err := svc.CreateHotel(context.Background(), ownerID, input)

	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if hotel.OwnerID != ownerID {
		t.Errorf("expected OwnerID %q, got %q", ownerID, hotel.OwnerID)
	}
	if hotel.Status != domain.HotelStatusPending {
		t.Errorf("expected status %q, got %q", domain.HotelStatusPending, hotel.Status)
	}
	if hotel.ID == 0 {
		t.Error("expected non-zero ID after creation")
	}
}

func TestHotelService_CreateHotel_RequiresName(t *testing.T) {
	repo := &mockHotelRepo{}
	svc := service.NewHotelService(repo)

	_, err := svc.CreateHotel(context.Background(), "owner-id", service.CreateHotelInput{
		Location: "Downtown",
	})

	if !errors.Is(err, domain.ErrBadRequest) {
		t.Errorf("expected ErrBadRequest, got %v", err)
	}
}

func TestHotelService_CreateHotel_RequiresOwnerID(t *testing.T) {
	repo := &mockHotelRepo{}
	svc := service.NewHotelService(repo)

	_, err := svc.CreateHotel(context.Background(), "", service.CreateHotelInput{
		Name:     "Hotel",
		Location: "Loc",
	})

	if !errors.Is(err, domain.ErrBadRequest) {
		t.Errorf("expected ErrBadRequest, got %v", err)
	}
}

func TestHotelService_CreateHotel_InvalidStarRating(t *testing.T) {
	repo := &mockHotelRepo{}
	svc := service.NewHotelService(repo)

	_, err := svc.CreateHotel(context.Background(), "owner-id", service.CreateHotelInput{
		Name:       "Hotel",
		Location:   "Loc",
		StarRating: 6,
	})

	if !errors.Is(err, domain.ErrBadRequest) {
		t.Errorf("expected ErrBadRequest for rating 6, got %v", err)
	}
}

func TestHotelService_CreateHotel_PropagatesRepoError(t *testing.T) {
	repo := &mockHotelRepo{
		createHotelFn: func(ctx context.Context, hotel *domain.Hotel) (*domain.Hotel, error) {
			return nil, domain.ErrInternal
		},
	}
	svc := service.NewHotelService(repo)

	_, err := svc.CreateHotel(context.Background(), "owner-id", service.CreateHotelInput{
		Name:     "Hotel",
		Location: "Loc",
	})

	if err == nil {
		t.Error("expected error from repo, got nil")
	}
}

// --- Tests: GetHotelByID ---

func TestHotelService_GetHotelByID_ReturnsHotel(t *testing.T) {
	expected := &domain.Hotel{ID: 42, Name: "Test Hotel", Status: domain.HotelStatusApproved}
	repo := &mockHotelRepo{
		getHotelByIDFn: func(ctx context.Context, id int) (*domain.Hotel, error) {
			return expected, nil
		},
	}
	svc := service.NewHotelService(repo)

	hotel, err := svc.GetHotelByID(context.Background(), 42)

	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if hotel.ID != 42 {
		t.Errorf("expected ID 42, got %d", hotel.ID)
	}
}

func TestHotelService_GetHotelByID_NotFound(t *testing.T) {
	repo := &mockHotelRepo{
		getHotelByIDFn: func(ctx context.Context, id int) (*domain.Hotel, error) {
			return nil, domain.ErrNotFound
		},
	}
	svc := service.NewHotelService(repo)

	_, err := svc.GetHotelByID(context.Background(), 999)

	if !errors.Is(err, domain.ErrNotFound) {
		t.Errorf("expected ErrNotFound, got %v", err)
	}
}

// --- Tests: ListApprovedHotels ---

func TestHotelService_ListApprovedHotels_ReturnsPaginatedList(t *testing.T) {
	hotels := []*domain.Hotel{
		{ID: 1, Name: "Hotel A", Status: domain.HotelStatusApproved},
		{ID: 2, Name: "Hotel B", Status: domain.HotelStatusApproved},
	}
	repo := &mockHotelRepo{
		listApprovedFn: func(ctx context.Context, page, limit int) ([]*domain.Hotel, int, error) {
			return hotels, 2, nil
		},
	}
	svc := service.NewHotelService(repo)

	result, total, err := svc.ListApprovedHotels(context.Background(), 1, 20)

	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if len(result) != 2 {
		t.Errorf("expected 2 hotels, got %d", len(result))
	}
	if total != 2 {
		t.Errorf("expected total 2, got %d", total)
	}
}

func TestHotelService_ListApprovedHotels_DefaultPagination(t *testing.T) {
	capturedPage := 0
	capturedLimit := 0
	repo := &mockHotelRepo{
		listApprovedFn: func(ctx context.Context, page, limit int) ([]*domain.Hotel, int, error) {
			capturedPage = page
			capturedLimit = limit
			return []*domain.Hotel{}, 0, nil
		},
	}
	svc := service.NewHotelService(repo)

	svc.ListApprovedHotels(context.Background(), 0, 0)

	if capturedPage != 1 {
		t.Errorf("expected default page 1, got %d", capturedPage)
	}
	if capturedLimit != 20 {
		t.Errorf("expected default limit 20, got %d", capturedLimit)
	}
}

// --- Tests: UpdateHotel ---

func TestHotelService_UpdateHotel_SuccessForOwner(t *testing.T) {
	ownerID := "owner-uuid-123"
	existing := &domain.Hotel{ID: 1, OwnerID: ownerID, Name: "Old Name"}
	repo := &mockHotelRepo{
		getHotelByIDFn: func(ctx context.Context, id int) (*domain.Hotel, error) {
			return existing, nil
		},
		updateHotelFn: func(ctx context.Context, hotel *domain.Hotel) (*domain.Hotel, error) {
			updated := *hotel
			return &updated, nil
		},
	}
	svc := service.NewHotelService(repo)

	input := service.UpdateHotelInput{Name: "New Name", Location: "New Location"}
	result, err := svc.UpdateHotel(context.Background(), 1, ownerID, input)

	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if result.Name != "New Name" {
		t.Errorf("expected name %q, got %q", "New Name", result.Name)
	}
}

func TestHotelService_UpdateHotel_RejectsNonOwner(t *testing.T) {
	existing := &domain.Hotel{ID: 1, OwnerID: "real-owner"}
	repo := &mockHotelRepo{
		getHotelByIDFn: func(ctx context.Context, id int) (*domain.Hotel, error) {
			return existing, nil
		},
	}
	svc := service.NewHotelService(repo)

	_, err := svc.UpdateHotel(context.Background(), 1, "different-user", service.UpdateHotelInput{Name: "Hack"})

	if !errors.Is(err, domain.ErrUnauthorized) {
		t.Errorf("expected ErrUnauthorized, got %v", err)
	}
}

func TestHotelService_UpdateHotel_HotelNotFound(t *testing.T) {
	repo := &mockHotelRepo{
		getHotelByIDFn: func(ctx context.Context, id int) (*domain.Hotel, error) {
			return nil, domain.ErrNotFound
		},
	}
	svc := service.NewHotelService(repo)

	_, err := svc.UpdateHotel(context.Background(), 999, "owner-id", service.UpdateHotelInput{Name: "X"})

	if !errors.Is(err, domain.ErrNotFound) {
		t.Errorf("expected ErrNotFound, got %v", err)
	}
}

// --- Tests: DeleteHotel ---

func TestHotelService_DeleteHotel_SuccessForOwner(t *testing.T) {
	ownerID := "owner-uuid-123"
	repo := &mockHotelRepo{
		deleteHotelFn: func(ctx context.Context, id int, oID string) error {
			if oID != ownerID {
				return domain.ErrUnauthorized
			}
			return nil
		},
	}
	svc := service.NewHotelService(repo)

	err := svc.DeleteHotel(context.Background(), 1, ownerID)

	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
}

func TestHotelService_DeleteHotel_NotFound(t *testing.T) {
	repo := &mockHotelRepo{
		deleteHotelFn: func(ctx context.Context, id int, ownerID string) error {
			return domain.ErrNotFound
		},
	}
	svc := service.NewHotelService(repo)

	err := svc.DeleteHotel(context.Background(), 999, "owner-id")

	if !errors.Is(err, domain.ErrNotFound) {
		t.Errorf("expected ErrNotFound, got %v", err)
	}
}

// --- Tests: ApproveHotel ---

func TestHotelService_ApproveHotel_Success(t *testing.T) {
	existing := &domain.Hotel{ID: 1, Status: domain.HotelStatusPending}
	repo := &mockHotelRepo{
		getHotelByIDFn: func(ctx context.Context, id int) (*domain.Hotel, error) {
			return existing, nil
		},
		updateHotelStatusFn: func(ctx context.Context, id int, status domain.HotelStatus) error {
			return nil
		},
	}
	svc := service.NewHotelService(repo)

	err := svc.ApproveHotel(context.Background(), 1)

	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
}

func TestHotelService_ApproveHotel_AlreadyApproved(t *testing.T) {
	existing := &domain.Hotel{ID: 1, Status: domain.HotelStatusApproved}
	repo := &mockHotelRepo{
		getHotelByIDFn: func(ctx context.Context, id int) (*domain.Hotel, error) {
			return existing, nil
		},
	}
	svc := service.NewHotelService(repo)

	err := svc.ApproveHotel(context.Background(), 1)

	if !errors.Is(err, domain.ErrConflict) {
		t.Errorf("expected ErrConflict for already-approved hotel, got %v", err)
	}
}

// --- Tests: RejectHotel ---

func TestHotelService_RejectHotel_Success(t *testing.T) {
	existing := &domain.Hotel{ID: 1, Status: domain.HotelStatusPending}
	repo := &mockHotelRepo{
		getHotelByIDFn: func(ctx context.Context, id int) (*domain.Hotel, error) {
			return existing, nil
		},
		updateHotelStatusFn: func(ctx context.Context, id int, status domain.HotelStatus) error {
			return nil
		},
	}
	svc := service.NewHotelService(repo)

	err := svc.RejectHotel(context.Background(), 1)

	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
}

func TestHotelService_RejectHotel_AlreadyRejected(t *testing.T) {
	existing := &domain.Hotel{ID: 1, Status: domain.HotelStatusRejected}
	repo := &mockHotelRepo{
		getHotelByIDFn: func(ctx context.Context, id int) (*domain.Hotel, error) {
			return existing, nil
		},
	}
	svc := service.NewHotelService(repo)

	err := svc.RejectHotel(context.Background(), 1)

	if !errors.Is(err, domain.ErrConflict) {
		t.Errorf("expected ErrConflict for already-rejected hotel, got %v", err)
	}
}

// --- Tests: ListPendingHotels ---

func TestHotelService_ListPendingHotels_ReturnsList(t *testing.T) {
	hotels := []*domain.Hotel{
		{ID: 1, Status: domain.HotelStatusPending},
	}
	repo := &mockHotelRepo{
		listPendingFn: func(ctx context.Context, page, limit int) ([]*domain.Hotel, int, error) {
			return hotels, 1, nil
		},
	}
	svc := service.NewHotelService(repo)

	result, total, err := svc.ListPendingHotels(context.Background(), 1, 20)

	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if len(result) != 1 {
		t.Errorf("expected 1 hotel, got %d", len(result))
	}
	if total != 1 {
		t.Errorf("expected total 1, got %d", total)
	}
}

// --- Tests: ListHotelsByOwner ---

func TestHotelService_ListHotelsByOwner_ReturnsList(t *testing.T) {
	ownerID := "owner-uuid"
	hotels := []*domain.Hotel{
		{ID: 1, OwnerID: ownerID, Status: domain.HotelStatusPending},
		{ID: 2, OwnerID: ownerID, Status: domain.HotelStatusApproved},
	}
	repo := &mockHotelRepo{
		listByOwnerFn: func(ctx context.Context, oID string, page, limit int) ([]*domain.Hotel, int, error) {
			return hotels, 2, nil
		},
	}
	svc := service.NewHotelService(repo)

	result, total, err := svc.ListHotelsByOwner(context.Background(), ownerID, 1, 20)

	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if len(result) != 2 {
		t.Errorf("expected 2 hotels, got %d", len(result))
	}
	if total != 2 {
		t.Errorf("expected total 2, got %d", total)
	}
}
