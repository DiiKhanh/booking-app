package middleware_test

import (
	"booking-app/internal/domain"
	"booking-app/internal/middleware"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
)

func TestRequireRole_MissingRoleInContext_Returns403(t *testing.T) {
	r := gin.New()
	// No JWTAuth — no "userRole" set in context
	r.Use(middleware.RequireRole(domain.RoleAdmin))
	r.GET("/", func(c *gin.Context) { c.Status(http.StatusOK) })

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusForbidden {
		t.Errorf("expected 403 when role not in context, got %d", w.Code)
	}
}

func TestRequireRole_InvalidRoleType_Returns403(t *testing.T) {
	r := gin.New()
	r.Use(func(c *gin.Context) {
		c.Set("userRole", 12345) // wrong type — int instead of string
		c.Next()
	})
	r.Use(middleware.RequireRole(domain.RoleAdmin))
	r.GET("/", func(c *gin.Context) { c.Status(http.StatusOK) })

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusForbidden {
		t.Errorf("expected 403 for invalid role type, got %d", w.Code)
	}
}
