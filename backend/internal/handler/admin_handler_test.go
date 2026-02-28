package handler_test

import (
	"booking-app/internal/domain"
	"booking-app/internal/handler"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
)

// --- Mock AdminService ---

type mockAdminSvc struct {
	listUsersFn       func(ctx context.Context, page, limit int) ([]*domain.User, int, error)
	getUserFn         func(ctx context.Context, id string) (*domain.User, error)
	updateRoleFn      func(ctx context.Context, id string, role domain.Role) error
	deactivateUserFn  func(ctx context.Context, id string) error
	listAllBookingsFn func(ctx context.Context, page, limit int) ([]*domain.Booking, int, error)
	listDLQEventsFn   func(ctx context.Context, page, limit int) ([]*domain.OutboxEvent, int, error)
	retryDLQEventFn   func(ctx context.Context, id string) error
}

func (m *mockAdminSvc) ListUsers(ctx context.Context, page, limit int) ([]*domain.User, int, error) {
	if m.listUsersFn != nil {
		return m.listUsersFn(ctx, page, limit)
	}
	return []*domain.User{}, 0, nil
}

func (m *mockAdminSvc) GetUser(ctx context.Context, id string) (*domain.User, error) {
	if m.getUserFn != nil {
		return m.getUserFn(ctx, id)
	}
	return &domain.User{ID: id, Email: "test@example.com"}, nil
}

func (m *mockAdminSvc) UpdateUserRole(ctx context.Context, id string, role domain.Role) error {
	if m.updateRoleFn != nil {
		return m.updateRoleFn(ctx, id, role)
	}
	return nil
}

func (m *mockAdminSvc) DeactivateUser(ctx context.Context, id string) error {
	if m.deactivateUserFn != nil {
		return m.deactivateUserFn(ctx, id)
	}
	return nil
}

func (m *mockAdminSvc) ListAllBookings(ctx context.Context, page, limit int) ([]*domain.Booking, int, error) {
	if m.listAllBookingsFn != nil {
		return m.listAllBookingsFn(ctx, page, limit)
	}
	return []*domain.Booking{}, 0, nil
}

func (m *mockAdminSvc) ListDLQEvents(ctx context.Context, page, limit int) ([]*domain.OutboxEvent, int, error) {
	if m.listDLQEventsFn != nil {
		return m.listDLQEventsFn(ctx, page, limit)
	}
	return []*domain.OutboxEvent{}, 0, nil
}

func (m *mockAdminSvc) RetryDLQEvent(ctx context.Context, id string) error {
	if m.retryDLQEventFn != nil {
		return m.retryDLQEventFn(ctx, id)
	}
	return nil
}

// --- helpers ---

func setupAdminRouter(svc *mockAdminSvc, adminUserID string) *gin.Engine {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	h := handler.NewAdminHandler(svc)

	adminGroup := r.Group("/api/v1/admin")
	adminGroup.Use(func(c *gin.Context) {
		c.Set("userID", adminUserID)
		c.Set("userRole", "admin")
		c.Next()
	})

	adminGroup.GET("/users", h.ListUsers)
	adminGroup.GET("/users/:id", h.GetUser)
	adminGroup.PUT("/users/:id/role", h.UpdateUserRole)
	adminGroup.PUT("/users/:id/deactivate", h.DeactivateUser)
	adminGroup.GET("/bookings", h.ListAllBookings)
	adminGroup.GET("/system/health", h.SystemHealth)
	adminGroup.GET("/events/dlq", h.ListDLQEvents)
	adminGroup.POST("/events/dlq/:id/retry", h.RetryDLQEvent)
	return r
}

func sampleUser() *domain.User {
	return &domain.User{
		ID:        "user-abc",
		Email:     "user@example.com",
		FullName:  "Test User",
		Role:      domain.RoleGuest,
		IsActive:  true,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}
}

func sampleBooking() *domain.Booking {
	return &domain.Booking{
		ID:         1,
		UserID:     "user-abc",
		RoomID:     10,
		TotalPrice: 150.0,
		Status:     "confirmed",
		StartDate:  time.Now(),
		EndDate:    time.Now().Add(48 * time.Hour),
		CreatedAt:  time.Now(),
	}
}

