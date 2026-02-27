package handler_test

import (
	"booking-app/internal/domain"
	"booking-app/internal/dto/response"
	"booking-app/internal/handler"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
)

// mockBookingSvc implements handler.BookingServiceInterface for testing.
type mockBookingSvc struct {
	createBookingFn   func(ctx context.Context, input domain.CreateBookingInput) (*domain.Booking, error)
	getBookingFn      func(ctx context.Context, id int, callerUserID string) (*domain.Booking, error)
	listMyBookingsFn  func(ctx context.Context, userID string, page, limit int) ([]*domain.Booking, int, error)
	cancelBookingFn   func(ctx context.Context, id int, userID string) error
	getStatusFn       func(ctx context.Context, id int, callerUserID string) (string, error)
	initInventoryFn   func(ctx context.Context, roomID int, startDate time.Time, days int, total int) error
}

func (m *mockBookingSvc) CreateBooking(ctx context.Context, input domain.CreateBookingInput) (*domain.Booking, error) {
	if m.createBookingFn != nil {
		return m.createBookingFn(ctx, input)
	}
	return nil, errors.New("not configured")
}

func (m *mockBookingSvc) GetBooking(ctx context.Context, id int, callerUserID string) (*domain.Booking, error) {
	if m.getBookingFn != nil {
		return m.getBookingFn(ctx, id, callerUserID)
	}
	return nil, errors.New("not configured")
}

func (m *mockBookingSvc) ListMyBookings(ctx context.Context, userID string, page, limit int) ([]*domain.Booking, int, error) {
	if m.listMyBookingsFn != nil {
		return m.listMyBookingsFn(ctx, userID, page, limit)
	}
	return nil, 0, errors.New("not configured")
}

func (m *mockBookingSvc) CancelBooking(ctx context.Context, id int, userID string) error {
	if m.cancelBookingFn != nil {
		return m.cancelBookingFn(ctx, id, userID)
	}
	return errors.New("not configured")
}

func (m *mockBookingSvc) GetBookingStatus(ctx context.Context, id int, callerUserID string) (string, error) {
	if m.getStatusFn != nil {
		return m.getStatusFn(ctx, id, callerUserID)
	}
	return "", errors.New("not configured")
}

func (m *mockBookingSvc) InitializeInventory(ctx context.Context, roomID int, startDate time.Time, days int, total int) error {
	if m.initInventoryFn != nil {
		return m.initInventoryFn(ctx, roomID, startDate, days, total)
	}
	return nil
}

// buildBookingRouterWithAuth builds a test router that injects userID into context.
func buildBookingRouterWithAuth(svc handler.BookingServiceInterface, userID string) *gin.Engine {
	r := gin.New()
	h := handler.NewBookingHandler(svc)

	// Authenticated routes (inject userID like JWT middleware does)
	v1 := r.Group("/api/v1")
	v1.Use(func(c *gin.Context) {
		if userID != "" {
			c.Set("userID", userID)
		}
		c.Next()
	})
	v1.POST("/bookings", h.CreateBooking)
	v1.GET("/bookings", h.ListMyBookings)
	v1.GET("/bookings/:id", h.GetBooking)
	v1.GET("/bookings/:id/status", h.GetBookingStatus)
	v1.DELETE("/bookings/:id", h.CancelBooking)

	// Legacy route (no auth)
	api := r.Group("/api")
	api.POST("/bookings", h.CreateBookingLegacy)

	return r
}

// buildBookingRouterNoAuth builds a router without setting userID in context.
func buildBookingRouterNoAuth(svc handler.BookingServiceInterface) *gin.Engine {
	r := gin.New()
	h := handler.NewBookingHandler(svc)

	v1 := r.Group("/api/v1")
	v1.POST("/bookings", h.CreateBooking)
	v1.GET("/bookings", h.ListMyBookings)
	v1.GET("/bookings/:id", h.GetBooking)
	v1.GET("/bookings/:id/status", h.GetBookingStatus)
	v1.DELETE("/bookings/:id", h.CancelBooking)

	return r
}

