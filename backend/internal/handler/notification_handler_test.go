package handler_test

import (
	"booking-app/internal/domain"
	"booking-app/internal/handler"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
)

// --- Mock NotificationService ---

type mockNotificationSvc struct {
	createNotificationFn func(ctx context.Context, userID string, notifType domain.NotificationType, title, message string, data map[string]any) (*domain.Notification, error)
	listNotificationsFn  func(ctx context.Context, userID string, page, limit int) ([]*domain.Notification, int, error)
	getUnreadCountFn     func(ctx context.Context, userID string) (int, error)
	markReadFn           func(ctx context.Context, id int64, userID string) error
	markAllReadFn        func(ctx context.Context, userID string) error
}

func (m *mockNotificationSvc) CreateNotification(ctx context.Context, userID string, notifType domain.NotificationType, title, message string, data map[string]any) (*domain.Notification, error) {
	if m.createNotificationFn != nil {
		return m.createNotificationFn(ctx, userID, notifType, title, message, data)
	}
	return nil, fmt.Errorf("not configured")
}

func (m *mockNotificationSvc) ListNotifications(ctx context.Context, userID string, page, limit int) ([]*domain.Notification, int, error) {
	if m.listNotificationsFn != nil {
		return m.listNotificationsFn(ctx, userID, page, limit)
	}
	return nil, 0, fmt.Errorf("not configured")
}

func (m *mockNotificationSvc) GetUnreadCount(ctx context.Context, userID string) (int, error) {
	if m.getUnreadCountFn != nil {
		return m.getUnreadCountFn(ctx, userID)
	}
	return 0, fmt.Errorf("not configured")
}

func (m *mockNotificationSvc) MarkRead(ctx context.Context, id int64, userID string) error {
	if m.markReadFn != nil {
		return m.markReadFn(ctx, id, userID)
	}
	return fmt.Errorf("not configured")
}

func (m *mockNotificationSvc) MarkAllRead(ctx context.Context, userID string) error {
	if m.markAllReadFn != nil {
		return m.markAllReadFn(ctx, userID)
	}
	return fmt.Errorf("not configured")
}

// --- Helpers ---

func setupNotificationRouter(svc *mockNotificationSvc, userID string) *gin.Engine {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	h := handler.NewNotificationHandler(svc)

	authMiddleware := func(c *gin.Context) {
		c.Set("userID", userID)
		c.Next()
	}

	r.GET("/api/v1/notifications", authMiddleware, h.ListNotifications)
	r.GET("/api/v1/notifications/unread-count", authMiddleware, h.UnreadCount)
	r.PUT("/api/v1/notifications/:id/read", authMiddleware, h.MarkRead)
	r.PUT("/api/v1/notifications/read-all", authMiddleware, h.MarkAllRead)
	return r
}

func sampleNotification() *domain.Notification {
	return &domain.Notification{
		ID:        1,
		UserID:    "user-abc",
		Type:      domain.NotificationTypeBookingConfirmed,
		Title:     "Booking Confirmed",
		Message:   "Your booking #42 is confirmed.",
		IsRead:    false,
		CreatedAt: time.Now(),
	}
}

// --- Tests: ListNotifications ---

func TestNotificationHandler_ListNotifications_Returns200(t *testing.T) {
	svc := &mockNotificationSvc{
		listNotificationsFn: func(_ context.Context, _ string, _, _ int) ([]*domain.Notification, int, error) {
			return []*domain.Notification{sampleNotification()}, 1, nil
		},
	}
	r := setupNotificationRouter(svc, "user-abc")

	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/notifications", nil)
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
	if resp["meta"] == nil {
		t.Error("expected meta in response")
	}
}

func TestNotificationHandler_ListNotifications_ServiceError_Returns500(t *testing.T) {
	svc := &mockNotificationSvc{
		listNotificationsFn: func(_ context.Context, _ string, _, _ int) ([]*domain.Notification, int, error) {
			return nil, 0, errors.New("db error")
		},
	}
	r := setupNotificationRouter(svc, "user-abc")

	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/notifications", nil)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusInternalServerError {
		t.Errorf("expected 500, got %d", w.Code)
	}
}

