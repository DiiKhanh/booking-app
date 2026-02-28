package handler_test

import (
	"booking-app/internal/domain"
	"booking-app/internal/handler"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
)

// --- Mock SearchService ---

type mockSearchSvc struct {
	searchHotelsFn    func(ctx context.Context, params domain.SearchParams) ([]*domain.Hotel, int, error)
	indexHotelFn      func(ctx context.Context, hotel *domain.Hotel) error
	bulkIndexHotelsFn func(ctx context.Context, hotels []*domain.Hotel) error
	deleteHotelFn     func(ctx context.Context, id int) error
}

func (m *mockSearchSvc) SearchHotels(ctx context.Context, params domain.SearchParams) ([]*domain.Hotel, int, error) {
	if m.searchHotelsFn != nil {
		return m.searchHotelsFn(ctx, params)
	}
	return []*domain.Hotel{}, 0, nil
}

func (m *mockSearchSvc) IndexHotel(ctx context.Context, hotel *domain.Hotel) error {
	if m.indexHotelFn != nil {
		return m.indexHotelFn(ctx, hotel)
	}
	return nil
}

func (m *mockSearchSvc) BulkIndexHotels(ctx context.Context, hotels []*domain.Hotel) error {
	if m.bulkIndexHotelsFn != nil {
		return m.bulkIndexHotelsFn(ctx, hotels)
	}
	return nil
}

func (m *mockSearchSvc) DeleteHotel(ctx context.Context, id int) error {
	if m.deleteHotelFn != nil {
		return m.deleteHotelFn(ctx, id)
	}
	return nil
}

// --- Setup ---

func setupSearchRouter(svc *mockSearchSvc) *gin.Engine {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	h := handler.NewSearchHandler(svc)
	r.GET("/api/v1/hotels/search", h.Search)
	return r
}

// --- Tests ---

func TestSearchHandler_Search_ReturnsOK(t *testing.T) {
	svc := &mockSearchSvc{
		searchHotelsFn: func(ctx context.Context, params domain.SearchParams) ([]*domain.Hotel, int, error) {
			return []*domain.Hotel{
				{ID: 1, Name: "Hotel One", Status: domain.HotelStatusApproved},
			}, 1, nil
		},
	}
	r := setupSearchRouter(svc)

	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/hotels/search?lat=10.76&lng=106.66", nil)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d — body: %s", w.Code, w.Body.String())
	}

	var resp map[string]interface{}
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("invalid JSON: %v", err)
	}
	if resp["success"] != true {
		t.Error("expected success=true")
	}
}

func TestSearchHandler_Search_MissingLat_Returns400(t *testing.T) {
	svc := &mockSearchSvc{}
	r := setupSearchRouter(svc)

	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/hotels/search?lng=106.66", nil)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 when lat missing, got %d", w.Code)
	}
}

func TestSearchHandler_Search_MissingLng_Returns400(t *testing.T) {
	svc := &mockSearchSvc{}
	r := setupSearchRouter(svc)

	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/hotels/search?lat=10.76", nil)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 when lng missing, got %d", w.Code)
	}
}

func TestSearchHandler_Search_InvalidLatFormat_Returns400(t *testing.T) {
	svc := &mockSearchSvc{}
	r := setupSearchRouter(svc)

	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/hotels/search?lat=not-a-number&lng=106.66", nil)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid lat, got %d", w.Code)
	}
}

func TestSearchHandler_Search_InvalidLngFormat_Returns400(t *testing.T) {
	svc := &mockSearchSvc{}
	r := setupSearchRouter(svc)

	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/hotels/search?lat=10.76&lng=abc", nil)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid lng, got %d", w.Code)
	}
}

func TestSearchHandler_Search_ServiceBadRequest_Returns400(t *testing.T) {
	svc := &mockSearchSvc{
		searchHotelsFn: func(ctx context.Context, params domain.SearchParams) ([]*domain.Hotel, int, error) {
			return nil, 0, domain.ErrBadRequest
		},
	}
	r := setupSearchRouter(svc)

	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/hotels/search?lat=10.76&lng=106.66", nil)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 from service validation, got %d", w.Code)
	}
}

func TestSearchHandler_Search_ServiceError_Returns500(t *testing.T) {
	svc := &mockSearchSvc{
		searchHotelsFn: func(ctx context.Context, params domain.SearchParams) ([]*domain.Hotel, int, error) {
			return nil, 0, domain.ErrInternal
		},
	}
	r := setupSearchRouter(svc)

	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/hotels/search?lat=10.76&lng=106.66", nil)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusInternalServerError {
		t.Errorf("expected 500 from service error, got %d", w.Code)
	}
}

