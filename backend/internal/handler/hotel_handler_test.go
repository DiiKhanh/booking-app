package handler_test

import (
	"booking-app/internal/domain"
	"booking-app/internal/handler"
	"booking-app/internal/service"
	"context"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
)

// --- Mock HotelService ---

type mockHotelSvc struct {
	createHotelFn  func(ctx context.Context, ownerID string, input service.CreateHotelInput) (*domain.Hotel, error)
	getHotelByIDFn func(ctx context.Context, id int) (*domain.Hotel, error)
	listApprovedFn func(ctx context.Context, page, limit int) ([]*domain.Hotel, int, error)
	listByOwnerFn  func(ctx context.Context, ownerID string, page, limit int) ([]*domain.Hotel, int, error)
	listPendingFn  func(ctx context.Context, page, limit int) ([]*domain.Hotel, int, error)
	updateHotelFn  func(ctx context.Context, id int, ownerID string, input service.UpdateHotelInput) (*domain.Hotel, error)
	deleteHotelFn  func(ctx context.Context, id int, ownerID string) error
	approveHotelFn func(ctx context.Context, id int) error
	rejectHotelFn  func(ctx context.Context, id int) error
}

func (m *mockHotelSvc) CreateHotel(ctx context.Context, ownerID string, input service.CreateHotelInput) (*domain.Hotel, error) {
	if m.createHotelFn != nil {
		return m.createHotelFn(ctx, ownerID, input)
	}
	return nil, fmt.Errorf("not configured")
}

func (m *mockHotelSvc) GetHotelByID(ctx context.Context, id int) (*domain.Hotel, error) {
	if m.getHotelByIDFn != nil {
		return m.getHotelByIDFn(ctx, id)
	}
	return nil, fmt.Errorf("not configured")
}

func (m *mockHotelSvc) ListApprovedHotels(ctx context.Context, page, limit int) ([]*domain.Hotel, int, error) {
	if m.listApprovedFn != nil {
		return m.listApprovedFn(ctx, page, limit)
	}
	return nil, 0, fmt.Errorf("not configured")
}

func (m *mockHotelSvc) ListHotelsByOwner(ctx context.Context, ownerID string, page, limit int) ([]*domain.Hotel, int, error) {
	if m.listByOwnerFn != nil {
		return m.listByOwnerFn(ctx, ownerID, page, limit)
	}
	return nil, 0, fmt.Errorf("not configured")
}

func (m *mockHotelSvc) ListPendingHotels(ctx context.Context, page, limit int) ([]*domain.Hotel, int, error) {
	if m.listPendingFn != nil {
		return m.listPendingFn(ctx, page, limit)
	}
	return nil, 0, fmt.Errorf("not configured")
}

func (m *mockHotelSvc) UpdateHotel(ctx context.Context, id int, ownerID string, input service.UpdateHotelInput) (*domain.Hotel, error) {
	if m.updateHotelFn != nil {
		return m.updateHotelFn(ctx, id, ownerID, input)
	}
	return nil, fmt.Errorf("not configured")
}

func (m *mockHotelSvc) DeleteHotel(ctx context.Context, id int, ownerID string) error {
	if m.deleteHotelFn != nil {
		return m.deleteHotelFn(ctx, id, ownerID)
	}
	return fmt.Errorf("not configured")
}

func (m *mockHotelSvc) ApproveHotel(ctx context.Context, id int) error {
	if m.approveHotelFn != nil {
		return m.approveHotelFn(ctx, id)
	}
	return fmt.Errorf("not configured")
}

func (m *mockHotelSvc) RejectHotel(ctx context.Context, id int) error {
	if m.rejectHotelFn != nil {
		return m.rejectHotelFn(ctx, id)
	}
	return fmt.Errorf("not configured")
}

func buildHotelRouter(svc handler.HotelServiceInterface) *gin.Engine {
	r := gin.New()
	h := handler.NewHotelHandler(svc)

	public := r.Group("/api/v1")
	public.GET("/hotels", h.ListHotels)
	public.GET("/hotels/:id", h.GetHotel)
	public.GET("/hotels/:id/rooms", h.ListRoomsByHotel)

	owner := r.Group("/api/v1/owner")
	owner.Use(func(c *gin.Context) {
		c.Set("userID", "owner-uuid-test")
		c.Set("userRole", "owner")
		c.Next()
	})
	owner.POST("/hotels", h.CreateHotel)
	owner.GET("/hotels", h.ListMyHotels)
	owner.PUT("/hotels/:id", h.UpdateHotel)
	owner.DELETE("/hotels/:id", h.DeleteHotel)

	admin := r.Group("/api/v1/admin")
	admin.Use(func(c *gin.Context) {
		c.Set("userID", "admin-uuid-test")
		c.Set("userRole", "admin")
		c.Next()
	})
	admin.GET("/hotels/pending", h.ListPendingHotels)
	admin.PUT("/hotels/:id/approve", h.ApproveHotel)
	admin.PUT("/hotels/:id/reject", h.RejectHotel)

	return r
}

