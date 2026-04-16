package handler_test

import (
	"booking-app/internal/domain"
	"booking-app/internal/dto/response"
	"booking-app/internal/handler"
	"booking-app/internal/service"
	"bytes"
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

func init() {
	gin.SetMode(gin.TestMode)
}

// ---- Mock AuthService ----

type mockAuthService struct {
	registerFn        func(ctx context.Context, input service.RegisterInput) (*service.AuthResult, error)
	loginFn           func(ctx context.Context, input service.LoginInput) (*service.AuthResult, error)
	refreshFn         func(ctx context.Context, rawToken string) (*service.AuthResult, error)
	logoutFn          func(ctx context.Context, userID string) error
	profileFn         func(ctx context.Context, userID string) (*domain.User, error)
	updateProfileFn   func(ctx context.Context, userID string, input service.UpdateProfileInput) (*domain.User, error)
	forgotPasswordFn  func(ctx context.Context, email string) (string, error)
	resetPasswordFn   func(ctx context.Context, token, newPassword string) error
}

func (m *mockAuthService) Register(ctx context.Context, input service.RegisterInput) (*service.AuthResult, error) {
	if m.registerFn != nil {
		return m.registerFn(ctx, input)
	}
	return nil, errors.New("not configured")
}

func (m *mockAuthService) Login(ctx context.Context, input service.LoginInput) (*service.AuthResult, error) {
	if m.loginFn != nil {
		return m.loginFn(ctx, input)
	}
	return nil, errors.New("not configured")
}

func (m *mockAuthService) Refresh(ctx context.Context, rawToken string) (*service.AuthResult, error) {
	if m.refreshFn != nil {
		return m.refreshFn(ctx, rawToken)
	}
	return nil, errors.New("not configured")
}

func (m *mockAuthService) Logout(ctx context.Context, userID string) error {
	if m.logoutFn != nil {
		return m.logoutFn(ctx, userID)
	}
	return nil
}

func (m *mockAuthService) Profile(ctx context.Context, userID string) (*domain.User, error) {
	if m.profileFn != nil {
		return m.profileFn(ctx, userID)
	}
	return nil, errors.New("not configured")
}

func (m *mockAuthService) UpdateProfile(ctx context.Context, userID string, input service.UpdateProfileInput) (*domain.User, error) {
	if m.updateProfileFn != nil {
		return m.updateProfileFn(ctx, userID, input)
	}
	return nil, errors.New("not configured")
}

func (m *mockAuthService) ForgotPassword(ctx context.Context, email string) (string, error) {
	if m.forgotPasswordFn != nil {
		return m.forgotPasswordFn(ctx, email)
	}
	return "", errors.New("not configured")
}

func (m *mockAuthService) ResetPassword(ctx context.Context, token, newPassword string) error {
	if m.resetPasswordFn != nil {
		return m.resetPasswordFn(ctx, token, newPassword)
	}
	return errors.New("not configured")
}

func buildAuthRouter(svc handler.AuthServiceInterface) *gin.Engine {
	r := gin.New()
	h := handler.NewAuthHandler(svc)
	v1 := r.Group("/api/v1/auth")
	v1.POST("/register", h.Register)
	v1.POST("/login", h.Login)
	v1.POST("/refresh", h.Refresh)
	v1.POST("/logout", func(c *gin.Context) {
		c.Set("userID", "user-id-1")
		h.Logout(c)
	})
	v1.GET("/me", func(c *gin.Context) {
		c.Set("userID", "user-id-1")
		h.Me(c)
	})
	v1.PUT("/me", func(c *gin.Context) {
		c.Set("userID", "user-id-1")
		h.UpdateProfile(c)
	})
	v1.POST("/forgot-password", h.ForgotPassword)
	v1.POST("/reset-password", h.ResetPassword)
	return r
}

func makeRequest(r *gin.Engine, method, path string, body interface{}) *httptest.ResponseRecorder {
	var buf bytes.Buffer
	if body != nil {
		_ = json.NewEncoder(&buf).Encode(body)
	}
	req := httptest.NewRequest(method, path, &buf)
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	return w
}

// ---- POST /auth/register ----

func TestAuthHandler_Register_Success(t *testing.T) {
	svc := &mockAuthService{
		registerFn: func(_ context.Context, input service.RegisterInput) (*service.AuthResult, error) {
			return &service.AuthResult{
				AccessToken:  "access-tok",
				RefreshToken: "refresh-tok",
				ExpiresIn:    900,
				User: &domain.User{
					ID:       "uid-1",
					Email:    input.Email,
					FullName: input.FullName,
					Role:     domain.RoleGuest,
					IsActive: true,
				},
			}, nil
		},
	}
	r := buildAuthRouter(svc)
	w := makeRequest(r, http.MethodPost, "/api/v1/auth/register", map[string]string{
		"email":     "test@example.com",
		"password":  "SecurePass123",
		"full_name": "John Doe",
	})

	if w.Code != http.StatusCreated {
		t.Errorf("expected 201, got %d (body: %s)", w.Code, w.Body.String())
	}
	var resp response.APIResponse
	if err := json.NewDecoder(w.Body).Decode(&resp); err != nil {
		t.Fatalf("decode error: %v", err)
	}
	if !resp.Success {
		t.Errorf("expected success=true, got false (error: %s)", resp.Error)
	}
}

func TestAuthHandler_Register_MissingFields(t *testing.T) {
	svc := &mockAuthService{}
	r := buildAuthRouter(svc)
	w := makeRequest(r, http.MethodPost, "/api/v1/auth/register", map[string]string{
		"email": "test@example.com",
		// missing password and full_name
	})

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestAuthHandler_Register_Conflict(t *testing.T) {
	svc := &mockAuthService{
		registerFn: func(_ context.Context, _ service.RegisterInput) (*service.AuthResult, error) {
			return nil, domain.ErrConflict
		},
	}
	r := buildAuthRouter(svc)
	w := makeRequest(r, http.MethodPost, "/api/v1/auth/register", map[string]string{
		"email":     "exists@example.com",
		"password":  "SecurePass123",
		"full_name": "Some User",
	})

	if w.Code != http.StatusConflict {
		t.Errorf("expected 409, got %d", w.Code)
	}
}

// ---- POST /auth/login ----

func TestAuthHandler_Login_Success(t *testing.T) {
	svc := &mockAuthService{
		loginFn: func(_ context.Context, _ service.LoginInput) (*service.AuthResult, error) {
			return &service.AuthResult{
				AccessToken:  "access-tok",
				RefreshToken: "refresh-tok",
				ExpiresIn:    900,
				User: &domain.User{
					ID:       "uid-1",
					Email:    "test@example.com",
					Role:     domain.RoleGuest,
					IsActive: true,
				},
			}, nil
		},
	}
	r := buildAuthRouter(svc)
	w := makeRequest(r, http.MethodPost, "/api/v1/auth/login", map[string]string{
		"email":    "test@example.com",
		"password": "SecurePass123",
	})

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d (body: %s)", w.Code, w.Body.String())
	}
}

func TestAuthHandler_Login_MissingFields(t *testing.T) {
	svc := &mockAuthService{}
	r := buildAuthRouter(svc)
	w := makeRequest(r, http.MethodPost, "/api/v1/auth/login", map[string]string{
		"email": "test@example.com",
		// missing password
	})

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestAuthHandler_Login_Unauthorized(t *testing.T) {
	svc := &mockAuthService{
		loginFn: func(_ context.Context, _ service.LoginInput) (*service.AuthResult, error) {
			return nil, domain.ErrUnauthorized
		},
	}
	r := buildAuthRouter(svc)
	w := makeRequest(r, http.MethodPost, "/api/v1/auth/login", map[string]string{
		"email":    "test@example.com",
		"password": "WrongPass",
	})

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestAuthHandler_Login_Forbidden(t *testing.T) {
	svc := &mockAuthService{
		loginFn: func(_ context.Context, _ service.LoginInput) (*service.AuthResult, error) {
			return nil, domain.ErrForbidden
		},
	}
	r := buildAuthRouter(svc)
	w := makeRequest(r, http.MethodPost, "/api/v1/auth/login", map[string]string{
		"email":    "inactive@example.com",
		"password": "SomePass123",
	})

	if w.Code != http.StatusForbidden {
		t.Errorf("expected 403, got %d", w.Code)
	}
}

// ---- POST /auth/refresh ----

func TestAuthHandler_Refresh_Success(t *testing.T) {
	svc := &mockAuthService{
		refreshFn: func(_ context.Context, _ string) (*service.AuthResult, error) {
			return &service.AuthResult{
				AccessToken:  "new-access-tok",
				RefreshToken: "new-refresh-tok",
				ExpiresIn:    900,
				User:         &domain.User{ID: "uid-1", Role: domain.RoleGuest},
			}, nil
		},
	}
	r := buildAuthRouter(svc)
	w := makeRequest(r, http.MethodPost, "/api/v1/auth/refresh", map[string]string{
		"refresh_token": "old-refresh-tok",
	})

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d (body: %s)", w.Code, w.Body.String())
	}
}

func TestAuthHandler_Refresh_MissingToken(t *testing.T) {
	svc := &mockAuthService{}
	r := buildAuthRouter(svc)
	w := makeRequest(r, http.MethodPost, "/api/v1/auth/refresh", map[string]string{})

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestAuthHandler_Refresh_Unauthorized(t *testing.T) {
	svc := &mockAuthService{
		refreshFn: func(_ context.Context, _ string) (*service.AuthResult, error) {
			return nil, domain.ErrUnauthorized
		},
	}
	r := buildAuthRouter(svc)
	w := makeRequest(r, http.MethodPost, "/api/v1/auth/refresh", map[string]string{
		"refresh_token": "expired-token",
	})

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

// ---- POST /auth/logout ----

func TestAuthHandler_Logout_Success(t *testing.T) {
	svc := &mockAuthService{
		logoutFn: func(_ context.Context, userID string) error {
			return nil
		},
	}
	r := buildAuthRouter(svc)
	w := makeRequest(r, http.MethodPost, "/api/v1/auth/logout", nil)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d (body: %s)", w.Code, w.Body.String())
	}
}

func TestAuthHandler_Logout_InternalError(t *testing.T) {
	svc := &mockAuthService{
		logoutFn: func(_ context.Context, userID string) error {
			return domain.ErrInternal
		},
	}
	r := buildAuthRouter(svc)
	w := makeRequest(r, http.MethodPost, "/api/v1/auth/logout", nil)

	if w.Code != http.StatusInternalServerError {
		t.Errorf("expected 500, got %d", w.Code)
	}
}

// ---- GET /auth/me ----

func TestAuthHandler_Me_Success(t *testing.T) {
	svc := &mockAuthService{
		profileFn: func(_ context.Context, userID string) (*domain.User, error) {
			return &domain.User{
				ID:        userID,
				Email:     "test@example.com",
				FullName:  "John Doe",
				Role:      domain.RoleGuest,
				IsActive:  true,
				CreatedAt: time.Now(),
				UpdatedAt: time.Now(),
			}, nil
		},
	}
	r := buildAuthRouter(svc)
	req := httptest.NewRequest(http.MethodGet, "/api/v1/auth/me", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d (body: %s)", w.Code, w.Body.String())
	}
	var resp response.APIResponse
	if err := json.NewDecoder(w.Body).Decode(&resp); err != nil {
		t.Fatalf("decode error: %v", err)
	}
	if !resp.Success {
		t.Errorf("expected success=true, error: %s", resp.Error)
	}
}

func TestAuthHandler_Me_NotFound(t *testing.T) {
	svc := &mockAuthService{
		profileFn: func(_ context.Context, userID string) (*domain.User, error) {
			return nil, domain.ErrNotFound
		},
	}
	r := buildAuthRouter(svc)
	req := httptest.NewRequest(http.MethodGet, "/api/v1/auth/me", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusNotFound {
		t.Errorf("expected 404, got %d", w.Code)
	}
}

func TestAuthHandler_Register_BadRequest(t *testing.T) {
	svc := &mockAuthService{
		registerFn: func(_ context.Context, _ service.RegisterInput) (*service.AuthResult, error) {
			return nil, domain.ErrBadRequest
		},
	}
	r := buildAuthRouter(svc)
	w := makeRequest(r, http.MethodPost, "/api/v1/auth/register", map[string]string{
		"email":     "test@example.com",
		"password":  "SecurePass123",
		"full_name": "John Doe",
	})

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestAuthHandler_Me_InternalError(t *testing.T) {
	svc := &mockAuthService{
		profileFn: func(_ context.Context, userID string) (*domain.User, error) {
			return nil, domain.ErrInternal
		},
	}
	r := buildAuthRouter(svc)
	req := httptest.NewRequest(http.MethodGet, "/api/v1/auth/me", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusInternalServerError {
		t.Errorf("expected 500, got %d", w.Code)
	}
}

// ---- PUT /auth/me (UpdateProfile) ----

func TestAuthHandler_UpdateProfile_Success(t *testing.T) {
	fullName := "Updated Name"
	svc := &mockAuthService{
		updateProfileFn: func(_ context.Context, userID string, input service.UpdateProfileInput) (*domain.User, error) {
			return &domain.User{
				ID:       userID,
				Email:    "test@example.com",
				FullName: *input.FullName,
				Role:     domain.RoleGuest,
				IsActive: true,
			}, nil
		},
	}
	r := buildAuthRouter(svc)
	w := makeRequest(r, http.MethodPut, "/api/v1/auth/me", map[string]string{
		"full_name": fullName,
	})

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d (body: %s)", w.Code, w.Body.String())
	}
	var resp response.APIResponse
	if err := json.NewDecoder(w.Body).Decode(&resp); err != nil {
		t.Fatalf("decode error: %v", err)
	}
	if !resp.Success {
		t.Errorf("expected success=true, error: %s", resp.Error)
	}
}

func TestAuthHandler_UpdateProfile_NoFields(t *testing.T) {
	svc := &mockAuthService{
		updateProfileFn: func(_ context.Context, _ string, _ service.UpdateProfileInput) (*domain.User, error) {
			return nil, fmt.Errorf("at least one field required: %w", domain.ErrBadRequest)
		},
	}
	r := buildAuthRouter(svc)
	w := makeRequest(r, http.MethodPut, "/api/v1/auth/me", map[string]string{})

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestAuthHandler_UpdateProfile_NotFound(t *testing.T) {
	svc := &mockAuthService{
		updateProfileFn: func(_ context.Context, _ string, _ service.UpdateProfileInput) (*domain.User, error) {
			return nil, domain.ErrNotFound
		},
	}
	r := buildAuthRouter(svc)
	w := makeRequest(r, http.MethodPut, "/api/v1/auth/me", map[string]string{
		"full_name": "Someone",
	})

	if w.Code != http.StatusNotFound {
		t.Errorf("expected 404, got %d", w.Code)
	}
}

// ---- POST /auth/forgot-password ----

func TestAuthHandler_ForgotPassword_Success(t *testing.T) {
	svc := &mockAuthService{
		forgotPasswordFn: func(_ context.Context, email string) (string, error) {
			return "reset-token-abc", nil
		},
	}
	r := buildAuthRouter(svc)
	w := makeRequest(r, http.MethodPost, "/api/v1/auth/forgot-password", map[string]string{
		"email": "test@example.com",
	})

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d (body: %s)", w.Code, w.Body.String())
	}
	var resp response.APIResponse
	if err := json.NewDecoder(w.Body).Decode(&resp); err != nil {
		t.Fatalf("decode error: %v", err)
	}
	if !resp.Success {
		t.Errorf("expected success=true, error: %s", resp.Error)
	}
}

func TestAuthHandler_ForgotPassword_MissingEmail(t *testing.T) {
	svc := &mockAuthService{}
	r := buildAuthRouter(svc)
	w := makeRequest(r, http.MethodPost, "/api/v1/auth/forgot-password", map[string]string{})

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestAuthHandler_ForgotPassword_UserNotFound_StillReturns200(t *testing.T) {
	// Prevent email enumeration — always return 200 even if user not found
	svc := &mockAuthService{
		forgotPasswordFn: func(_ context.Context, email string) (string, error) {
			return "", domain.ErrNotFound
		},
	}
	r := buildAuthRouter(svc)
	w := makeRequest(r, http.MethodPost, "/api/v1/auth/forgot-password", map[string]string{
		"email": "nonexistent@example.com",
	})

	if w.Code != http.StatusOK {
		t.Errorf("expected 200 (prevent enumeration), got %d", w.Code)
	}
}

// ---- POST /auth/reset-password ----

func TestAuthHandler_ResetPassword_Success(t *testing.T) {
	svc := &mockAuthService{
		resetPasswordFn: func(_ context.Context, token, newPassword string) error {
			return nil
		},
	}
	r := buildAuthRouter(svc)
	w := makeRequest(r, http.MethodPost, "/api/v1/auth/reset-password", map[string]string{
		"token":        "valid-reset-token",
		"new_password": "NewSecurePass123",
	})

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d (body: %s)", w.Code, w.Body.String())
	}
}

func TestAuthHandler_ResetPassword_MissingFields(t *testing.T) {
	svc := &mockAuthService{}
	r := buildAuthRouter(svc)
	w := makeRequest(r, http.MethodPost, "/api/v1/auth/reset-password", map[string]string{
		"token": "some-token",
		// missing new_password
	})

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestAuthHandler_ResetPassword_InvalidToken(t *testing.T) {
	svc := &mockAuthService{
		resetPasswordFn: func(_ context.Context, token, _ string) error {
			return fmt.Errorf("invalid or expired token: %w", domain.ErrUnauthorized)
		},
	}
	r := buildAuthRouter(svc)
	w := makeRequest(r, http.MethodPost, "/api/v1/auth/reset-password", map[string]string{
		"token":        "invalid-token",
		"new_password": "NewSecurePass123",
	})

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}
