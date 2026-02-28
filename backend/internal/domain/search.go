package domain

import "time"

// SearchSort defines available sort orders for hotel search results.
type SearchSort string

const (
	SearchSortDistance SearchSort = "distance"
	SearchSortPrice    SearchSort = "price"
)

// SearchParams holds all query parameters for the hotel search endpoint.
// Lat and Lng are required; all other fields are optional filters.
type SearchParams struct {
	// Geo filter — both required for geo search.
	Lat      *float64
	Lng      *float64
	RadiusKm float64 // default: 50, max: 500

	// Price filter.
	PriceMin *float64
	PriceMax *float64

	// Attribute filters.
	Amenities []string
	Guests    *int

	// Availability window (inclusive).
	CheckIn  *time.Time
	CheckOut *time.Time

	// Pagination.
	Page  int // default: 1
	Limit int // default: 20, max: 100

	// Sort order: "distance" (default) or "price".
	Sort SearchSort
}