func sampleOutboxEvent() *domain.OutboxEvent {
	return &domain.OutboxEvent{
		ID:            "evt-1",
		AggregateType: "booking",
		AggregateID:   "1",
		EventType:     "PaymentFailed",
		RetryCount:    6,
		CreatedAt:     time.Now(),
	}
}

// --- Tests: ListUsers ---

func TestAdminHandler_ListUsers_Returns200(t *testing.T) {
	svc := &mockAdminSvc{
		listUsersFn: func(ctx context.Context, page, limit int) ([]*domain.User, int, error) {
			return []*domain.User{sampleUser()}, 1, nil
		},
	}
	r := setupAdminRouter(svc, "admin-1")

	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/admin/users", nil)
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

func TestAdminHandler_ListUsers_ServiceError_Returns500(t *testing.T) {
	svc := &mockAdminSvc{
		listUsersFn: func(ctx context.Context, page, limit int) ([]*domain.User, int, error) {
			return nil, 0, domain.ErrInternal
		},
	}
	r := setupAdminRouter(svc, "admin-1")

	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/admin/users", nil)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusInternalServerError {
		t.Errorf("expected 500, got %d", w.Code)
	}
}

// --- Tests: GetUser ---

func TestAdminHandler_GetUser_Returns200(t *testing.T) {
	svc := &mockAdminSvc{
		getUserFn: func(ctx context.Context, id string) (*domain.User, error) {
			return sampleUser(), nil
		},
	}
	r := setupAdminRouter(svc, "admin-1")

	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/admin/users/user-abc", nil)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d — body: %s", w.Code, w.Body.String())
	}
}

func TestAdminHandler_GetUser_NotFound_Returns404(t *testing.T) {
	svc := &mockAdminSvc{
		getUserFn: func(ctx context.Context, id string) (*domain.User, error) {
			return nil, domain.ErrNotFound
		},
	}
	r := setupAdminRouter(svc, "admin-1")

	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/admin/users/nonexistent", nil)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusNotFound {
		t.Errorf("expected 404, got %d", w.Code)
	}
}

// --- Tests: UpdateUserRole ---

func TestAdminHandler_UpdateUserRole_Returns200(t *testing.T) {
	svc := &mockAdminSvc{
		updateRoleFn: func(ctx context.Context, id string, role domain.Role) error {
			return nil
		},
	}
	r := setupAdminRouter(svc, "admin-1")

	body := `{"role":"owner"}`
	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPut, "/api/v1/admin/users/user-abc/role", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d — body: %s", w.Code, w.Body.String())
	}
}

func TestAdminHandler_UpdateUserRole_InvalidJSON_Returns400(t *testing.T) {
	svc := &mockAdminSvc{}
	r := setupAdminRouter(svc, "admin-1")

	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPut, "/api/v1/admin/users/user-abc/role", strings.NewReader("invalid"))
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestAdminHandler_UpdateUserRole_InvalidRole_Returns400(t *testing.T) {
	svc := &mockAdminSvc{
		updateRoleFn: func(ctx context.Context, id string, role domain.Role) error {
			return domain.ErrBadRequest
		},
	}
	r := setupAdminRouter(svc, "admin-1")

	body := `{"role":"superuser"}`
	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPut, "/api/v1/admin/users/user-abc/role", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

// --- Tests: DeactivateUser ---

func TestAdminHandler_DeactivateUser_Returns200(t *testing.T) {
	svc := &mockAdminSvc{
		deactivateUserFn: func(ctx context.Context, id string) error {
			return nil
		},
	}
	r := setupAdminRouter(svc, "admin-1")

	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPut, "/api/v1/admin/users/user-abc/deactivate", nil)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d — body: %s", w.Code, w.Body.String())
	}
}

func TestAdminHandler_DeactivateUser_NotFound_Returns404(t *testing.T) {
	svc := &mockAdminSvc{
		deactivateUserFn: func(ctx context.Context, id string) error {
			return domain.ErrNotFound
		},
	}
	r := setupAdminRouter(svc, "admin-1")

	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPut, "/api/v1/admin/users/nonexistent/deactivate", nil)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusNotFound {
		t.Errorf("expected 404, got %d", w.Code)
	}
}

// --- Tests: ListAllBookings ---