func newTestHotel() *domain.Hotel {
	return &domain.Hotel{
		ID:        1,
		Name:      "Test Hotel",
		OwnerID:   "owner-uuid-test",
		Status:    domain.HotelStatusApproved,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}
}

func makeHotelRequest(r *gin.Engine, method, path string, body *strings.Reader) *httptest.ResponseRecorder {
	var req *http.Request
	if body != nil {
		req = httptest.NewRequest(method, path, body)
	} else {
		req = httptest.NewRequest(method, path, nil)
	}
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	return w
}

// --- Tests: GET /hotels ---

func TestHotelHandler_ListHotels_Returns200(t *testing.T) {
	svc := &mockHotelSvc{
		listApprovedFn: func(ctx context.Context, page, limit int) ([]*domain.Hotel, int, error) {
			return []*domain.Hotel{newTestHotel()}, 1, nil
		},
	}
	r := buildHotelRouter(svc)

	w := makeHotelRequest(r, http.MethodGet, "/api/v1/hotels", nil)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d: %s", w.Code, w.Body.String())
	}
}

func TestHotelHandler_ListHotels_ServiceError_Returns500(t *testing.T) {
	svc := &mockHotelSvc{
		listApprovedFn: func(ctx context.Context, page, limit int) ([]*domain.Hotel, int, error) {
			return nil, 0, domain.ErrInternal
		},
	}
	r := buildHotelRouter(svc)

	w := makeHotelRequest(r, http.MethodGet, "/api/v1/hotels", nil)

	if w.Code != http.StatusInternalServerError {
		t.Errorf("expected 500, got %d", w.Code)
	}
}

// --- Tests: GET /hotels/:id ---

func TestHotelHandler_GetHotel_Returns200(t *testing.T) {
	svc := &mockHotelSvc{
		getHotelByIDFn: func(ctx context.Context, id int) (*domain.Hotel, error) {
			return newTestHotel(), nil
		},
	}
	r := buildHotelRouter(svc)

	w := makeHotelRequest(r, http.MethodGet, "/api/v1/hotels/1", nil)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d: %s", w.Code, w.Body.String())
	}
}

func TestHotelHandler_GetHotel_NotFound_Returns404(t *testing.T) {
	svc := &mockHotelSvc{
		getHotelByIDFn: func(ctx context.Context, id int) (*domain.Hotel, error) {
			return nil, domain.ErrNotFound
		},
	}
	r := buildHotelRouter(svc)

	w := makeHotelRequest(r, http.MethodGet, "/api/v1/hotels/999", nil)

	if w.Code != http.StatusNotFound {
		t.Errorf("expected 404, got %d", w.Code)
	}
}

func TestHotelHandler_GetHotel_InvalidID_Returns400(t *testing.T) {
	svc := &mockHotelSvc{}
	r := buildHotelRouter(svc)

	w := makeHotelRequest(r, http.MethodGet, "/api/v1/hotels/abc", nil)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

// --- Tests: POST /owner/hotels ---

func TestHotelHandler_CreateHotel_Returns201(t *testing.T) {
	svc := &mockHotelSvc{
		createHotelFn: func(ctx context.Context, ownerID string, input service.CreateHotelInput) (*domain.Hotel, error) {
			h := newTestHotel()
			h.Name = input.Name
			return h, nil
		},
	}
	r := buildHotelRouter(svc)

	body := strings.NewReader(`{"name":"Grand Hotel","location":"Downtown","city":"Hanoi","country":"Vietnam","star_rating":4}`)
	w := makeHotelRequest(r, http.MethodPost, "/api/v1/owner/hotels", body)

	if w.Code != http.StatusCreated {
		t.Errorf("expected 201, got %d: %s", w.Code, w.Body.String())
	}
}

func TestHotelHandler_CreateHotel_ServiceBadRequest_Returns400(t *testing.T) {
	svc := &mockHotelSvc{
		createHotelFn: func(ctx context.Context, ownerID string, input service.CreateHotelInput) (*domain.Hotel, error) {
			return nil, domain.ErrBadRequest
		},
	}
	r := buildHotelRouter(svc)

	body := strings.NewReader(`{"name":"","location":"Downtown"}`)
	w := makeHotelRequest(r, http.MethodPost, "/api/v1/owner/hotels", body)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d: %s", w.Code, w.Body.String())
	}
}

// --- Tests: PUT /owner/hotels/:id ---

