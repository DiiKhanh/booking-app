package handler_test

import (
	"booking-app/internal/domain"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/gin-gonic/gin"

	"booking-app/internal/handler"
	"booking-app/internal/service"
)

// --- Mock PaymentService ---

type mockPaymentSvc struct {
	processPaymentFn func(ctx context.Context, paymentID string) error
	getPaymentFn     func(ctx context.Context, id string, callerUserID string) (*domain.Payment, error)
}

func (m *mockPaymentSvc) ProcessPayment(ctx context.Context, paymentID string) error {
	if m.processPaymentFn != nil {
		return m.processPaymentFn(ctx, paymentID)
	}
	return fmt.Errorf("not configured")
}

func (m *mockPaymentSvc) GetPayment(ctx context.Context, id string, callerUserID string) (*domain.Payment, error) {
	if m.getPaymentFn != nil {
		return m.getPaymentFn(ctx, id, callerUserID)
	}
	return nil, fmt.Errorf("not configured")
}

// --- Mock SagaOrchestrator ---

type mockSagaOrch struct {
	startCheckoutFn         func(ctx context.Context, bookingID int, userID string) (*domain.Payment, error)
	handlePaymentSuccessFn  func(ctx context.Context, paymentID string) error
	handlePaymentFailureFn  func(ctx context.Context, paymentID string, reason string) error
	handlePaymentTimeoutFn  func(ctx context.Context, paymentID string) error
}

func (m *mockSagaOrch) StartCheckout(ctx context.Context, bookingID int, userID string) (*domain.Payment, error) {
	if m.startCheckoutFn != nil {
		return m.startCheckoutFn(ctx, bookingID, userID)
	}
	return nil, fmt.Errorf("not configured")
}

func (m *mockSagaOrch) HandlePaymentSuccess(ctx context.Context, paymentID string) error {
	if m.handlePaymentSuccessFn != nil {
		return m.handlePaymentSuccessFn(ctx, paymentID)
	}
	return fmt.Errorf("not configured")
}

func (m *mockSagaOrch) HandlePaymentFailure(ctx context.Context, paymentID string, reason string) error {
	if m.handlePaymentFailureFn != nil {
		return m.handlePaymentFailureFn(ctx, paymentID, reason)
	}
	return fmt.Errorf("not configured")
}

func (m *mockSagaOrch) HandlePaymentTimeout(ctx context.Context, paymentID string) error {
	if m.handlePaymentTimeoutFn != nil {
		return m.handlePaymentTimeoutFn(ctx, paymentID)
	}
	return fmt.Errorf("not configured")
}

// --- Helpers ---

func setupPaymentRouter(paymentSvc service.PaymentServiceInterface, sagaOrch service.SagaOrchestratorInterface, userID, role string) *gin.Engine {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	h := handler.NewPaymentHandler(paymentSvc, sagaOrch)

	r.POST("/api/v1/checkout", func(c *gin.Context) {
		c.Set("userID", userID)
		c.Set("userRole", role)
		h.Checkout(c)
	})
	r.GET("/api/v1/payments/:id", func(c *gin.Context) {
		c.Set("userID", userID)
		c.Set("userRole", role)
		h.GetPayment(c)
	})
	return r
}

func samplePayment() *domain.Payment {
	return &domain.Payment{
		ID:             "pay-uuid-1",
		BookingID:      5,
		Amount:         200.00,
		Currency:       "USD",
		Status:         domain.PaymentStatusPending,
		IdempotencyKey: "idem-key-1",
		CreatedAt:      time.Now(),
		UpdatedAt:      time.Now(),
	}
}

// --- Tests: POST /api/v1/checkout ---

func TestPaymentHandler_Checkout_Returns201(t *testing.T) {
	sagaOrch := &mockSagaOrch{
		startCheckoutFn: func(ctx context.Context, bookingID int, userID string) (*domain.Payment, error) {
			return samplePayment(), nil
		},
	}
	paymentSvc := &mockPaymentSvc{}
	r := setupPaymentRouter(paymentSvc, sagaOrch, "user-1", "guest")

	body := `{"booking_id":5}`
	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/v1/checkout", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w, req)

	if w.Code != http.StatusCreated {
		t.Errorf("expected 201, got %d — body: %s", w.Code, w.Body.String())
	}

	var resp map[string]interface{}
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("invalid JSON response: %v", err)
	}
	if resp["success"] != true {
		t.Error("expected success=true")
	}
}

