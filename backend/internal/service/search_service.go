package service

import (
	"booking-app/internal/domain"
	"booking-app/internal/repository"
	"context"
	"crypto/sha256"
	"encoding/json"
	"fmt"
	"time"
)

// SearchCache provides a key-value cache abstraction for search results.
type SearchCache interface {
	Get(ctx context.Context, key string) ([]byte, bool, error)
	Set(ctx context.Context, key string, val []byte, ttl time.Duration) error
}

// SearchServiceInterface defines the contract for hotel search business logic.
type SearchServiceInterface interface {
	SearchHotels(ctx context.Context, params domain.SearchParams) ([]*domain.Hotel, int, error)
	IndexHotel(ctx context.Context, hotel *domain.Hotel) error
	BulkIndexHotels(ctx context.Context, hotels []*domain.Hotel) error
	DeleteHotel(ctx context.Context, id int) error
}

// SearchService implements SearchServiceInterface with optional Redis caching.
type SearchService struct {
	repo  repository.SearchRepository
	cache SearchCache
}

// NewSearchService creates a SearchService. cache may be nil (disables caching).
func NewSearchService(repo repository.SearchRepository, cache SearchCache) *SearchService {
	return &SearchService{repo: repo, cache: cache}
}

const searchCacheTTL = 5 * time.Minute

// SearchHotels validates params, checks cache, then queries Elasticsearch.
func (s *SearchService) SearchHotels(ctx context.Context, params domain.SearchParams) ([]*domain.Hotel, int, error) {
	params = normalizeSearchParams(params)

	if err := validateSearchParams(params); err != nil {
		return nil, 0, err
	}

	if s.cache != nil {
		key := searchCacheKey(params)
		if cached, ok, err := s.cache.Get(ctx, key); err == nil && ok {
			var entry searchCacheEntry
			if json.Unmarshal(cached, &entry) == nil {
				return entry.Hotels, entry.Total, nil
			}
		}
	}

	hotels, total, err := s.repo.SearchHotels(ctx, params)
	if err != nil {
		return nil, 0, err
	}

	if s.cache != nil {
		key := searchCacheKey(params)
		if b, marshalErr := json.Marshal(searchCacheEntry{Hotels: hotels, Total: total}); marshalErr == nil {
			_ = s.cache.Set(ctx, key, b, searchCacheTTL)
		}
	}

	return hotels, total, nil
}

// IndexHotel upserts a hotel document in the search index.
func (s *SearchService) IndexHotel(ctx context.Context, hotel *domain.Hotel) error {
	return s.repo.IndexHotel(ctx, hotel)
}

// BulkIndexHotels indexes a batch of hotels. Empty slices are a no-op.
func (s *SearchService) BulkIndexHotels(ctx context.Context, hotels []*domain.Hotel) error {
	if len(hotels) == 0 {
		return nil
	}
	return s.repo.BulkIndexHotels(ctx, hotels)
}

// DeleteHotel removes a hotel from the search index.
func (s *SearchService) DeleteHotel(ctx context.Context, id int) error {
	return s.repo.DeleteHotel(ctx, id)
}

// --- Internal helpers ---

type searchCacheEntry struct {
	Hotels []*domain.Hotel `json:"hotels"`
	Total  int             `json:"total"`
}

func searchCacheKey(params domain.SearchParams) string {
	b, _ := json.Marshal(params)
	sum := sha256.Sum256(b)
	return fmt.Sprintf("search:%x", sum)
}

func normalizeSearchParams(p domain.SearchParams) domain.SearchParams {
	if p.RadiusKm <= 0 {
		p.RadiusKm = 50
	}
	if p.RadiusKm > 500 {
		p.RadiusKm = 500
	}
	if p.Page < 1 {
		p.Page = 1
	}
	if p.Limit < 1 {
		p.Limit = 20
	}
	if p.Limit > 100 {
		p.Limit = 100
	}
	if p.Sort != domain.SearchSortDistance && p.Sort != domain.SearchSortPrice {
		p.Sort = domain.SearchSortDistance
	}
	return p
}

func validateSearchParams(p domain.SearchParams) error {
	if p.Lat == nil || p.Lng == nil {
		return fmt.Errorf("lat and lng are required: %w", domain.ErrBadRequest)
	}
	if *p.Lat < -90 || *p.Lat > 90 {
		return fmt.Errorf("lat must be between -90 and 90: %w", domain.ErrBadRequest)
	}
	if *p.Lng < -180 || *p.Lng > 180 {
		return fmt.Errorf("lng must be between -180 and 180: %w", domain.ErrBadRequest)
	}
	if p.PriceMin != nil && p.PriceMax != nil && *p.PriceMin > *p.PriceMax {
		return fmt.Errorf("price_min cannot exceed price_max: %w", domain.ErrBadRequest)
	}
	return nil
}
