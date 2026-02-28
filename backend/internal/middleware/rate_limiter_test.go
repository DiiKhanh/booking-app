package middleware_test

import (
	"booking-app/internal/middleware"
	"net/http"
	"net/http/httptest"
	"strconv"
	"testing"
	"time"

	"github.com/alicebob/miniredis/v2"
	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
)

// newTestRedis creates an in-memory Redis server for tests.
func newTestRedis(t *testing.T) (*miniredis.Miniredis, *redis.Client) {
	t.Helper()
	mr, err := miniredis.Run()
	if err != nil {
		t.Fatalf("failed to start miniredis: %v", err)
	}
	t.Cleanup(mr.Close)

	client := redis.NewClient(&redis.Options{Addr: mr.Addr()})
	t.Cleanup(func() { _ = client.Close() })
	return mr, client
}

func newRateLimitedRouter(client *redis.Client, limit int, window time.Duration, prefix string) *gin.Engine {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.Use(middleware.RateLimiter(client, limit, window, prefix))
	r.GET("/test", func(c *gin.Context) {
		c.Status(http.StatusOK)
	})
	return r
}

func TestRateLimiter_AllowsRequestsUnderLimit(t *testing.T) {
	_, client := newTestRedis(t)
	r := newRateLimitedRouter(client, 5, time.Minute, "rl:test")

	for i := 0; i < 5; i++ {
		req := httptest.NewRequest(http.MethodGet, "/test", nil)
		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)

		if w.Code != http.StatusOK {
			t.Errorf("request %d: expected 200, got %d", i+1, w.Code)
		}
	}
}

func TestRateLimiter_BlocksRequestsOverLimit(t *testing.T) {
	_, client := newTestRedis(t)
	limit := 3
	r := newRateLimitedRouter(client, limit, time.Minute, "rl:block")

	// Exhaust the limit.
	for i := 0; i < limit; i++ {
		req := httptest.NewRequest(http.MethodGet, "/test", nil)
		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)
		if w.Code != http.StatusOK {
			t.Fatalf("request %d: expected 200 while under limit, got %d", i+1, w.Code)
		}
	}

	// Next request must be rejected.
	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusTooManyRequests {
		t.Errorf("expected 429 when over limit, got %d", w.Code)
	}
}

func TestRateLimiter_SetsRateLimitHeaders(t *testing.T) {
	_, client := newTestRedis(t)
	limit := 10
	r := newRateLimitedRouter(client, limit, time.Minute, "rl:headers")

	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Header().Get("X-RateLimit-Limit") == "" {
		t.Error("expected X-RateLimit-Limit header")
	}
	if w.Header().Get("X-RateLimit-Remaining") == "" {
		t.Error("expected X-RateLimit-Remaining header")
	}
	if w.Header().Get("X-RateLimit-Reset") == "" {
		t.Error("expected X-RateLimit-Reset header")
	}

	limitVal, err := strconv.Atoi(w.Header().Get("X-RateLimit-Limit"))
	if err != nil || limitVal != limit {
		t.Errorf("expected X-RateLimit-Limit=%d, got %q", limit, w.Header().Get("X-RateLimit-Limit"))
	}
}

func TestRateLimiter_HeaderRemainingDecrements(t *testing.T) {
	_, client := newTestRedis(t)
	limit := 5
	r := newRateLimitedRouter(client, limit, time.Minute, "rl:decrement")

	for i := 0; i < 3; i++ {
		req := httptest.NewRequest(http.MethodGet, "/test", nil)
		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)

		remaining, err := strconv.Atoi(w.Header().Get("X-RateLimit-Remaining"))
		if err != nil {
			t.Fatalf("request %d: invalid X-RateLimit-Remaining: %v", i+1, err)
		}
		expected := limit - (i + 1)
		if remaining != expected {
			t.Errorf("request %d: expected remaining=%d, got %d", i+1, expected, remaining)
		}
	}
}

func TestRateLimiter_SetsRetryAfterHeaderOn429(t *testing.T) {
	_, client := newTestRedis(t)
	limit := 1
	r := newRateLimitedRouter(client, limit, time.Minute, "rl:retry")

	// First request passes.
	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	if w.Code != http.StatusOK {
		t.Fatalf("expected first request to pass, got %d", w.Code)
	}

	// Second request should be blocked.
	req2 := httptest.NewRequest(http.MethodGet, "/test", nil)
	w2 := httptest.NewRecorder()
	r.ServeHTTP(w2, req2)

	if w2.Code != http.StatusTooManyRequests {
		t.Fatalf("expected 429, got %d", w2.Code)
	}
	if w2.Header().Get("Retry-After") == "" {
		t.Error("expected Retry-After header on 429 response")
	}
}

func TestRateLimiter_FailOpen_WhenRedisDown(t *testing.T) {
	gin.SetMode(gin.TestMode)
	// Create a Redis client pointing to a non-existent server.
	deadClient := redis.NewClient(&redis.Options{
		Addr:        "127.0.0.1:19999",
		DialTimeout: 50 * time.Millisecond,
		ReadTimeout: 50 * time.Millisecond,
	})
	t.Cleanup(func() { _ = deadClient.Close() })

	r := gin.New()
	r.Use(middleware.RateLimiter(deadClient, 5, time.Minute, "rl:failopen"))
	r.GET("/test", func(c *gin.Context) {
		c.Status(http.StatusOK)
	})

	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	// Fail open: request must pass through even when Redis is unavailable.
	if w.Code != http.StatusOK {
		t.Errorf("expected fail-open (200) when Redis is down, got %d", w.Code)
	}
}

func TestRateLimiter_DifferentPrefixesAreIndependent(t *testing.T) {
	_, client := newTestRedis(t)
	limit := 2

	r1 := newRateLimitedRouter(client, limit, time.Minute, "rl:prefix1")
	r2 := newRateLimitedRouter(client, limit, time.Minute, "rl:prefix2")

	// Exhaust prefix1.
	for i := 0; i < limit; i++ {
		req := httptest.NewRequest(http.MethodGet, "/test", nil)
		w := httptest.NewRecorder()
		r1.ServeHTTP(w, req)
	}

	// prefix2 should still allow requests.
	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	w := httptest.NewRecorder()
	r2.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200 for different key prefix, got %d", w.Code)
	}
}
