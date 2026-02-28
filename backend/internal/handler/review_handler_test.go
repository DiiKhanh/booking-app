package handler_test

import (
	"booking-app/internal/domain"
	"booking-app/internal/handler"
	"booking-app/internal/service"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
)

// --- Mock ReviewService ---

type mockReviewSvc struct {
	createReviewFn       func(ctx context.Context, userID string, hotelID int, input service.CreateReviewInput) (*domain.Review, error)
	listReviewsByHotelFn func(ctx context.Context, hotelID, page, limit int) ([]*domain.Review, int, error)
	updateReviewFn       func(ctx context.Context, id int, callerUserID string, input service.UpdateReviewInput) (*domain.Review, error)
	deleteReviewFn       func(ctx context.Context, id int, callerUserID, callerRole string) error
}

func (m *mockReviewSvc) CreateReview(ctx context.Context, userID string, hotelID int, input service.CreateReviewInput) (*domain.Review, error) {
	if m.createReviewFn != nil {
		return m.createReviewFn(ctx, userID, hotelID, input)
	}
	return nil, fmt.Errorf("not configured")
}

func (m *mockReviewSvc) ListReviewsByHotel(ctx context.Context, hotelID, page, limit int) ([]*domain.Review, int, error) {
	if m.listReviewsByHotelFn != nil {
		return m.listReviewsByHotelFn(ctx, hotelID, page, limit)
	}
	return nil, 0, fmt.Errorf("not configured")
}

func (m *mockReviewSvc) UpdateReview(ctx context.Context, id int, callerUserID string, input service.UpdateReviewInput) (*domain.Review, error) {
	if m.updateReviewFn != nil {
		return m.updateReviewFn(ctx, id, callerUserID, input)
	}
	return nil, fmt.Errorf("not configured")
}

func (m *mockReviewSvc) DeleteReview(ctx context.Context, id int, callerUserID, callerRole string) error {
	if m.deleteReviewFn != nil {
		return m.deleteReviewFn(ctx, id, callerUserID, callerRole)
	}
	return fmt.Errorf("not configured")
}

// --- helpers ---

func setupReviewRouter(svc *mockReviewSvc, userID, role string) *gin.Engine {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	h := handler.NewReviewHandler(svc)

	r.POST("/api/v1/hotels/:id/reviews", func(c *gin.Context) {
		c.Set("userID", userID)
		c.Set("userRole", role)
		h.CreateReview(c)
	})
	r.GET("/api/v1/hotels/:id/reviews", h.ListReviewsByHotel)
	r.PUT("/api/v1/reviews/:id", func(c *gin.Context) {
		c.Set("userID", userID)
		c.Set("userRole", role)
		h.UpdateReview(c)
	})
	r.DELETE("/api/v1/reviews/:id", func(c *gin.Context) {
		c.Set("userID", userID)
		c.Set("userRole", role)
		h.DeleteReview(c)
	})
	return r
}

func sampleReview() *domain.Review {
	return &domain.Review{
		ID:        1,
		UserID:    "user-abc",
		HotelID:   10,
		BookingID: 5,
		Rating:    4,
		Title:     "Great stay",
		Comment:   "Would visit again",
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}
}

// --- Tests: CreateReview ---

func TestReviewHandler_CreateReview_Returns201(t *testing.T) {
	svc := &mockReviewSvc{
		createReviewFn: func(ctx context.Context, userID string, hotelID int, input service.CreateReviewInput) (*domain.Review, error) {
			return sampleReview(), nil
		},
	}
	r := setupReviewRouter(svc, "user-abc", "guest")

	body := `{"booking_id":5,"rating":4,"title":"Great stay","comment":"Would visit again"}`
	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/v1/hotels/10/reviews", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w, req)

	if w.Code != http.StatusCreated {
		t.Errorf("expected 201, got %d — body: %s", w.Code, w.Body.String())
	}
}

func TestReviewHandler_CreateReview_InvalidJSON_Returns400(t *testing.T) {
	svc := &mockReviewSvc{}
	r := setupReviewRouter(svc, "user-abc", "guest")

	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/v1/hotels/10/reviews", strings.NewReader("invalid"))
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestReviewHandler_CreateReview_InvalidHotelID_Returns400(t *testing.T) {
	svc := &mockReviewSvc{}
	r := setupReviewRouter(svc, "user-abc", "guest")

	body := `{"booking_id":5,"rating":4}`
	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/v1/hotels/abc/reviews", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid hotel ID, got %d", w.Code)
	}
}

func TestReviewHandler_CreateReview_NoConfirmedBooking_Returns403(t *testing.T) {
	svc := &mockReviewSvc{
		createReviewFn: func(ctx context.Context, userID string, hotelID int, input service.CreateReviewInput) (*domain.Review, error) {
			return nil, domain.ErrForbidden
		},
	}
	r := setupReviewRouter(svc, "user-abc", "guest")

	body := `{"booking_id":5,"rating":4}`
	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/v1/hotels/10/reviews", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w, req)

	if w.Code != http.StatusForbidden {
		t.Errorf("expected 403, got %d", w.Code)
	}
}

func TestReviewHandler_CreateReview_DuplicateReview_Returns409(t *testing.T) {
	svc := &mockReviewSvc{
		createReviewFn: func(ctx context.Context, userID string, hotelID int, input service.CreateReviewInput) (*domain.Review, error) {
			return nil, domain.ErrConflict
		},
	}
	r := setupReviewRouter(svc, "user-abc", "guest")

	body := `{"booking_id":5,"rating":4}`
	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/v1/hotels/10/reviews", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w, req)

	if w.Code != http.StatusConflict {
		t.Errorf("expected 409, got %d", w.Code)
	}
}

