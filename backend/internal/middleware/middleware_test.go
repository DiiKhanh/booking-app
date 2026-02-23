package middleware_test

import (
	"booking-app/internal/middleware"
	"booking-app/internal/observability"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
)

func init() {
	gin.SetMode(gin.TestMode)
	_ = observability.Init(false)
}

func TestCorrelationID_GeneratesIfMissing(t *testing.T) {
	r := gin.New()
	r.Use(middleware.CorrelationID())
	r.GET("/", func(c *gin.Context) {
		id := middleware.GetCorrelationID(c)
		if id == "" {
			t.Error("expected non-empty correlation ID")
		}
		c.Status(http.StatusOK)
	})

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", w.Code)
	}
	if w.Header().Get(middleware.CorrelationIDHeader) == "" {
		t.Error("expected X-Correlation-ID response header")
	}
}

func TestCorrelationID_PropagatesExisting(t *testing.T) {
	const existingID = "test-correlation-id-123"

	r := gin.New()
	r.Use(middleware.CorrelationID())
	r.GET("/", func(c *gin.Context) {
		id := middleware.GetCorrelationID(c)
		if id != existingID {
			t.Errorf("expected %q, got %q", existingID, id)
		}
		c.Status(http.StatusOK)
	})

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.Header.Set(middleware.CorrelationIDHeader, existingID)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Header().Get(middleware.CorrelationIDHeader) != existingID {
		t.Errorf("expected propagated header %q, got %q", existingID, w.Header().Get(middleware.CorrelationIDHeader))
	}
}

func TestRecovery_CatchesPanic(t *testing.T) {
	r := gin.New()
	r.Use(middleware.Recovery())
	r.GET("/panic", func(c *gin.Context) {
		panic("test panic")
	})

	req := httptest.NewRequest(http.MethodGet, "/panic", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusInternalServerError {
		t.Errorf("expected 500, got %d", w.Code)
	}
}

func TestRequestLogger_DoesNotBlock(t *testing.T) {
	r := gin.New()
	r.Use(middleware.CorrelationID())
	r.Use(middleware.RequestLogger())
	r.GET("/", func(c *gin.Context) {
		c.Status(http.StatusOK)
	})

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", w.Code)
	}
}