// --- Tests: UnreadCount ---

func TestNotificationHandler_UnreadCount_Returns200(t *testing.T) {
	svc := &mockNotificationSvc{
		getUnreadCountFn: func(_ context.Context, _ string) (int, error) {
			return 3, nil
		},
	}
	r := setupNotificationRouter(svc, "user-abc")

	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/notifications/unread-count", nil)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d — body: %s", w.Code, w.Body.String())
	}

	var resp map[string]interface{}
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("invalid JSON response: %v", err)
	}
	data, ok := resp["data"].(map[string]interface{})
	if !ok {
		t.Fatalf("expected data to be an object, got %T", resp["data"])
	}
	count, ok := data["count"].(float64)
	if !ok {
		t.Fatalf("expected count to be a number, got %T", data["count"])
	}
	if count != 3 {
		t.Errorf("expected count 3, got %v", count)
	}
}

func TestNotificationHandler_UnreadCount_ServiceError_Returns500(t *testing.T) {
	svc := &mockNotificationSvc{
		getUnreadCountFn: func(_ context.Context, _ string) (int, error) {
			return 0, errors.New("db error")
		},
	}
	r := setupNotificationRouter(svc, "user-abc")

	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/notifications/unread-count", nil)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusInternalServerError {
		t.Errorf("expected 500, got %d", w.Code)
	}
}

// --- Tests: MarkRead ---

func TestNotificationHandler_MarkRead_Returns200(t *testing.T) {
	svc := &mockNotificationSvc{
		markReadFn: func(_ context.Context, _ int64, _ string) error {
			return nil
		},
	}
	r := setupNotificationRouter(svc, "user-abc")

	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPut, "/api/v1/notifications/1/read", nil)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d — body: %s", w.Code, w.Body.String())
	}
}

func TestNotificationHandler_MarkRead_InvalidID_Returns400(t *testing.T) {
	svc := &mockNotificationSvc{}
	r := setupNotificationRouter(svc, "user-abc")

	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPut, "/api/v1/notifications/abc/read", nil)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestNotificationHandler_MarkRead_NotFound_Returns404(t *testing.T) {
	svc := &mockNotificationSvc{
		markReadFn: func(_ context.Context, _ int64, _ string) error {
			return domain.ErrNotFound
		},
	}
	r := setupNotificationRouter(svc, "user-abc")

	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPut, "/api/v1/notifications/999/read", nil)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusNotFound {
		t.Errorf("expected 404, got %d", w.Code)
	}
}

func TestNotificationHandler_MarkRead_BadRequest_Returns400(t *testing.T) {
	svc := &mockNotificationSvc{
		markReadFn: func(_ context.Context, _ int64, _ string) error {
			return domain.ErrBadRequest
		},
	}
	r := setupNotificationRouter(svc, "user-abc")

	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPut, "/api/v1/notifications/0/read", nil)
	r.ServeHTTP(w, req)

	// ID "0" is a valid integer path param - service decides bad request
	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

// --- Tests: MarkAllRead ---

func TestNotificationHandler_MarkAllRead_Returns200(t *testing.T) {
	svc := &mockNotificationSvc{
		markAllReadFn: func(_ context.Context, _ string) error {
			return nil
		},
	}
	r := setupNotificationRouter(svc, "user-abc")

	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPut, "/api/v1/notifications/read-all", nil)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d — body: %s", w.Code, w.Body.String())
	}
}

func TestNotificationHandler_MarkAllRead_ServiceError_Returns500(t *testing.T) {
	svc := &mockNotificationSvc{
		markAllReadFn: func(_ context.Context, _ string) error {
			return errors.New("db error")
		},
	}
	r := setupNotificationRouter(svc, "user-abc")

	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPut, "/api/v1/notifications/read-all", nil)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusInternalServerError {
		t.Errorf("expected 500, got %d", w.Code)
	}
}
