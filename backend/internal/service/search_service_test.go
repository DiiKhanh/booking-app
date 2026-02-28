package service_test

import (
	"booking-app/internal/domain"
	"booking-app/internal/service"
	"context"
	"errors"
	"testing"
	"time"
)

// --- Mock SearchRepository ---

type mockSearchRepo struct {
	searchHotelsFn    func(ctx context.Context, params domain.SearchParams) ([]*domain.Hotel, int, error)
	indexHotelFn      func(ctx context.Context, hotel *domain.Hotel) error
	bulkIndexHotelsFn func(ctx context.Context, hotels []*domain.Hotel) error
	deleteHotelFn     func(ctx context.Context, id int) error
}

func (m *mockSearchRepo) SearchHotels(ctx context.Context, params domain.SearchParams) ([]*domain.Hotel, int, error) {
	if m.searchHotelsFn != nil {
		return m.searchHotelsFn(ctx, params)
	}
	return []*domain.Hotel{}, 0, nil
}

func (m *mockSearchRepo) IndexHotel(ctx context.Context, hotel *domain.Hotel) error {
	if m.indexHotelFn != nil {
		return m.indexHotelFn(ctx, hotel)
	}
	return nil
}

func (m *mockSearchRepo) BulkIndexHotels(ctx context.Context, hotels []*domain.Hotel) error {
	if m.bulkIndexHotelsFn != nil {
		return m.bulkIndexHotelsFn(ctx, hotels)
	}
	return nil
}

func (m *mockSearchRepo) DeleteHotel(ctx context.Context, id int) error {
	if m.deleteHotelFn != nil {
		return m.deleteHotelFn(ctx, id)
	}
	return nil
}

// --- Mock SearchCache ---

type mockSearchCache struct {
	getFn func(ctx context.Context, key string) ([]byte, bool, error)
	setFn func(ctx context.Context, key string, val []byte, ttl time.Duration) error
}

func (m *mockSearchCache) Get(ctx context.Context, key string) ([]byte, bool, error) {
	if m.getFn != nil {
		return m.getFn(ctx, key)
	}
	return nil, false, nil
}

func (m *mockSearchCache) Set(ctx context.Context, key string, val []byte, ttl time.Duration) error {
	if m.setFn != nil {
		return m.setFn(ctx, key, val, ttl)
	}
	return nil
}

// --- Helpers ---

func ptrFloat(f float64) *float64 { return &f }
func ptrInt(i int) *int           { return &i }

func validSearchParams() domain.SearchParams {
	return domain.SearchParams{
		Lat:      ptrFloat(10.762622),
		Lng:      ptrFloat(106.660172),
		RadiusKm: 50,
		Page:     1,
		Limit:    20,
	}
}

func sampleHotel() *domain.Hotel {
	return &domain.Hotel{
		ID:        1,
		Name:      "Test Hotel",
		City:      "Ho Chi Minh City",
		Country:   "Vietnam",
		Latitude:  10.762622,
		Longitude: 106.660172,
		Status:    domain.HotelStatusApproved,
		StarRating: 4,
	}
}

// --- Tests: SearchHotels ---

func TestSearchService_SearchHotels_ReturnsResults(t *testing.T) {
	hotels := []*domain.Hotel{sampleHotel()}
	repo := &mockSearchRepo{
		searchHotelsFn: func(ctx context.Context, params domain.SearchParams) ([]*domain.Hotel, int, error) {
			return hotels, 1, nil
		},
	}
	svc := service.NewSearchService(repo, nil)

	params := validSearchParams()
	result, total, err := svc.SearchHotels(context.Background(), params)

	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if len(result) != 1 {
		t.Errorf("expected 1 result, got %d", len(result))
	}
	if total != 1 {
		t.Errorf("expected total 1, got %d", total)
	}
}

func TestSearchService_SearchHotels_RequiresLat(t *testing.T) {
	repo := &mockSearchRepo{}
	svc := service.NewSearchService(repo, nil)

	params := validSearchParams()
	params.Lat = nil

	_, _, err := svc.SearchHotels(context.Background(), params)

	if !errors.Is(err, domain.ErrBadRequest) {
		t.Errorf("expected ErrBadRequest when lat is missing, got %v", err)
	}
}

func TestSearchService_SearchHotels_RequiresLng(t *testing.T) {
	repo := &mockSearchRepo{}
	svc := service.NewSearchService(repo, nil)

	params := validSearchParams()
	params.Lng = nil

	_, _, err := svc.SearchHotels(context.Background(), params)

	if !errors.Is(err, domain.ErrBadRequest) {
		t.Errorf("expected ErrBadRequest when lng is missing, got %v", err)
	}
}