func makeBookingRequest(r *gin.Engine, method, path string, body *strings.Reader) *httptest.ResponseRecorder {
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

// ---- POST /api/v1/bookings ----

func TestBookingHandler_CreateBooking_Success(t *testing.T) {
	svc := &mockBookingSvc{
		createBookingFn: func(_ context.Context, input domain.CreateBookingInput) (*domain.Booking, error) {
			if input.UserID != "user-jwt-1" {
				return nil, fmt.Errorf("unexpected userID: %s", input.UserID)
			}
			return &domain.Booking{
				ID:         1,
				UserID:     input.UserID,
				RoomID:     input.RoomID,
				StartDate:  input.StartDate,
				EndDate:    input.EndDate,
				TotalPrice: 300.0,
				Status:     "confirmed",
				CreatedAt:  time.Now(),
			}, nil
		},
	}

	r := buildBookingRouterWithAuth(svc, "user-jwt-1")
	body := strings.NewReader(`{"room_id":1,"start_date":"2026-03-01","end_date":"2026-03-04"}`)
	w := makeBookingRequest(r, http.MethodPost, "/api/v1/bookings", body)

	if w.Code != http.StatusCreated {
		t.Errorf("expected 201, got %d: %s", w.Code, w.Body.String())
	}

	var resp response.APIResponse
	if err := json.NewDecoder(w.Body).Decode(&resp); err != nil {
		t.Fatalf("decode error: %v", err)
	}
	if !resp.Success {
		t.Errorf("expected success=true, error: %s", resp.Error)
	}
}

func TestBookingHandler_CreateBooking_UserIDFromJWT_NotFromBody(t *testing.T) {
	capturedUserID := ""
	svc := &mockBookingSvc{
		createBookingFn: func(_ context.Context, input domain.CreateBookingInput) (*domain.Booking, error) {
			capturedUserID = input.UserID
			return &domain.Booking{ID: 1, UserID: input.UserID, Status: "confirmed"}, nil
		},
	}

	r := buildBookingRouterWithAuth(svc, "jwt-user-id")
	// body includes user_id which should be IGNORED — userID must come from JWT context
	body := strings.NewReader(`{"room_id":1,"start_date":"2026-03-01","end_date":"2026-03-04","user_id":"injected-attacker-id"}`)
	w := makeBookingRequest(r, http.MethodPost, "/api/v1/bookings", body)

	if w.Code != http.StatusCreated {
		t.Errorf("expected 201, got %d: %s", w.Code, w.Body.String())
	}
	// The userID used MUST come from JWT context, not body
	if capturedUserID != "jwt-user-id" {
		t.Errorf("expected userID from JWT context 'jwt-user-id', got '%s'", capturedUserID)
	}
}

func TestBookingHandler_CreateBooking_MissingFields_Returns400(t *testing.T) {
	svc := &mockBookingSvc{}
	r := buildBookingRouterWithAuth(svc, "user-1")
	body := strings.NewReader(`{"room_id":1}`) // missing start_date, end_date
	w := makeBookingRequest(r, http.MethodPost, "/api/v1/bookings", body)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestBookingHandler_CreateBooking_InvalidDateFormat_Returns400(t *testing.T) {
	svc := &mockBookingSvc{}
	r := buildBookingRouterWithAuth(svc, "user-1")
	body := strings.NewReader(`{"room_id":1,"start_date":"not-a-date","end_date":"2026-03-04"}`)
	w := makeBookingRequest(r, http.MethodPost, "/api/v1/bookings", body)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestBookingHandler_CreateBooking_NotAvailable_Returns409(t *testing.T) {
	svc := &mockBookingSvc{
		createBookingFn: func(_ context.Context, _ domain.CreateBookingInput) (*domain.Booking, error) {
			return nil, domain.ErrNotAvailable
		},
	}
	r := buildBookingRouterWithAuth(svc, "user-1")
	body := strings.NewReader(`{"room_id":1,"start_date":"2026-03-01","end_date":"2026-03-04"}`)
	w := makeBookingRequest(r, http.MethodPost, "/api/v1/bookings", body)

	if w.Code != http.StatusConflict {
		t.Errorf("expected 409, got %d", w.Code)
	}
}

func TestBookingHandler_CreateBooking_BadRequest_Returns400(t *testing.T) {
	svc := &mockBookingSvc{
		createBookingFn: func(_ context.Context, _ domain.CreateBookingInput) (*domain.Booking, error) {
			return nil, domain.ErrBadRequest
		},
	}
	r := buildBookingRouterWithAuth(svc, "user-1")
	body := strings.NewReader(`{"room_id":1,"start_date":"2026-03-04","end_date":"2026-03-01"}`)
	w := makeBookingRequest(r, http.MethodPost, "/api/v1/bookings", body)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestBookingHandler_CreateBooking_InternalError_Returns500(t *testing.T) {
	svc := &mockBookingSvc{
		createBookingFn: func(_ context.Context, _ domain.CreateBookingInput) (*domain.Booking, error) {
			return nil, domain.ErrInternal
		},
	}
	r := buildBookingRouterWithAuth(svc, "user-1")
	body := strings.NewReader(`{"room_id":1,"start_date":"2026-03-01","end_date":"2026-03-04"}`)
	w := makeBookingRequest(r, http.MethodPost, "/api/v1/bookings", body)

	if w.Code != http.StatusInternalServerError {
		t.Errorf("expected 500, got %d", w.Code)
	}
}

// ---- GET /api/v1/bookings ----

func TestBookingHandler_ListMyBookings_Success(t *testing.T) {
	svc := &mockBookingSvc{
		listMyBookingsFn: func(_ context.Context, userID string, page, limit int) ([]*domain.Booking, int, error) {
			return []*domain.Booking{
				{ID: 1, UserID: userID, Status: "confirmed"},
				{ID: 2, UserID: userID, Status: "confirmed"},
			}, 2, nil
		},
	}
	r := buildBookingRouterWithAuth(svc, "user-1")
	w := makeBookingRequest(r, http.MethodGet, "/api/v1/bookings", nil)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d: %s", w.Code, w.Body.String())
	}

	var resp response.APIResponse
	if err := json.NewDecoder(w.Body).Decode(&resp); err != nil {
		t.Fatalf("decode error: %v", err)
	}
	if resp.Meta == nil {
		t.Error("expected meta in paginated response")
	}
	if resp.Meta != nil && resp.Meta.Total != 2 {
		t.Errorf("expected total=2, got %d", resp.Meta.Total)
	}
}

func TestBookingHandler_ListMyBookings_Pagination(t *testing.T) {
	capturedPage, capturedLimit := 0, 0
	svc := &mockBookingSvc{
		listMyBookingsFn: func(_ context.Context, _ string, page, limit int) ([]*domain.Booking, int, error) {
			capturedPage = page
			capturedLimit = limit
			return []*domain.Booking{}, 0, nil
		},
	}
	r := buildBookingRouterWithAuth(svc, "user-1")
	w := makeBookingRequest(r, http.MethodGet, "/api/v1/bookings?page=2&limit=5", nil)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", w.Code)
	}
	if capturedPage != 2 {
		t.Errorf("expected page=2, got %d", capturedPage)
	}
	if capturedLimit != 5 {
		t.Errorf("expected limit=5, got %d", capturedLimit)
	}
}

func TestBookingHandler_ListMyBookings_NoAuth_Returns401(t *testing.T) {
	svc := &mockBookingSvc{}
	r := buildBookingRouterNoAuth(svc)
	w := makeBookingRequest(r, http.MethodGet, "/api/v1/bookings", nil)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d: %s", w.Code, w.Body.String())
	}
}

// ---- GET /api/v1/bookings/:id ----

func TestBookingHandler_GetBooking_Success(t *testing.T) {
	svc := &mockBookingSvc{
		getBookingFn: func(_ context.Context, id int, callerUserID string) (*domain.Booking, error) {
			return &domain.Booking{
				ID:     id,
				UserID: callerUserID,
				Status: "confirmed",
			}, nil
		},
	}
	r := buildBookingRouterWithAuth(svc, "user-1")
	w := makeBookingRequest(r, http.MethodGet, "/api/v1/bookings/10", nil)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d: %s", w.Code, w.Body.String())
	}
}