// --- Tests: ListReviewsByHotel ---

func TestReviewHandler_ListReviewsByHotel_Returns200(t *testing.T) {
	svc := &mockReviewSvc{
		listReviewsByHotelFn: func(ctx context.Context, hotelID, page, limit int) ([]*domain.Review, int, error) {
			return []*domain.Review{sampleReview()}, 1, nil
		},
	}
	r := setupReviewRouter(svc, "", "")

	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/hotels/10/reviews", nil)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d — body: %s", w.Code, w.Body.String())
	}

	var resp map[string]interface{}
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("invalid JSON response: %v", err)
	}
	if resp["success"] != true {
		t.Error("expected success=true")
	}
}

func TestReviewHandler_ListReviewsByHotel_InvalidHotelID_Returns400(t *testing.T) {
	svc := &mockReviewSvc{}
	r := setupReviewRouter(svc, "", "")

	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/hotels/xyz/reviews", nil)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestReviewHandler_ListReviewsByHotel_ServiceError_Returns500(t *testing.T) {
	svc := &mockReviewSvc{
		listReviewsByHotelFn: func(ctx context.Context, hotelID, page, limit int) ([]*domain.Review, int, error) {
			return nil, 0, domain.ErrInternal
		},
	}
	r := setupReviewRouter(svc, "", "")

	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/hotels/10/reviews", nil)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusInternalServerError {
		t.Errorf("expected 500, got %d", w.Code)
	}
}

// --- Tests: UpdateReview ---

func TestReviewHandler_UpdateReview_Returns200(t *testing.T) {
	updated := sampleReview()
	updated.Rating = 5
	svc := &mockReviewSvc{
		updateReviewFn: func(ctx context.Context, id int, callerUserID string, input service.UpdateReviewInput) (*domain.Review, error) {
			return updated, nil
		},
	}
	r := setupReviewRouter(svc, "user-abc", "guest")

	body := `{"rating":5,"title":"Perfect","comment":"Best ever"}`
	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPut, "/api/v1/reviews/1", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d — body: %s", w.Code, w.Body.String())
	}
}

func TestReviewHandler_UpdateReview_InvalidID_Returns400(t *testing.T) {
	svc := &mockReviewSvc{}
	r := setupReviewRouter(svc, "user-abc", "guest")

	body := `{"rating":5}`
	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPut, "/api/v1/reviews/abc", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestReviewHandler_UpdateReview_NotOwner_Returns403(t *testing.T) {
	svc := &mockReviewSvc{
		updateReviewFn: func(ctx context.Context, id int, callerUserID string, input service.UpdateReviewInput) (*domain.Review, error) {
			return nil, domain.ErrForbidden
		},
	}
	r := setupReviewRouter(svc, "other-user", "guest")

	body := `{"rating":5}`
	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPut, "/api/v1/reviews/1", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w, req)

	if w.Code != http.StatusForbidden {
		t.Errorf("expected 403, got %d", w.Code)
	}
}

func TestReviewHandler_UpdateReview_NotFound_Returns404(t *testing.T) {
	svc := &mockReviewSvc{
		updateReviewFn: func(ctx context.Context, id int, callerUserID string, input service.UpdateReviewInput) (*domain.Review, error) {
			return nil, domain.ErrNotFound
		},
	}
	r := setupReviewRouter(svc, "user-abc", "guest")

	body := `{"rating":4}`
	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPut, "/api/v1/reviews/999", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w, req)

	if w.Code != http.StatusNotFound {
		t.Errorf("expected 404, got %d", w.Code)
	}
}

// --- Tests: DeleteReview ---

func TestReviewHandler_DeleteReview_Returns204(t *testing.T) {
	svc := &mockReviewSvc{
		deleteReviewFn: func(ctx context.Context, id int, callerUserID, callerRole string) error {
			return nil
		},
	}
	r := setupReviewRouter(svc, "user-abc", "guest")

	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodDelete, "/api/v1/reviews/1", nil)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusNoContent {
		t.Errorf("expected 204, got %d", w.Code)
	}
}

func TestReviewHandler_DeleteReview_InvalidID_Returns400(t *testing.T) {
	svc := &mockReviewSvc{}
	r := setupReviewRouter(svc, "user-abc", "guest")

	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodDelete, "/api/v1/reviews/abc", nil)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestReviewHandler_DeleteReview_NotOwner_Returns403(t *testing.T) {
	svc := &mockReviewSvc{
		deleteReviewFn: func(ctx context.Context, id int, callerUserID, callerRole string) error {
			return domain.ErrForbidden
		},
	}
	r := setupReviewRouter(svc, "other-user", "guest")

	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodDelete, "/api/v1/reviews/1", nil)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusForbidden {
		t.Errorf("expected 403, got %d", w.Code)
	}
}

func TestReviewHandler_DeleteReview_NotFound_Returns404(t *testing.T) {
	svc := &mockReviewSvc{
		deleteReviewFn: func(ctx context.Context, id int, callerUserID, callerRole string) error {
			return domain.ErrNotFound
		},
	}
	r := setupReviewRouter(svc, "user-abc", "guest")

	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodDelete, "/api/v1/reviews/999", nil)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusNotFound {
		t.Errorf("expected 404, got %d", w.Code)
	}
}