func TestSearchService_SearchHotels_InvalidLatitude(t *testing.T) {
	repo := &mockSearchRepo{}
	svc := service.NewSearchService(repo, nil)

	params := validSearchParams()
	params.Lat = ptrFloat(95.0) // out of range

	_, _, err := svc.SearchHotels(context.Background(), params)

	if !errors.Is(err, domain.ErrBadRequest) {
		t.Errorf("expected ErrBadRequest for lat=95, got %v", err)
	}
}

func TestSearchService_SearchHotels_InvalidLongitude(t *testing.T) {
	repo := &mockSearchRepo{}
	svc := service.NewSearchService(repo, nil)

	params := validSearchParams()
	params.Lng = ptrFloat(200.0) // out of range

	_, _, err := svc.SearchHotels(context.Background(), params)

	if !errors.Is(err, domain.ErrBadRequest) {
		t.Errorf("expected ErrBadRequest for lng=200, got %v", err)
	}
}

func TestSearchService_SearchHotels_PriceMinExceedsMax(t *testing.T) {
	repo := &mockSearchRepo{}
	svc := service.NewSearchService(repo, nil)

	params := validSearchParams()
	params.PriceMin = ptrFloat(500)
	params.PriceMax = ptrFloat(100)

	_, _, err := svc.SearchHotels(context.Background(), params)

	if !errors.Is(err, domain.ErrBadRequest) {
		t.Errorf("expected ErrBadRequest when price_min > price_max, got %v", err)
	}
}

func TestSearchService_SearchHotels_DefaultsApplied(t *testing.T) {
	capturedParams := domain.SearchParams{}
	repo := &mockSearchRepo{
		searchHotelsFn: func(ctx context.Context, params domain.SearchParams) ([]*domain.Hotel, int, error) {
			capturedParams = params
			return []*domain.Hotel{}, 0, nil
		},
	}
	svc := service.NewSearchService(repo, nil)

	// Pass zeroed params but with required lat/lng
	lat, lng := 10.0, 106.0
	params := domain.SearchParams{Lat: &lat, Lng: &lng}

	_, _, _ = svc.SearchHotels(context.Background(), params)

	if capturedParams.Page != 1 {
		t.Errorf("expected default page=1, got %d", capturedParams.Page)
	}
	if capturedParams.Limit != 20 {
		t.Errorf("expected default limit=20, got %d", capturedParams.Limit)
	}
	if capturedParams.RadiusKm != 50 {
		t.Errorf("expected default radius=50, got %f", capturedParams.RadiusKm)
	}
	if capturedParams.Sort != domain.SearchSortDistance {
		t.Errorf("expected default sort=distance, got %q", capturedParams.Sort)
	}
}

func TestSearchService_SearchHotels_RepositoryError(t *testing.T) {
	repo := &mockSearchRepo{
		searchHotelsFn: func(ctx context.Context, params domain.SearchParams) ([]*domain.Hotel, int, error) {
			return nil, 0, domain.ErrInternal
		},
	}
	svc := service.NewSearchService(repo, nil)

	_, _, err := svc.SearchHotels(context.Background(), validSearchParams())

	if !errors.Is(err, domain.ErrInternal) {
		t.Errorf("expected ErrInternal, got %v", err)
	}
}

func TestSearchService_SearchHotels_CacheMissCallsRepo(t *testing.T) {
	repoCalled := false
	repo := &mockSearchRepo{
		searchHotelsFn: func(ctx context.Context, params domain.SearchParams) ([]*domain.Hotel, int, error) {
			repoCalled = true
			return []*domain.Hotel{sampleHotel()}, 1, nil
		},
	}
	cache := &mockSearchCache{
		getFn: func(ctx context.Context, key string) ([]byte, bool, error) {
			return nil, false, nil // cache miss
		},
	}
	svc := service.NewSearchService(repo, cache)

	_, _, err := svc.SearchHotels(context.Background(), validSearchParams())

	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !repoCalled {
		t.Error("expected repo to be called on cache miss")
	}
}

func TestSearchService_SearchHotels_CacheHitSkipsRepo(t *testing.T) {
	repoCalled := false
	repo := &mockSearchRepo{
		searchHotelsFn: func(ctx context.Context, params domain.SearchParams) ([]*domain.Hotel, int, error) {
			repoCalled = true
			return nil, 0, nil
		},
	}
	// Return valid cached JSON on the first call
	cached := `{"hotels":[{"id":1,"name":"Cached Hotel","location":"","city":"","country":"","status":"approved","created_at":"2024-01-01T00:00:00Z","updated_at":"2024-01-01T00:00:00Z"}],"total":1}`
	cache := &mockSearchCache{
		getFn: func(ctx context.Context, key string) ([]byte, bool, error) {
			return []byte(cached), true, nil
		},
	}
	svc := service.NewSearchService(repo, cache)

	result, total, err := svc.SearchHotels(context.Background(), validSearchParams())

	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if repoCalled {
		t.Error("expected repo NOT to be called on cache hit")
	}
	if len(result) != 1 {
		t.Errorf("expected 1 cached hotel, got %d", len(result))
	}
	if total != 1 {
		t.Errorf("expected total 1 from cache, got %d", total)
	}
}

