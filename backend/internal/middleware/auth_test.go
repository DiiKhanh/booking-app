package middleware_test

import (
	"booking-app/internal/domain"
	tokenpkg "booking-app/internal/infrastructure/jwt"
	"booking-app/internal/middleware"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
)

func newTestTokenManager() *tokenpkg.TokenManager {
	return tokenpkg.NewTokenManager("test-secret-key-32-bytes-minimum!", 15*time.Minute, 7*24*time.Hour)
}

// ---- JWTAuth middleware ----

func TestJWTAuth_ValidToken_SetsContext(t *testing.T) {
	mgr := newTestTokenManager()
	token, err := mgr.GenerateAccessToken("user-abc", string(domain.RoleGuest))
	if err != nil {
		t.Fatalf("generate error: %v", err)
	}

	r := gin.New()
	r.Use(middleware.JWTAuth(mgr))
	r.GET("/protected", func(c *gin.Context) {
		userID, _ := c.Get("userID")
		role, _ := c.Get("userRole")
		c.JSON(http.StatusOK, gin.H{"userID": userID, "role": role})
	})

	req := httptest.NewRequest(http.MethodGet, "/protected", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d (body: %s)", w.Code, w.Body.String())
	}
}

func TestJWTAuth_MissingHeader_Returns401(t *testing.T) {
	mgr := newTestTokenManager()
	r := gin.New()
	r.Use(middleware.JWTAuth(mgr))
	r.GET("/protected", func(c *gin.Context) { c.Status(http.StatusOK) })

	req := httptest.NewRequest(http.MethodGet, "/protected", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestJWTAuth_InvalidToken_Returns401(t *testing.T) {
	mgr := newTestTokenManager()
	r := gin.New()
	r.Use(middleware.JWTAuth(mgr))
	r.GET("/protected", func(c *gin.Context) { c.Status(http.StatusOK) })

	req := httptest.NewRequest(http.MethodGet, "/protected", nil)
	req.Header.Set("Authorization", "Bearer invalid.token.here")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestJWTAuth_MalformedAuthHeader_Returns401(t *testing.T) {
	mgr := newTestTokenManager()
	r := gin.New()
	r.Use(middleware.JWTAuth(mgr))
	r.GET("/protected", func(c *gin.Context) { c.Status(http.StatusOK) })

	req := httptest.NewRequest(http.MethodGet, "/protected", nil)
	req.Header.Set("Authorization", "NotBearer sometoken")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401 for malformed auth header, got %d", w.Code)
	}
}

func TestJWTAuth_AbortsProperly(t *testing.T) {
	mgr := newTestTokenManager()
	handlerCalled := false

	r := gin.New()
	r.Use(middleware.JWTAuth(mgr))
	r.GET("/protected", func(c *gin.Context) {
		handlerCalled = true
		c.Status(http.StatusOK)
	})

	req := httptest.NewRequest(http.MethodGet, "/protected", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if handlerCalled {
		t.Error("handler should not be called when auth fails")
	}
}

// ---- RequireRole middleware ----

func TestRequireRole_AllowsMatchingRole(t *testing.T) {
	mgr := newTestTokenManager()
	token, _ := mgr.GenerateAccessToken("user-admin", string(domain.RoleAdmin))

	r := gin.New()
	r.Use(middleware.JWTAuth(mgr))
	r.Use(middleware.RequireRole(domain.RoleAdmin))
	r.GET("/admin", func(c *gin.Context) { c.Status(http.StatusOK) })

	req := httptest.NewRequest(http.MethodGet, "/admin", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", w.Code)
	}
}

func TestRequireRole_DeniesNonMatchingRole(t *testing.T) {
	mgr := newTestTokenManager()
	token, _ := mgr.GenerateAccessToken("user-guest", string(domain.RoleGuest))

	r := gin.New()
	r.Use(middleware.JWTAuth(mgr))
	r.Use(middleware.RequireRole(domain.RoleAdmin))
	r.GET("/admin", func(c *gin.Context) { c.Status(http.StatusOK) })

	req := httptest.NewRequest(http.MethodGet, "/admin", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusForbidden {
		t.Errorf("expected 403, got %d", w.Code)
	}
}

func TestRequireRole_AllowsMultipleRoles(t *testing.T) {
	mgr := newTestTokenManager()
	tokenOwner, _ := mgr.GenerateAccessToken("user-owner", string(domain.RoleOwner))
	tokenAdmin, _ := mgr.GenerateAccessToken("user-admin", string(domain.RoleAdmin))

	r := gin.New()
	r.Use(middleware.JWTAuth(mgr))
	r.Use(middleware.RequireRole(domain.RoleOwner, domain.RoleAdmin))
	r.GET("/restricted", func(c *gin.Context) { c.Status(http.StatusOK) })

	for _, tok := range []string{tokenOwner, tokenAdmin} {
		req := httptest.NewRequest(http.MethodGet, "/restricted", nil)
		req.Header.Set("Authorization", "Bearer "+tok)
		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)
		if w.Code != http.StatusOK {
			t.Errorf("expected 200 for token %q, got %d", tok, w.Code)
		}
	}
}
