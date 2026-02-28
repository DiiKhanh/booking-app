package middleware_test

import (
	"booking-app/internal/middleware"
	"booking-app/internal/observability"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	dto "github.com/prometheus/client_model/go"
)

func TestMetricsMiddleware_CountsRequest(t *testing.T) {
	gin.SetMode(gin.TestMode)

	// Reset a known label combination before counting.
	counter := observability.HTTPRequestsTotal.WithLabelValues("GET", "/ping", "200")
	before := readCounterValue(t, counter)

	r := gin.New()
	r.Use(middleware.MetricsMiddleware())
	r.GET("/ping", func(c *gin.Context) {
		c.Status(http.StatusOK)
	})

	req := httptest.NewRequest(http.MethodGet, "/ping", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", w.Code)
	}

	after := readCounterValue(t, counter)
	if after-before != 1.0 {
		t.Errorf("expected HTTPRequestsTotal to increment by 1, got delta=%f", after-before)
	}
}

func TestMetricsMiddleware_CountsErrorStatus(t *testing.T) {
	gin.SetMode(gin.TestMode)

	counter := observability.HTTPRequestsTotal.WithLabelValues("GET", "/missing", "404")
	before := readCounterValue(t, counter)

	r := gin.New()
	r.Use(middleware.MetricsMiddleware())
	// No route registered — Gin returns 404.

	req := httptest.NewRequest(http.MethodGet, "/missing", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusNotFound {
		t.Errorf("expected 404, got %d", w.Code)
	}

	after := readCounterValue(t, counter)
	if after-before != 1.0 {
		t.Errorf("expected HTTPRequestsTotal to increment by 1 for 404, got delta=%f", after-before)
	}
}

func TestMetricsMiddleware_RecordsDuration(t *testing.T) {
	gin.SetMode(gin.TestMode)

	r := gin.New()
	r.Use(middleware.MetricsMiddleware())
	r.GET("/slow", func(c *gin.Context) {
		c.Status(http.StatusOK)
	})

	req := httptest.NewRequest(http.MethodGet, "/slow", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	// The histogram should have at least one observation.
	// We verify by checking that Gather does not error and has samples.
	hist := observability.HTTPRequestDuration.WithLabelValues("GET", "/slow")
	m := &dto.Metric{}
	if err := hist.(interface {
		Write(*dto.Metric) error
	}).Write(m); err != nil {
		t.Fatalf("failed to read histogram: %v", err)
	}
	if m.GetHistogram().GetSampleCount() == 0 {
		t.Error("expected at least one histogram observation")
	}
}

func TestMetricsMiddleware_TracksActiveConnections(t *testing.T) {
	gin.SetMode(gin.TestMode)

	// Set a baseline.
	observability.ActiveConnections.Set(0)

	// Use a channel to synchronize inside-handler check.
	seen := make(chan float64, 1)

	r := gin.New()
	r.Use(middleware.MetricsMiddleware())
	r.GET("/conn", func(c *gin.Context) {
		m := &dto.Metric{}
		if err := observability.ActiveConnections.Write(m); err == nil {
			seen <- m.GetGauge().GetValue()
		}
		c.Status(http.StatusOK)
	})

	req := httptest.NewRequest(http.MethodGet, "/conn", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	val := <-seen
	if val < 1.0 {
		t.Errorf("expected ActiveConnections >= 1 during request, got %f", val)
	}

	// After request completes, gauge should be decremented.
	m := &dto.Metric{}
	if err := observability.ActiveConnections.Write(m); err != nil {
		t.Fatal(err)
	}
	if m.GetGauge().GetValue() != 0.0 {
		t.Errorf("expected ActiveConnections to be 0 after request, got %f", m.GetGauge().GetValue())
	}
}

// readCounterValue reads the float64 value from a prometheus.Counter.
func readCounterValue(t *testing.T, c interface {
	Write(*dto.Metric) error
}) float64 {
	t.Helper()
	m := &dto.Metric{}
	if err := c.Write(m); err != nil {
		t.Fatalf("failed to read counter: %v", err)
	}
	return m.GetCounter().GetValue()
}
