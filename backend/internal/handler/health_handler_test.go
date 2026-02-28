package handler_test

import (
	"booking-app/internal/handler"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/alicebob/miniredis/v2"
	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
)

// errDBDown is a sentinel error for simulating database failures.
var errDBDown = errors.New("database connection refused")

func init() {
	gin.SetMode(gin.TestMode)
}

// newHealthRouter builds a gin engine with health routes.
func newHealthRouter(h *handler.HealthHandler) *gin.Engine {
	r := gin.New()
	r.GET("/health/live", h.Live)
	r.GET("/health/ready", h.Ready)
	r.GET("/health/startup", h.Startup)
	return r
}

// newMiniredisClient creates an in-memory Redis for tests.
func newMiniredisClient(t *testing.T) (*miniredis.Miniredis, *redis.Client) {
	t.Helper()
	mr, err := miniredis.Run()
	if err != nil {
		t.Fatalf("failed to start miniredis: %v", err)
	}
	t.Cleanup(mr.Close)
	c := redis.NewClient(&redis.Options{Addr: mr.Addr()})
	t.Cleanup(func() { _ = c.Close() })
	return mr, c
}

// ---- /health/live ----

func TestHealthHandler_Live_AlwaysReturns200(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("sqlmock.New: %v", err)
	}
	defer db.Close()
	_ = mock

	_, redisClient := newMiniredisClient(t)
	h := handler.NewHealthHandler(db, redisClient)
	r := newHealthRouter(h)

	req := httptest.NewRequest(http.MethodGet, "/health/live", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", w.Code)
	}
}

func TestHealthHandler_Live_ReturnsExpectedBody(t *testing.T) {
	db, _, _ := sqlmock.New()
	defer db.Close()
	_, redisClient := newMiniredisClient(t)

	h := handler.NewHealthHandler(db, redisClient)
	r := newHealthRouter(h)

	req := httptest.NewRequest(http.MethodGet, "/health/live", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	var body map[string]interface{}
	if err := json.Unmarshal(w.Body.Bytes(), &body); err != nil {
		t.Fatalf("invalid JSON: %v", err)
	}
	if body["status"] != "alive" {
		t.Errorf("expected status=alive, got %v", body["status"])
	}
}

// ---- /health/ready ----

func TestHealthHandler_Ready_Returns200WhenHealthy(t *testing.T) {
	db, mock, err := sqlmock.New(sqlmock.MonitorPingsOption(true))
	if err != nil {
		t.Fatalf("sqlmock.New: %v", err)
	}
	defer db.Close()
	mock.ExpectPing().WillReturnError(nil)

	_, redisClient := newMiniredisClient(t)
	h := handler.NewHealthHandler(db, redisClient)
	r := newHealthRouter(h)

	req := httptest.NewRequest(http.MethodGet, "/health/ready", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200 when healthy, got %d: %s", w.Code, w.Body.String())
	}

	var body map[string]interface{}
	if err := json.Unmarshal(w.Body.Bytes(), &body); err != nil {
		t.Fatalf("invalid JSON: %v", err)
	}
	if body["status"] != "healthy" {
		t.Errorf("expected status=healthy, got %v", body["status"])
	}
	checks, ok := body["checks"].(map[string]interface{})
	if !ok {
		t.Fatal("expected checks object in response")
	}
	if checks["database"] != "ok" {
		t.Errorf("expected checks.database=ok, got %v", checks["database"])
	}
	if checks["redis"] != "ok" {
		t.Errorf("expected checks.redis=ok, got %v", checks["redis"])
	}
}

func TestHealthHandler_Ready_Returns503WhenDBFails(t *testing.T) {
	db, mock, err := sqlmock.New(sqlmock.MonitorPingsOption(true))
	if err != nil {
		t.Fatalf("sqlmock.New: %v", err)
	}
	defer db.Close()
	mock.ExpectPing().WillReturnError(errDBDown)

	_, redisClient := newMiniredisClient(t)
	h := handler.NewHealthHandler(db, redisClient)
	r := newHealthRouter(h)

	req := httptest.NewRequest(http.MethodGet, "/health/ready", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusServiceUnavailable {
		t.Errorf("expected 503 when DB fails, got %d: %s", w.Code, w.Body.String())
	}

	var body map[string]interface{}
	if err := json.Unmarshal(w.Body.Bytes(), &body); err != nil {
		t.Fatalf("invalid JSON: %v", err)
	}
	if body["status"] != "unhealthy" {
		t.Errorf("expected status=unhealthy, got %v", body["status"])
	}
}

func TestHealthHandler_Ready_Returns503WhenRedisFails(t *testing.T) {
	db, mock, err := sqlmock.New(sqlmock.MonitorPingsOption(true))
	if err != nil {
		t.Fatalf("sqlmock.New: %v", err)
	}
	defer db.Close()
	mock.ExpectPing().WillReturnError(nil)

	// Use a dead Redis client.
	deadRedis := redis.NewClient(&redis.Options{
		Addr:        "127.0.0.1:19998",
		DialTimeout: 50 * time.Millisecond,
		ReadTimeout: 50 * time.Millisecond,
	})
	defer deadRedis.Close()

	h := handler.NewHealthHandler(db, deadRedis)
	r := newHealthRouter(h)

	req := httptest.NewRequest(http.MethodGet, "/health/ready", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusServiceUnavailable {
		t.Errorf("expected 503 when Redis fails, got %d", w.Code)
	}

	var body map[string]interface{}
	if err := json.Unmarshal(w.Body.Bytes(), &body); err != nil {
		t.Fatalf("invalid JSON: %v", err)
	}
	if body["status"] != "unhealthy" {
		t.Errorf("expected status=unhealthy, got %v", body["status"])
	}
}

// ---- /health/startup ----

func TestHealthHandler_Startup_Returns200WhenHealthy(t *testing.T) {
	db, mock, err := sqlmock.New(sqlmock.MonitorPingsOption(true))
	if err != nil {
		t.Fatalf("sqlmock.New: %v", err)
	}
	defer db.Close()
	mock.ExpectPing().WillReturnError(nil)

	_, redisClient := newMiniredisClient(t)
	h := handler.NewHealthHandler(db, redisClient)
	r := newHealthRouter(h)

	req := httptest.NewRequest(http.MethodGet, "/health/startup", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d: %s", w.Code, w.Body.String())
	}
}

func TestHealthHandler_Startup_Returns503WhenUnhealthy(t *testing.T) {
	db, mock, err := sqlmock.New(sqlmock.MonitorPingsOption(true))
	if err != nil {
		t.Fatalf("sqlmock.New: %v", err)
	}
	defer db.Close()
	mock.ExpectPing().WillReturnError(errDBDown)

	_, redisClient := newMiniredisClient(t)
	h := handler.NewHealthHandler(db, redisClient)
	r := newHealthRouter(h)

	req := httptest.NewRequest(http.MethodGet, "/health/startup", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusServiceUnavailable {
		t.Errorf("expected 503, got %d", w.Code)
	}
}