func TestBookingHandler_GetBooking_NotFound_Returns404(t *testing.T) {
	svc := &mockBookingSvc{
		getBookingFn: func(_ context.Context, id int, _ string) (*domain.Booking, error) {
			return nil, domain.ErrNotFound
		},
	}
	r := buildBookingRouterWithAuth(svc, "user-1")
	w := makeBookingRequest(r, http.MethodGet, "/api/v1/bookings/999", nil)

	if w.Code != http.StatusNotFound {
		t.Errorf("expected 404, got %d", w.Code)
	}
}

func TestBookingHandler_GetBooking_Forbidden_Returns403(t *testing.T) {
	svc := &mockBookingSvc{
		getBookingFn: func(_ context.Context, id int, _ string) (*domain.Booking, error) {
			return nil, domain.ErrForbidden
		},
	}
	r := buildBookingRouterWithAuth(svc, "wrong-user")
	w := makeBookingRequest(r, http.MethodGet, "/api/v1/bookings/10", nil)

	if w.Code != http.StatusForbidden {
		t.Errorf("expected 403, got %d", w.Code)
	}
}

func TestBookingHandler_GetBooking_InvalidID_Returns400(t *testing.T) {
	svc := &mockBookingSvc{}
	r := buildBookingRouterWithAuth(svc, "user-1")
	w := makeBookingRequest(r, http.MethodGet, "/api/v1/bookings/abc", nil)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestBookingHandler_GetBooking_NoAuth_Returns401(t *testing.T) {
	svc := &mockBookingSvc{}
	r := buildBookingRouterNoAuth(svc)
	w := makeBookingRequest(r, http.MethodGet, "/api/v1/bookings/10", nil)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d: %s", w.Code, w.Body.String())
	}
}