func TestAdminHandler_ListAllBookings_Returns200(t *testing.T) {
	svc := &mockAdminSvc{
		listAllBookingsFn: func(ctx context.Context, page, limit int) ([]*domain.Booking, int, error) {
			return []*domain.Booking{sampleBooking()}, 1, nil
		},
	}
	r := setupAdminRouter(svc, "admin-1")

	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/admin/bookings", nil)
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

func TestAdminHandler_ListAllBookings_ServiceError_Returns500(t *testing.T) {
	svc := &mockAdminSvc{
		listAllBookingsFn: func(ctx context.Context, page, limit int) ([]*domain.Booking, int, error) {
			return nil, 0, domain.ErrInternal
		},
	}
	r := setupAdminRouter(svc, "admin-1")

	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/admin/bookings", nil)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusInternalServerError {
		t.Errorf("expected 500, got %d", w.Code)
	}
}

// --- Tests: SystemHealth ---

func TestAdminHandler_SystemHealth_Returns200(t *testing.T) {
	svc := &mockAdminSvc{}
	r := setupAdminRouter(svc, "admin-1")

	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/admin/system/health", nil)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d — body: %s", w.Code, w.Body.String())
	}
	var resp map[string]interface{}
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("invalid JSON: %v", err)
	}
	if resp["status"] != "ok" {
		t.Errorf("expected status=ok, got %v", resp["status"])
	}
	if resp["service"] == nil {
		t.Error("expected service field in response")
	}
	if resp["timestamp"] == nil {
		t.Error("expected timestamp field in response")
	}
}

// --- Tests: ListDLQEvents ---

func TestAdminHandler_ListDLQEvents_Returns200(t *testing.T) {
	svc := &mockAdminSvc{
		listDLQEventsFn: func(ctx context.Context, page, limit int) ([]*domain.OutboxEvent, int, error) {
			return []*domain.OutboxEvent{sampleOutboxEvent()}, 1, nil
		},
	}
	r := setupAdminRouter(svc, "admin-1")

	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/admin/events/dlq", nil)
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

func TestAdminHandler_ListDLQEvents_ServiceError_Returns500(t *testing.T) {
	svc := &mockAdminSvc{
		listDLQEventsFn: func(ctx context.Context, page, limit int) ([]*domain.OutboxEvent, int, error) {
			return nil, 0, domain.ErrInternal
		},
	}
	r := setupAdminRouter(svc, "admin-1")

	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/admin/events/dlq", nil)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusInternalServerError {
		t.Errorf("expected 500, got %d", w.Code)
	}
}

// --- Tests: RetryDLQEvent ---

func TestAdminHandler_RetryDLQEvent_Returns204(t *testing.T) {
	svc := &mockAdminSvc{
		retryDLQEventFn: func(ctx context.Context, id string) error {
			return nil
		},
	}
	r := setupAdminRouter(svc, "admin-1")

	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/v1/admin/events/dlq/evt-1/retry", nil)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusNoContent {
		t.Errorf("expected 204, got %d — body: %s", w.Code, w.Body.String())
	}
}

func TestAdminHandler_RetryDLQEvent_NotFound_Returns404(t *testing.T) {
	svc := &mockAdminSvc{
		retryDLQEventFn: func(ctx context.Context, id string) error {
			return domain.ErrNotFound
		},
	}
	r := setupAdminRouter(svc, "admin-1")

	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/v1/admin/events/dlq/nonexistent/retry", nil)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusNotFound {
		t.Errorf("expected 404, got %d", w.Code)
	}
}

func TestAdminHandler_DeactivateUser_ForbiddenError_Returns403(t *testing.T) {
	svc := &mockAdminSvc{
		deactivateUserFn: func(ctx context.Context, id string) error {
			return domain.ErrForbidden
		},
	}
	r := setupAdminRouter(svc, "admin-1")

	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPut, "/api/v1/admin/users/user-abc/deactivate", nil)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusForbidden {
		t.Errorf("expected 403, got %d", w.Code)
	}
}

func TestAdminHandler_RetryDLQEvent_ConflictError_Returns409(t *testing.T) {
	svc := &mockAdminSvc{
		retryDLQEventFn: func(ctx context.Context, id string) error {
			return domain.ErrConflict
		},
	}
	r := setupAdminRouter(svc, "admin-1")

	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/v1/admin/events/dlq/evt-1/retry", nil)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusConflict {
		t.Errorf("expected 409, got %d", w.Code)
	}
}