func TestSearchService_SearchHotels_ResultsStoredInCache(t *testing.T) {
	setCalled := false
	hotels := []*domain.Hotel{sampleHotel()}
	repo := &mockSearchRepo{
		searchHotelsFn: func(ctx context.Context, params domain.SearchParams) ([]*domain.Hotel, int, error) {
			return hotels, 1, nil
		},
	}
	cache := &mockSearchCache{
		getFn: func(ctx context.Context, key string) ([]byte, bool, error) {
			return nil, false, nil
		},
		setFn: func(ctx context.Context, key string, val []byte, ttl time.Duration) error {
			setCalled = true
			if ttl != 5*time.Minute {
				t.Errorf("expected 5m TTL, got %v", ttl)
			}
			return nil
		},
	}
	svc := service.NewSearchService(repo, cache)

	_, _, err := svc.SearchHotels(context.Background(), validSearchParams())

	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !setCalled {
		t.Error("expected cache.Set to be called after repo fetch")
	}
}

// --- Tests: BulkIndexHotels ---

func TestSearchService_BulkIndexHotels_EmptySliceIsNoop(t *testing.T) {
	repoCalled := false
	repo := &mockSearchRepo{
		bulkIndexHotelsFn: func(ctx context.Context, hotels []*domain.Hotel) error {
			repoCalled = true
			return nil
		},
	}
	svc := service.NewSearchService(repo, nil)

	err := svc.BulkIndexHotels(context.Background(), []*domain.Hotel{})

	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if repoCalled {
		t.Error("expected repo NOT to be called for empty slice")
	}
}

func TestSearchService_BulkIndexHotels_ForwardsToRepo(t *testing.T) {
	hotels := []*domain.Hotel{sampleHotel()}
	repoCalled := false
	repo := &mockSearchRepo{
		bulkIndexHotelsFn: func(ctx context.Context, h []*domain.Hotel) error {
			repoCalled = true
			if len(h) != 1 {
				t.Errorf("expected 1 hotel, got %d", len(h))
			}
			return nil
		},
	}
	svc := service.NewSearchService(repo, nil)

	err := svc.BulkIndexHotels(context.Background(), hotels)

	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !repoCalled {
		t.Error("expected repo.BulkIndexHotels to be called")
	}
}

// --- Tests: DeleteHotel ---

func TestSearchService_DeleteHotel_ForwardsToRepo(t *testing.T) {
	deletedID := 0
	repo := &mockSearchRepo{
		deleteHotelFn: func(ctx context.Context, id int) error {
			deletedID = id
			return nil
		},
	}
	svc := service.NewSearchService(repo, nil)

	err := svc.DeleteHotel(context.Background(), 42)

	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if deletedID != 42 {
		t.Errorf("expected deleted ID=42, got %d", deletedID)
	}
}

func TestSearchService_DeleteHotel_RepoError(t *testing.T) {
	repo := &mockSearchRepo{
		deleteHotelFn: func(ctx context.Context, id int) error {
			return domain.ErrNotFound
		},
	}
	svc := service.NewSearchService(repo, nil)

	err := svc.DeleteHotel(context.Background(), 99)

	if !errors.Is(err, domain.ErrNotFound) {
		t.Errorf("expected ErrNotFound, got %v", err)
	}
}

func TestSearchService_SearchHotels_RadiusCapApplied(t *testing.T) {
	capturedRadius := 0.0
	repo := &mockSearchRepo{
		searchHotelsFn: func(ctx context.Context, params domain.SearchParams) ([]*domain.Hotel, int, error) {
			capturedRadius = params.RadiusKm
			return []*domain.Hotel{}, 0, nil
		},
	}
	svc := service.NewSearchService(repo, nil)

	lat, lng := 10.0, 106.0
	params := domain.SearchParams{Lat: &lat, Lng: &lng, RadiusKm: 9999}
	_, _, _ = svc.SearchHotels(context.Background(), params)

	if capturedRadius != 500 {
		t.Errorf("expected radius capped at 500, got %f", capturedRadius)
	}
}

// --- Tests: IndexHotel ---

func TestSearchService_IndexHotel_ForwardsToRepo(t *testing.T) {
	hotel := sampleHotel()
	var indexedHotel *domain.Hotel
	repo := &mockSearchRepo{
		indexHotelFn: func(ctx context.Context, h *domain.Hotel) error {
			indexedHotel = h
			return nil
		},
	}
	svc := service.NewSearchService(repo, nil)

	err := svc.IndexHotel(context.Background(), hotel)

	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if indexedHotel == nil || indexedHotel.ID != hotel.ID {
		t.Error("expected hotel to be forwarded to repo")
	}
}