// ---- GET /api/v1/bookings/:id/status ----

func TestBookingHandler_GetBookingStatus_Success(t *testing.T) {
	svc := &mockBookingSvc{
		getStatusFn: func(_ context.Context, id int, callerUserID string) (string, error) {
			return "confirmed", nil
		},
	}
	r := buildBookingRouterWithAuth(svc, "user-1")
	w := makeBookingRequest(r, http.MethodGet, "/api/v1/bookings/5/status", nil)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d: %s", w.Code, w.Body.String())
	}

	var resp response.APIResponse
	if err := json.NewDecoder(w.Body).Decode(&resp); err != nil {
		t.Fatalf("decode error: %v", err)
	}
	if !resp.Success {
		t.Errorf("expected success=true")
	}
}

func TestBookingHandler_GetBookingStatus_Forbidden_Returns403(t *testing.T) {
	svc := &mockBookingSvc{
		getStatusFn: func(_ context.Context, id int, _ string) (string, error) {
			return "", domain.ErrForbidden
		},
	}
	r := buildBookingRouterWithAuth(svc, "wrong-user")
	w := makeBookingRequest(r, http.MethodGet, "/api/v1/bookings/5/status", nil)

	if w.Code != http.StatusForbidden {
		t.Errorf("expected 403, got %d", w.Code)
	}
}