func TestPaymentHandler_Checkout_InvalidJSON_Returns400(t *testing.T) {
	sagaOrch := &mockSagaOrch{}
	paymentSvc := &mockPaymentSvc{}
	r := setupPaymentRouter(paymentSvc, sagaOrch, "user-1", "guest")

	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/v1/checkout", strings.NewReader("not-json"))
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestPaymentHandler_Checkout_MissingUserID_Returns401(t *testing.T) {
	sagaOrch := &mockSagaOrch{}
	paymentSvc := &mockPaymentSvc{}
	// empty userID simulates unauthenticated request
	r := setupPaymentRouter(paymentSvc, sagaOrch, "", "guest")

	body := `{"booking_id":5}`
	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/v1/checkout", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestPaymentHandler_Checkout_BookingNotFound_Returns404(t *testing.T) {
	sagaOrch := &mockSagaOrch{
		startCheckoutFn: func(ctx context.Context, bookingID int, userID string) (*domain.Payment, error) {
			return nil, domain.ErrNotFound
		},
	}
	paymentSvc := &mockPaymentSvc{}
	r := setupPaymentRouter(paymentSvc, sagaOrch, "user-1", "guest")

	body := `{"booking_id":999}`
	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/v1/checkout", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w, req)

	if w.Code != http.StatusNotFound {
		t.Errorf("expected 404, got %d", w.Code)
	}
}

func TestPaymentHandler_Checkout_Conflict_Returns409(t *testing.T) {
	sagaOrch := &mockSagaOrch{
		startCheckoutFn: func(ctx context.Context, bookingID int, userID string) (*domain.Payment, error) {
			return nil, domain.ErrConflict
		},
	}
	paymentSvc := &mockPaymentSvc{}
	r := setupPaymentRouter(paymentSvc, sagaOrch, "user-1", "guest")

	body := `{"booking_id":5}`
	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/v1/checkout", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w, req)

	if w.Code != http.StatusConflict {
		t.Errorf("expected 409, got %d", w.Code)
	}
}

func TestPaymentHandler_Checkout_Forbidden_Returns403(t *testing.T) {
	sagaOrch := &mockSagaOrch{
		startCheckoutFn: func(ctx context.Context, bookingID int, userID string) (*domain.Payment, error) {
			return nil, domain.ErrForbidden
		},
	}
	paymentSvc := &mockPaymentSvc{}
	r := setupPaymentRouter(paymentSvc, sagaOrch, "user-1", "guest")

	body := `{"booking_id":5}`
	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/v1/checkout", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w, req)

	if w.Code != http.StatusForbidden {
		t.Errorf("expected 403, got %d", w.Code)
	}
}

// --- Tests: GET /api/v1/payments/:id ---

func TestPaymentHandler_GetPayment_Returns200(t *testing.T) {
	paymentSvc := &mockPaymentSvc{
		getPaymentFn: func(ctx context.Context, id string, callerUserID string) (*domain.Payment, error) {
			return samplePayment(), nil
		},
	}
	sagaOrch := &mockSagaOrch{}
	r := setupPaymentRouter(paymentSvc, sagaOrch, "user-1", "guest")

	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/payments/pay-uuid-1", nil)
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

func TestPaymentHandler_GetPayment_NotFound_Returns404(t *testing.T) {
	paymentSvc := &mockPaymentSvc{
		getPaymentFn: func(ctx context.Context, id string, callerUserID string) (*domain.Payment, error) {
			return nil, domain.ErrNotFound
		},
	}
	sagaOrch := &mockSagaOrch{}
	r := setupPaymentRouter(paymentSvc, sagaOrch, "user-1", "guest")

	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/payments/no-such-id", nil)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusNotFound {
		t.Errorf("expected 404, got %d", w.Code)
	}
}