func TestHotelHandler_UpdateHotel_Returns200(t *testing.T) {
	svc := &mockHotelSvc{
		updateHotelFn: func(ctx context.Context, id int, ownerID string, input service.UpdateHotelInput) (*domain.Hotel, error) {
			h := newTestHotel()
			h.Name = input.Name
			return h, nil
		},
	}
	r := buildHotelRouter(svc)

	body := strings.NewReader(`{"name":"Updated Hotel"}`)
	w := makeHotelRequest(r, http.MethodPut, "/api/v1/owner/hotels/1", body)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d: %s", w.Code, w.Body.String())
	}
}

func TestHotelHandler_UpdateHotel_Unauthorized_Returns403(t *testing.T) {
	svc := &mockHotelSvc{
		updateHotelFn: func(ctx context.Context, id int, ownerID string, input service.UpdateHotelInput) (*domain.Hotel, error) {
			return nil, domain.ErrUnauthorized
		},
	}
	r := buildHotelRouter(svc)

	body := strings.NewReader(`{"name":"Hacked Hotel"}`)
	w := makeHotelRequest(r, http.MethodPut, "/api/v1/owner/hotels/1", body)

	if w.Code != http.StatusForbidden {
		t.Errorf("expected 403, got %d", w.Code)
	}
}

// --- Tests: DELETE /owner/hotels/:id ---

func TestHotelHandler_DeleteHotel_Returns204(t *testing.T) {
	svc := &mockHotelSvc{
		deleteHotelFn: func(ctx context.Context, id int, ownerID string) error {
			return nil
		},
	}
	r := buildHotelRouter(svc)

	w := makeHotelRequest(r, http.MethodDelete, "/api/v1/owner/hotels/1", nil)

	if w.Code != http.StatusNoContent {
		t.Errorf("expected 204, got %d: %s", w.Code, w.Body.String())
	}
}

func TestHotelHandler_DeleteHotel_NotFound_Returns404(t *testing.T) {
	svc := &mockHotelSvc{
		deleteHotelFn: func(ctx context.Context, id int, ownerID string) error {
			return domain.ErrNotFound
		},
	}
	r := buildHotelRouter(svc)

	w := makeHotelRequest(r, http.MethodDelete, "/api/v1/owner/hotels/999", nil)

	if w.Code != http.StatusNotFound {
		t.Errorf("expected 404, got %d", w.Code)
	}
}

// --- Tests: GET /admin/hotels/pending ---

func TestHotelHandler_ListPendingHotels_Returns200(t *testing.T) {
	svc := &mockHotelSvc{
		listPendingFn: func(ctx context.Context, page, limit int) ([]*domain.Hotel, int, error) {
			h := newTestHotel()
			h.Status = domain.HotelStatusPending
			return []*domain.Hotel{h}, 1, nil
		},
	}
	r := buildHotelRouter(svc)

	w := makeHotelRequest(r, http.MethodGet, "/api/v1/admin/hotels/pending", nil)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d: %s", w.Code, w.Body.String())
	}
}

// --- Tests: PUT /admin/hotels/:id/approve ---

func TestHotelHandler_ApproveHotel_Returns200(t *testing.T) {
	svc := &mockHotelSvc{
		approveHotelFn: func(ctx context.Context, id int) error {
			return nil
		},
	}
	r := buildHotelRouter(svc)

	w := makeHotelRequest(r, http.MethodPut, "/api/v1/admin/hotels/1/approve", nil)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d: %s", w.Code, w.Body.String())
	}
}

func TestHotelHandler_ApproveHotel_Conflict_Returns409(t *testing.T) {
	svc := &mockHotelSvc{
		approveHotelFn: func(ctx context.Context, id int) error {
			return domain.ErrConflict
		},
	}
	r := buildHotelRouter(svc)

	w := makeHotelRequest(r, http.MethodPut, "/api/v1/admin/hotels/1/approve", nil)

	if w.Code != http.StatusConflict {
		t.Errorf("expected 409, got %d", w.Code)
	}
}

// --- Tests: PUT /admin/hotels/:id/reject ---

func TestHotelHandler_RejectHotel_Returns200(t *testing.T) {
	svc := &mockHotelSvc{
		rejectHotelFn: func(ctx context.Context, id int) error {
			return nil
		},
	}
	r := buildHotelRouter(svc)

	body := strings.NewReader(`{"reason":"Does not meet standards"}`)
	w := makeHotelRequest(r, http.MethodPut, "/api/v1/admin/hotels/1/reject", body)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d: %s", w.Code, w.Body.String())
	}
}

func TestHotelHandler_RejectHotel_NotFound_Returns404(t *testing.T) {
	svc := &mockHotelSvc{
		rejectHotelFn: func(ctx context.Context, id int) error {
			return domain.ErrNotFound
		},
	}
	r := buildHotelRouter(svc)

	w := makeHotelRequest(r, http.MethodPut, "/api/v1/admin/hotels/1/reject", nil)

	if w.Code != http.StatusNotFound {
		t.Errorf("expected 404, got %d", w.Code)
	}
}
