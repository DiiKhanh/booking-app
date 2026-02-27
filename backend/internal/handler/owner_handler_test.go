package handler_test

import (
	"booking-app/internal/handler"
	"context"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
)

// --- Mock OwnerDashboardRepository ---

type mockDashRepo struct {
	countHotelsFn func(ctx context.Context, ownerID string) (int, error)
	countRoomsFn  func(ctx context.Context, ownerID string) (int, error)
}

func (m *mockDashRepo) CountHotelsByOwner(ctx context.Context, ownerID string) (int, error) {
	if m.countHotelsFn != nil {
		return m.countHotelsFn(ctx, ownerID)
	}
	return 0, fmt.Errorf("not configured")
}

func (m *mockDashRepo) CountRoomsByOwner(ctx context.Context, ownerID string) (int, error) {
	if m.countRoomsFn != nil {
		return m.countRoomsFn(ctx, ownerID)
	}
	return 0, fmt.Errorf("not configured")
}

func buildOwnerRouter(dashRepo handler.OwnerDashboardRepository) *gin.Engine {
	r := gin.New()
	h := handler.NewOwnerHandler(dashRepo)

	owner := r.Group("/api/v1/owner")
	owner.Use(func(c *gin.Context) {
		c.Set("userID", "owner-uuid-test")
		c.Set("userRole", "owner")
		c.Next()
	})
	owner.GET("/dashboard", h.Dashboard)

	return r
}

func TestOwnerHandler_Dashboard_Returns200(t *testing.T) {
	repo := &mockDashRepo{
		countHotelsFn: func(ctx context.Context, ownerID string) (int, error) {
			return 3, nil
		},
		countRoomsFn: func(ctx context.Context, ownerID string) (int, error) {
			return 10, nil
		},
	}
	r := buildOwnerRouter(repo)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/owner/dashboard", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d: %s", w.Code, w.Body.String())
	}
}

func TestOwnerHandler_Dashboard_HotelCountError_Returns500(t *testing.T) {
	repo := &mockDashRepo{
		countHotelsFn: func(ctx context.Context, ownerID string) (int, error) {
			return 0, fmt.Errorf("db error")
		},
	}
	r := buildOwnerRouter(repo)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/owner/dashboard", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusInternalServerError {
		t.Errorf("expected 500, got %d", w.Code)
	}
}

func TestOwnerHandler_Dashboard_RoomCountError_Returns500(t *testing.T) {
	repo := &mockDashRepo{
		countHotelsFn: func(ctx context.Context, ownerID string) (int, error) {
			return 3, nil
		},
		countRoomsFn: func(ctx context.Context, ownerID string) (int, error) {
			return 0, fmt.Errorf("db error")
		},
	}
	r := buildOwnerRouter(repo)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/owner/dashboard", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusInternalServerError {
		t.Errorf("expected 500, got %d", w.Code)
	}
}
