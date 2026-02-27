package handler

import (
	"booking-app/internal/domain"
	"booking-app/internal/dto/request"
	"booking-app/internal/dto/response"
	"booking-app/internal/service"
	"context"
	"errors"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
)

// AuthServiceInterface defines what the auth handler needs from the service layer.
// This enables easy mocking in tests.
type AuthServiceInterface interface {
	Register(ctx context.Context, input service.RegisterInput) (*service.AuthResult, error)
	Login(ctx context.Context, input service.LoginInput) (*service.AuthResult, error)
	Refresh(ctx context.Context, rawToken string) (*service.AuthResult, error)
	Logout(ctx context.Context, userID string) error
	Profile(ctx context.Context, userID string) (*domain.User, error)
}

// AuthHandler handles HTTP requests for authentication endpoints.
type AuthHandler struct {
	svc AuthServiceInterface
}

// NewAuthHandler creates a new AuthHandler.
func NewAuthHandler(svc AuthServiceInterface) *AuthHandler {
	return &AuthHandler{svc: svc}
}

// Register handles POST /api/v1/auth/register.
func (h *AuthHandler) Register(c *gin.Context) {
	var req request.RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, response.Fail(err.Error()))
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	result, err := h.svc.Register(ctx, service.RegisterInput{
		Email:    req.Email,
		Password: req.Password,
		FullName: req.FullName,
		Phone:    req.Phone,
	})
	if err != nil {
		h.handleAuthError(c, err)
		return
	}

	c.JSON(http.StatusCreated, response.OK(buildTokensResponse(result)))
}

// Login handles POST /api/v1/auth/login.
func (h *AuthHandler) Login(c *gin.Context) {
	var req request.LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, response.Fail(err.Error()))
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	result, err := h.svc.Login(ctx, service.LoginInput{
		Email:    req.Email,
		Password: req.Password,
	})
	if err != nil {
		h.handleAuthError(c, err)
		return
	}

	c.JSON(http.StatusOK, response.OK(buildTokensResponse(result)))
}

// Refresh handles POST /api/v1/auth/refresh.
func (h *AuthHandler) Refresh(c *gin.Context) {
	var req request.RefreshRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, response.Fail(err.Error()))
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	result, err := h.svc.Refresh(ctx, req.RefreshToken)
	if err != nil {
		h.handleAuthError(c, err)
		return
	}

	c.JSON(http.StatusOK, response.OK(buildTokensResponse(result)))
}

// Logout handles POST /api/v1/auth/logout.
// Requires JWTAuth middleware to have set "userID" in context.
func (h *AuthHandler) Logout(c *gin.Context) {
	userID := getUserIDFromContext(c)

	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	if err := h.svc.Logout(ctx, userID); err != nil {
		h.handleAuthError(c, err)
		return
	}

	c.JSON(http.StatusOK, response.OK(gin.H{"message": "logged out successfully"}))
}

// Me handles GET /api/v1/auth/me.
// Requires JWTAuth middleware to have set "userID" in context.
func (h *AuthHandler) Me(c *gin.Context) {
	userID := getUserIDFromContext(c)

	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	user, err := h.svc.Profile(ctx, userID)
	if err != nil {
		h.handleAuthError(c, err)
		return
	}

	c.JSON(http.StatusOK, response.OK(response.NewUserProfileResponse(user)))
}

// handleAuthError maps domain errors to HTTP status codes.
func (h *AuthHandler) handleAuthError(c *gin.Context, err error) {
	switch {
	case errors.Is(err, domain.ErrBadRequest):
		c.JSON(http.StatusBadRequest, response.Fail(err.Error()))
	case errors.Is(err, domain.ErrUnauthorized):
		c.JSON(http.StatusUnauthorized, response.Fail(err.Error()))
	case errors.Is(err, domain.ErrForbidden):
		c.JSON(http.StatusForbidden, response.Fail(err.Error()))
	case errors.Is(err, domain.ErrConflict):
		c.JSON(http.StatusConflict, response.Fail(err.Error()))
	case errors.Is(err, domain.ErrNotFound):
		c.JSON(http.StatusNotFound, response.Fail(err.Error()))
	default:
		c.JSON(http.StatusInternalServerError, response.Fail("internal server error"))
	}
}

// getUserIDFromContext retrieves the userID string set by JWTAuth middleware.
func getUserIDFromContext(c *gin.Context) string {
	val, _ := c.Get("userID")
	id, _ := val.(string)
	return id
}

// buildTokensResponse converts an AuthResult to an AuthTokensResponse.
func buildTokensResponse(r *service.AuthResult) response.AuthTokensResponse {
	return response.AuthTokensResponse{
		AccessToken:  r.AccessToken,
		RefreshToken: r.RefreshToken,
		TokenType:    "Bearer",
		ExpiresIn:    r.ExpiresIn,
	}
}