func TestBookingHandler_GetBookingStatus_InvalidID_Returns400(t *testing.T) {
	svc := &mockBookingSvc{}
	r := buildBookingRouterWithAuth(svc, "user-1")
	w := makeBookingRequest(r, http.MethodGet, "/api/v1/bookings/not-a-number/status", nil)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

// ---- DELETE /api/v1/bookings/:id ----

func TestBookingHandler_CancelBooking_Success(t *testing.T) {
	svc := &mockBookingSvc{
		cancelBookingFn: func(_ context.Context, id int, userID string) error {
			return nil
		},
	}
	r := buildBookingRouterWithAuth(svc, "user-1")
	w := makeBookingRequest(r, http.MethodDelete, "/api/v1/bookings/10", nil)

	if w.Code != http.StatusNoContent {
		t.Errorf("expected 204, got %d: %s", w.Code, w.Body.String())
	}
}

func TestBookingHandler_CancelBooking_Unauthorized_Returns403(t *testing.T) {
	svc := &mockBookingSvc{
		cancelBookingFn: func(_ context.Context, id int, userID string) error {
			return domain.ErrUnauthorized
		},
	}
	r := buildBookingRouterWithAuth(svc, "wrong-user")
	w := makeBookingRequest(r, http.MethodDelete, "/api/v1/bookings/10", nil)

	if w.Code != http.StatusForbidden {
		t.Errorf("expected 403, got %d", w.Code)
	}
}

func TestBookingHandler_CancelBooking_Conflict_Returns409(t *testing.T) {
	svc := &mockBookingSvc{
		cancelBookingFn: func(_ context.Context, id int, userID string) error {
			return domain.ErrConflict
		},
	}
	r := buildBookingRouterWithAuth(svc, "user-1")
	w := makeBookingRequest(r, http.MethodDelete, "/api/v1/bookings/10", nil)

	if w.Code != http.StatusConflict {
		t.Errorf("expected 409, got %d", w.Code)
	}
}

func TestBookingHandler_CancelBooking_NotFound_Returns404(t *testing.T) {
	svc := &mockBookingSvc{
		cancelBookingFn: func(_ context.Context, id int, userID string) error {
			return domain.ErrNotFound
		},
	}
	r := buildBookingRouterWithAuth(svc, "user-1")
	w := makeBookingRequest(r, http.MethodDelete, "/api/v1/bookings/999", nil)

	if w.Code != http.StatusNotFound {
		t.Errorf("expected 404, got %d", w.Code)
	}
}

func TestBookingHandler_CancelBooking_InvalidID_Returns400(t *testing.T) {
	svc := &mockBookingSvc{}
	r := buildBookingRouterWithAuth(svc, "user-1")
	w := makeBookingRequest(r, http.MethodDelete, "/api/v1/bookings/abc", nil)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestBookingHandler_CancelBooking_NoAuth_Returns401(t *testing.T) {
	svc := &mockBookingSvc{}
	r := buildBookingRouterNoAuth(svc)
	w := makeBookingRequest(r, http.MethodDelete, "/api/v1/bookings/10", nil)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d: %s", w.Code, w.Body.String())
	}
}

// ---- Legacy POST /api/bookings ----

func TestBookingHandler_LegacyCreateBooking_Success(t *testing.T) {
	svc := &mockBookingSvc{
		createBookingFn: func(_ context.Context, input domain.CreateBookingInput) (*domain.Booking, error) {
			return &domain.Booking{
				ID:         99,
				UserID:     input.UserID,
				RoomID:     input.RoomID,
				TotalPrice: 200.0,
				Status:     "confirmed",
				CreatedAt:  time.Now(),
			}, nil
		},
	}
	r := buildBookingRouterWithAuth(svc, "")
	body := strings.NewReader(`{"user_id":"legacy-user","room_id":1,"start_date":"2026-03-01","end_date":"2026-03-03"}`)
	w := makeBookingRequest(r, http.MethodPost, "/api/bookings", body)

	if w.Code != http.StatusCreated {
		t.Errorf("expected 201, got %d: %s", w.Code, w.Body.String())
	}
}

func TestBookingHandler_LegacyCreateBooking_MissingUserID_Returns400(t *testing.T) {
	svc := &mockBookingSvc{}
	r := buildBookingRouterWithAuth(svc, "")
	body := strings.NewReader(`{"room_id":1,"start_date":"2026-03-01","end_date":"2026-03-03"}`)
	w := makeBookingRequest(r, http.MethodPost, "/api/bookings", body)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}
