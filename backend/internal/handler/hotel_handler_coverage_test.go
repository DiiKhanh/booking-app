package handler_test

import (
	"booking-app/internal/domain"
	"booking-app/internal/service"
	"context"
	"net/http"
	"strings"
	"testing"
)

// --- Coverage tests for uncovered branches ---

// ListRoomsByHotel in hotel handler (stub path)
func TestHotelHandler_ListRoomsByHotel_HotelNotFound_Returns404(t *testing.T) {
	svc := &mockHotelSvc{
		getHotelByIDFn: func(ctx context.Context, id int) (*domain.Hotel, error) {
			return nil, domain.ErrNotFound
		},
	}
	r := buildHotelRouter(svc)

	w := makeHotelRequest(r, http.MethodGet, "/api/v1/hotels/999/rooms", nil)

	if w.Code != http.StatusNotFound {
		t.Errorf("expected 404, got %d", w.Code)
	}
}

func TestHotelHandler_ListRoomsByHotel_InvalidID_Returns400(t *testing.T) {
	svc := &mockHotelSvc{}
	r := buildHotelRouter(svc)

	w := makeHotelRequest(r, http.MethodGet, "/api/v1/hotels/abc/rooms", nil)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

// ListMyHotels
func TestHotelHandler_ListMyHotels_Returns200(t *testing.T) {
	svc := &mockHotelSvc{
		listByOwnerFn: func(ctx context.Context, ownerID string, page, limit int) ([]*domain.Hotel, int, error) {
			return []*domain.Hotel{newTestHotel()}, 1, nil
		},
	}
	r := buildHotelRouter(svc)

	w := makeHotelRequest(r, http.MethodGet, "/api/v1/owner/hotels", nil)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d: %s", w.Code, w.Body.String())
	}
}

func TestHotelHandler_ListMyHotels_ServiceError_Returns500(t *testing.T) {
	svc := &mockHotelSvc{
		listByOwnerFn: func(ctx context.Context, ownerID string, page, limit int) ([]*domain.Hotel, int, error) {
			return nil, 0, domain.ErrInternal
		},
	}
	r := buildHotelRouter(svc)

	w := makeHotelRequest(r, http.MethodGet, "/api/v1/owner/hotels", nil)

	if w.Code != http.StatusInternalServerError {
		t.Errorf("expected 500, got %d", w.Code)
	}
}

// UpdateHotel - invalid ID
func TestHotelHandler_UpdateHotel_InvalidID_Returns400(t *testing.T) {
	svc := &mockHotelSvc{}
	r := buildHotelRouter(svc)

	body := strings.NewReader(`{"name":"Test"}`)
	w := makeHotelRequest(r, http.MethodPut, "/api/v1/owner/hotels/abc", body)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

// DeleteHotel - invalid ID
func TestHotelHandler_DeleteHotel_InvalidID_Returns400(t *testing.T) {
	svc := &mockHotelSvc{}
	r := buildHotelRouter(svc)

	w := makeHotelRequest(r, http.MethodDelete, "/api/v1/owner/hotels/xyz", nil)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

// ApproveHotel - invalid ID
func TestHotelHandler_ApproveHotel_InvalidID_Returns400(t *testing.T) {
	svc := &mockHotelSvc{}
	r := buildHotelRouter(svc)

	w := makeHotelRequest(r, http.MethodPut, "/api/v1/admin/hotels/abc/approve", nil)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

// RejectHotel - invalid ID
func TestHotelHandler_RejectHotel_InvalidID_Returns400(t *testing.T) {
	svc := &mockHotelSvc{}
	r := buildHotelRouter(svc)

	w := makeHotelRequest(r, http.MethodPut, "/api/v1/admin/hotels/abc/reject", nil)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

// handleHotelError - ErrForbidden branch
func TestHotelHandler_CreateHotel_ForbiddenError_Returns403(t *testing.T) {
	svc := &mockHotelSvc{
		createHotelFn: func(ctx context.Context, ownerID string, input service.CreateHotelInput) (*domain.Hotel, error) {
			return nil, domain.ErrForbidden
		},
	}
	r := buildHotelRouter(svc)

	body := strings.NewReader(`{"name":"Grand Hotel"}`)
	w := makeHotelRequest(r, http.MethodPost, "/api/v1/owner/hotels", body)

	if w.Code != http.StatusForbidden {
		t.Errorf("expected 403, got %d", w.Code)
	}
}

// ListPendingHotels - service error
func TestHotelHandler_ListPendingHotels_ServiceError_Returns500(t *testing.T) {
	svc := &mockHotelSvc{
		listPendingFn: func(ctx context.Context, page, limit int) ([]*domain.Hotel, int, error) {
			return nil, 0, domain.ErrInternal
		},
	}
	r := buildHotelRouter(svc)

	w := makeHotelRequest(r, http.MethodGet, "/api/v1/admin/hotels/pending", nil)

	if w.Code != http.StatusInternalServerError {
		t.Errorf("expected 500, got %d", w.Code)
	}
}

// ApproveHotel - not found
func TestHotelHandler_ApproveHotel_NotFound_Returns404(t *testing.T) {
	svc := &mockHotelSvc{
		approveHotelFn: func(ctx context.Context, id int) error {
			return domain.ErrNotFound
		},
	}
	r := buildHotelRouter(svc)

	w := makeHotelRequest(r, http.MethodPut, "/api/v1/admin/hotels/999/approve", nil)

	if w.Code != http.StatusNotFound {
		t.Errorf("expected 404, got %d", w.Code)
	}
}

// calculatePages with zero limit (edge case)
func TestHotelHandler_ListHotels_WithPageQueryParam(t *testing.T) {
	svc := &mockHotelSvc{
		listApprovedFn: func(ctx context.Context, page, limit int) ([]*domain.Hotel, int, error) {
			if page != 2 {
				t.Errorf("expected page 2, got %d", page)
			}
			return []*domain.Hotel{}, 0, nil
		},
	}
	r := buildHotelRouter(svc)

	w := makeHotelRequest(r, http.MethodGet, "/api/v1/hotels?page=2&limit=10", nil)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", w.Code)
	}
}
