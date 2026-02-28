package repository

import (
	esinfra "booking-app/internal/infrastructure/elasticsearch"
	"booking-app/internal/domain"
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/elastic/go-elasticsearch/v8"
)

// ESSearchRepo implements SearchRepository using Elasticsearch.
type ESSearchRepo struct {
	client *elasticsearch.Client
}

// NewESSearchRepo creates a new ESSearchRepo.
func NewESSearchRepo(client *elasticsearch.Client) *ESSearchRepo {
	return &ESSearchRepo{client: client}
}

// IndexHotel upserts a hotel document.
func (r *ESSearchRepo) IndexHotel(ctx context.Context, hotel *domain.Hotel) error {
	return esinfra.IndexHotel(ctx, r.client, hotel)
}

// BulkIndexHotels indexes a batch of hotels.
func (r *ESSearchRepo) BulkIndexHotels(ctx context.Context, hotels []*domain.Hotel) error {
	return esinfra.BulkIndexHotels(ctx, r.client, hotels)
}

// DeleteHotel removes a hotel from the index.
func (r *ESSearchRepo) DeleteHotel(ctx context.Context, id int) error {
	return esinfra.DeleteHotel(ctx, r.client, id)
}

// SearchHotels builds a geo-distance + filter query and returns matching hotels.
func (r *ESSearchRepo) SearchHotels(ctx context.Context, params domain.SearchParams) ([]*domain.Hotel, int, error) {
	query := buildSearchQuery(params)
	body, err := json.Marshal(query)
	if err != nil {
		return nil, 0, fmt.Errorf("marshaling search query: %w", err)
	}

	from := (params.Page - 1) * params.Limit
	res, err := r.client.Search(
		r.client.Search.WithIndex(esinfra.HotelIndex),
		r.client.Search.WithBody(bytes.NewReader(body)),
		r.client.Search.WithFrom(from),
		r.client.Search.WithSize(params.Limit),
		r.client.Search.WithContext(ctx),
	)
	if err != nil {
		return nil, 0, fmt.Errorf("executing search: %w", err)
	}
	defer res.Body.Close()

	if res.IsError() {
		return nil, 0, fmt.Errorf("ES search error: %s", res.String())
	}

	return parseSearchResponse(res.Body)
}

// buildSearchQuery constructs the Elasticsearch query from SearchParams.
func buildSearchQuery(params domain.SearchParams) map[string]interface{} {
	must := []interface{}{
		map[string]interface{}{
			"term": map[string]interface{}{
				"status": string(domain.HotelStatusApproved),
			},
		},
	}

	filters := []interface{}{
		map[string]interface{}{
			"geo_distance": map[string]interface{}{
				"distance": fmt.Sprintf("%.1fkm", params.RadiusKm),
				"geo_location": map[string]interface{}{
					"lat": *params.Lat,
					"lon": *params.Lng,
				},
			},
		},
	}

	if params.PriceMin != nil || params.PriceMax != nil {
		rangeClause := map[string]interface{}{}
		if params.PriceMin != nil {
			rangeClause["gte"] = *params.PriceMin
		}
		if params.PriceMax != nil {
			rangeClause["lte"] = *params.PriceMax
		}
		filters = append(filters, map[string]interface{}{
			"range": map[string]interface{}{
				"min_price": rangeClause,
			},
		})
	}

	if len(params.Amenities) > 0 {
		filters = append(filters, map[string]interface{}{
			"terms": map[string]interface{}{
				"amenities": params.Amenities,
			},
		})
	}

	sort := buildSortClause(params)

	return map[string]interface{}{
		"query": map[string]interface{}{
			"bool": map[string]interface{}{
				"must":   must,
				"filter": filters,
			},
		},
		"sort": sort,
	}
}

func buildSortClause(params domain.SearchParams) []interface{} {
	if params.Sort == domain.SearchSortPrice {
		return []interface{}{
			map[string]interface{}{
				"min_price": map[string]interface{}{"order": "asc"},
			},
		}
	}
	// Default: sort by distance.
	return []interface{}{
		map[string]interface{}{
			"_geo_distance": map[string]interface{}{
				"geo_location": map[string]interface{}{
					"lat": *params.Lat,
					"lon": *params.Lng,
				},
				"order": "asc",
				"unit":  "km",
			},
		},
	}
}

// parseSearchResponse decodes the Elasticsearch search response into domain.Hotel slice.
func parseSearchResponse(body interface{ Read(p []byte) (n int, err error) }) ([]*domain.Hotel, int, error) {
	var esResp struct {
		Hits struct {
			Total struct {
				Value int `json:"value"`
			} `json:"total"`
			Hits []struct {
				Source esinfra.HotelDocument `json:"_source"`
			} `json:"hits"`
		} `json:"hits"`
	}

	if err := json.NewDecoder(body).Decode(&esResp); err != nil {
		return nil, 0, fmt.Errorf("decoding search response: %w", err)
	}

	hotels := make([]*domain.Hotel, 0, len(esResp.Hits.Hits))
	for _, hit := range esResp.Hits.Hits {
		hotels = append(hotels, documentToHotel(hit.Source))
	}
	return hotels, esResp.Hits.Total.Value, nil
}

// documentToHotel converts an ES HotelDocument back to a domain.Hotel.
func documentToHotel(doc esinfra.HotelDocument) *domain.Hotel {
	return &domain.Hotel{
		ID:          doc.ID,
		OwnerID:     doc.OwnerID,
		Name:        doc.Name,
		Description: doc.Description,
		Location:    doc.Location,
		Address:     doc.Address,
		City:        doc.City,
		Country:     doc.Country,
		Status:      domain.HotelStatus(doc.Status),
		StarRating:  doc.StarRating,
		Amenities:   doc.Amenities,
		Latitude:    doc.GeoLocation.Lat,
		Longitude:   doc.GeoLocation.Lon,
		CreatedAt:   doc.CreatedAt,
		UpdatedAt:   time.Time{},
	}
}

// RedisSearchCache wraps a Redis client to implement service.SearchCache.
type RedisSearchCache struct {
	client redisClient
}

// redisClient is a minimal interface for the Redis operations we need.
type redisClient interface {
	Get(ctx context.Context, key string) ([]byte, error)
	Set(ctx context.Context, key string, val []byte, ttl time.Duration) error
}

// NewRedisSearchCache creates a cache backed by Redis.
// The redisClient parameter should be a *repository.RedisCache or similar adapter.
func NewRedisSearchCache(client redisClient) *RedisSearchCache {
	return &RedisSearchCache{client: client}
}

func (c *RedisSearchCache) Get(ctx context.Context, key string) ([]byte, bool, error) {
	val, err := c.client.Get(ctx, key)
	if err != nil {
		if strings.Contains(err.Error(), "redis: nil") {
			return nil, false, nil
		}
		return nil, false, err
	}
	return val, true, nil
}

func (c *RedisSearchCache) Set(ctx context.Context, key string, val []byte, ttl time.Duration) error {
	return c.client.Set(ctx, key, val, ttl)
}