func TestSearchHandler_Search_PaginationPropagated(t *testing.T) {
	capturedPage, capturedLimit := 0, 0
	svc := &mockSearchSvc{
		searchHotelsFn: func(ctx context.Context, params domain.SearchParams) ([]*domain.Hotel, int, error) {
			capturedPage = params.Page
			capturedLimit = params.Limit
			return []*domain.Hotel{}, 0, nil
		},
	}
	r := setupSearchRouter(svc)

	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/hotels/search?lat=10.76&lng=106.66&page=3&limit=15", nil)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", w.Code)
	}
	if capturedPage != 3 {
		t.Errorf("expected page=3, got %d", capturedPage)
	}
	if capturedLimit != 15 {
		t.Errorf("expected limit=15, got %d", capturedLimit)
	}
}

func TestSearchHandler_Search_ReturnsMetaInResponse(t *testing.T) {
	svc := &mockSearchSvc{
		searchHotelsFn: func(ctx context.Context, params domain.SearchParams) ([]*domain.Hotel, int, error) {
			return []*domain.Hotel{}, 42, nil
		},
	}
	r := setupSearchRouter(svc)

	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/hotels/search?lat=10.76&lng=106.66", nil)
	r.ServeHTTP(w, req)

	var resp map[string]interface{}
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("invalid JSON: %v", err)
	}
	meta, ok := resp["meta"].(map[string]interface{})
	if !ok {
		t.Fatalf("expected meta object in response, got: %v", resp["meta"])
	}
	if meta["total"] != float64(42) {
		t.Errorf("expected meta.total=42, got %v", meta["total"])
	}
}

func TestSearchHandler_Search_AmenitiesParsed(t *testing.T) {
	capturedAmenities := []string{}
	svc := &mockSearchSvc{
		searchHotelsFn: func(ctx context.Context, params domain.SearchParams) ([]*domain.Hotel, int, error) {
			capturedAmenities = params.Amenities
			return []*domain.Hotel{}, 0, nil
		},
	}
	r := setupSearchRouter(svc)

	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/hotels/search?lat=10.76&lng=106.66&amenities=wifi,pool,gym", nil)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", w.Code)
	}
	if len(capturedAmenities) != 3 {
		t.Errorf("expected 3 amenities, got %d: %v", len(capturedAmenities), capturedAmenities)
	}
}

func TestSearchHandler_Search_PriceFilterPropagated(t *testing.T) {
	capturedMin, capturedMax := 0.0, 0.0
	svc := &mockSearchSvc{
		searchHotelsFn: func(ctx context.Context, params domain.SearchParams) ([]*domain.Hotel, int, error) {
			if params.PriceMin != nil {
				capturedMin = *params.PriceMin
			}
			if params.PriceMax != nil {
				capturedMax = *params.PriceMax
			}
			return []*domain.Hotel{}, 0, nil
		},
	}
	r := setupSearchRouter(svc)

	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/hotels/search?lat=10.76&lng=106.66&price_min=50&price_max=200", nil)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", w.Code)
	}
	if capturedMin != 50 {
		t.Errorf("expected price_min=50, got %f", capturedMin)
	}
	if capturedMax != 200 {
		t.Errorf("expected price_max=200, got %f", capturedMax)
	}
}

func TestSearchHandler_Search_AmenitiesWithSpacesTrimmed(t *testing.T) {
	capturedAmenities := []string{}
	svc := &mockSearchSvc{
		searchHotelsFn: func(ctx context.Context, params domain.SearchParams) ([]*domain.Hotel, int, error) {
			capturedAmenities = params.Amenities
			return []*domain.Hotel{}, 0, nil
		},
	}
	r := setupSearchRouter(svc)

	w := httptest.NewRecorder()
	// Spaces around amenity names should be trimmed.
	req := httptest.NewRequest(http.MethodGet, "/api/v1/hotels/search?lat=10.76&lng=106.66&amenities=wifi%2C+pool%2C+spa", nil)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", w.Code)
	}
	for _, a := range capturedAmenities {
		if len(a) > 0 && (a[0] == ' ' || a[len(a)-1] == ' ') {
			t.Errorf("amenity %q has leading/trailing space — should be trimmed", a)
		}
	}
}

func TestSearchHandler_Search_RadiusAndSortPropagated(t *testing.T) {
	capturedRadius := 0.0
	capturedSort := domain.SearchSort("")
	svc := &mockSearchSvc{
		searchHotelsFn: func(ctx context.Context, params domain.SearchParams) ([]*domain.Hotel, int, error) {
			capturedRadius = params.RadiusKm
			capturedSort = params.Sort
			return []*domain.Hotel{}, 0, nil
		},
	}
	r := setupSearchRouter(svc)

	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/hotels/search?lat=10.76&lng=106.66&radius=25&sort=price", nil)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", w.Code)
	}
	if capturedRadius != 25 {
		t.Errorf("expected radius=25, got %f", capturedRadius)
	}
	if capturedSort != domain.SearchSortPrice {
		t.Errorf("expected sort=price, got %q", capturedSort)
	}
}
