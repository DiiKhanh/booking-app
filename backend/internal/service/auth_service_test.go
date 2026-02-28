package service_test

import (
	"booking-app/internal/domain"
	tokenpkg "booking-app/internal/infrastructure/jwt"
	"booking-app/internal/service"
	"context"
	"errors"
	"testing"
	"time"

	"golang.org/x/crypto/bcrypt"
)

// ---- Mocks ----

type mockUserRepo struct {
	createErr      error
	findByEmailFn  func(ctx context.Context, email string) (*domain.User, error)
	findByIDFn     func(ctx context.Context, id string) (*domain.User, error)
	createdUser    *domain.User
}

func (m *mockUserRepo) CreateUser(ctx context.Context, user *domain.User) error {
	if m.createErr != nil {
		return m.createErr
	}
	m.createdUser = user
	user.ID = "generated-uuid"
	user.CreatedAt = time.Now()
	user.UpdatedAt = time.Now()
	return nil
}

func (m *mockUserRepo) FindUserByEmail(ctx context.Context, email string) (*domain.User, error) {
	if m.findByEmailFn != nil {
		return m.findByEmailFn(ctx, email)
	}
	return nil, domain.ErrNotFound
}

func (m *mockUserRepo) FindUserByID(ctx context.Context, id string) (*domain.User, error) {
	if m.findByIDFn != nil {
		return m.findByIDFn(ctx, id)
	}
	return nil, domain.ErrNotFound
}

func (m *mockUserRepo) ListUsers(ctx context.Context, page, limit int) ([]*domain.User, int, error) {
	return []*domain.User{}, 0, nil
}

func (m *mockUserRepo) UpdateUserRole(ctx context.Context, id string, role domain.Role) error {
	return nil
}

func (m *mockUserRepo) DeactivateUser(ctx context.Context, id string) error {
	return nil
}

type mockTokenRepo struct {
	createErr          error
	findByHashFn       func(ctx context.Context, hash string) (*domain.RefreshToken, error)
	revokeErr          error
	revokeAllErr       error
	revokedTokenIDs    []string
	revokedUserIDs     []string
}

func (m *mockTokenRepo) CreateRefreshToken(ctx context.Context, token *domain.RefreshToken) error {
	if m.createErr != nil {
		return m.createErr
	}
	token.ID = "token-uuid"
	return nil
}

func (m *mockTokenRepo) FindRefreshTokenByHash(ctx context.Context, hash string) (*domain.RefreshToken, error) {
	if m.findByHashFn != nil {
		return m.findByHashFn(ctx, hash)
	}
	return nil, domain.ErrNotFound
}

func (m *mockTokenRepo) RevokeRefreshToken(ctx context.Context, tokenID string, revokedAt time.Time) error {
	m.revokedTokenIDs = append(m.revokedTokenIDs, tokenID)
	return m.revokeErr
}

func (m *mockTokenRepo) RevokeAllUserTokens(ctx context.Context, userID string, revokedAt time.Time) error {
	m.revokedUserIDs = append(m.revokedUserIDs, userID)
	return m.revokeAllErr
}

func newTestAuthService() (*service.AuthService, *mockUserRepo, *mockTokenRepo) {
	userRepo := &mockUserRepo{}
	tokenRepo := &mockTokenRepo{}
	mgr := tokenpkg.NewTokenManager("test-secret-key-32-bytes-minimum!", 15*time.Minute, 7*24*time.Hour)
	svc := service.NewAuthService(userRepo, tokenRepo, mgr)
	return svc, userRepo, tokenRepo
}

// ---- Register ----

func TestAuthService_Register_Success(t *testing.T) {
	svc, _, _ := newTestAuthService()

	result, err := svc.Register(context.Background(), service.RegisterInput{
		Email:    "test@example.com",
		Password: "SecurePass123",
		FullName: "John Doe",
		Phone:    "0901234567",
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result.User == nil {
		t.Fatal("expected non-nil user")
	}
	if result.User.Email != "test@example.com" {
		t.Errorf("expected email 'test@example.com', got %q", result.User.Email)
	}
	if result.User.PasswordHash == "SecurePass123" {
		t.Error("password must be hashed, not stored in plain text")
	}
	if result.User.Role != domain.RoleGuest {
		t.Errorf("expected role 'guest', got %q", result.User.Role)
	}
	if result.AccessToken == "" {
		t.Error("expected non-empty access token")
	}
	if result.RefreshToken == "" {
		t.Error("expected non-empty refresh token")
	}
}

func TestAuthService_Register_DuplicateEmail(t *testing.T) {
	svc, userRepo, _ := newTestAuthService()
	userRepo.createErr = domain.ErrConflict

	_, err := svc.Register(context.Background(), service.RegisterInput{
		Email:    "existing@example.com",
		Password: "SecurePass123",
		FullName: "Jane Doe",
	})
	if !errors.Is(err, domain.ErrConflict) {
		t.Errorf("expected ErrConflict, got %v", err)
	}
}

func TestAuthService_Register_EmptyEmail(t *testing.T) {
	svc, _, _ := newTestAuthService()

	_, err := svc.Register(context.Background(), service.RegisterInput{
		Email:    "",
		Password: "SecurePass123",
		FullName: "John Doe",
	})
	if !errors.Is(err, domain.ErrBadRequest) {
		t.Errorf("expected ErrBadRequest for empty email, got %v", err)
	}
}

func TestAuthService_Register_EmptyPassword(t *testing.T) {
	svc, _, _ := newTestAuthService()

	_, err := svc.Register(context.Background(), service.RegisterInput{
		Email:    "test@example.com",
		Password: "",
		FullName: "John Doe",
	})
	if !errors.Is(err, domain.ErrBadRequest) {
		t.Errorf("expected ErrBadRequest for empty password, got %v", err)
	}
}

func TestAuthService_Register_EmptyFullName(t *testing.T) {
	svc, _, _ := newTestAuthService()

	_, err := svc.Register(context.Background(), service.RegisterInput{
		Email:    "test@example.com",
		Password: "SecurePass123",
		FullName: "",
	})
	if !errors.Is(err, domain.ErrBadRequest) {
		t.Errorf("expected ErrBadRequest for empty full name, got %v", err)
	}
}

// ---- Login ----

func TestAuthService_Login_Success(t *testing.T) {
	svc, userRepo, _ := newTestAuthService()

	hash, _ := bcrypt.GenerateFromPassword([]byte("SecurePass123"), 12)
	userRepo.findByEmailFn = func(_ context.Context, email string) (*domain.User, error) {
		return &domain.User{
			ID:           "user-id-1",
			Email:        email,
			PasswordHash: string(hash),
			FullName:     "John Doe",
			Role:         domain.RoleGuest,
			IsActive:     true,
		}, nil
	}

	result, err := svc.Login(context.Background(), service.LoginInput{
		Email:    "test@example.com",
		Password: "SecurePass123",
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result.AccessToken == "" {
		t.Error("expected non-empty access token")
	}
	if result.RefreshToken == "" {
		t.Error("expected non-empty refresh token")
	}
}

func TestAuthService_Login_WrongPassword(t *testing.T) {
	svc, userRepo, _ := newTestAuthService()

	hash, _ := bcrypt.GenerateFromPassword([]byte("CorrectPassword"), 12)
	userRepo.findByEmailFn = func(_ context.Context, email string) (*domain.User, error) {
		return &domain.User{
			ID:           "user-id-1",
			Email:        email,
			PasswordHash: string(hash),
			Role:         domain.RoleGuest,
			IsActive:     true,
		}, nil
	}

	_, err := svc.Login(context.Background(), service.LoginInput{
		Email:    "test@example.com",
		Password: "WrongPassword",
	})
	if !errors.Is(err, domain.ErrUnauthorized) {
		t.Errorf("expected ErrUnauthorized for wrong password, got %v", err)
	}
}

func TestAuthService_Login_UserNotFound(t *testing.T) {
	svc, _, _ := newTestAuthService()
	// mockUserRepo.findByEmailFn is nil → returns ErrNotFound

	_, err := svc.Login(context.Background(), service.LoginInput{
		Email:    "nonexistent@example.com",
		Password: "SomePass123",
	})
	if !errors.Is(err, domain.ErrUnauthorized) {
		t.Errorf("expected ErrUnauthorized for unknown email, got %v", err)
	}
}

func TestAuthService_Login_InactiveUser(t *testing.T) {
	svc, userRepo, _ := newTestAuthService()

	hash, _ := bcrypt.GenerateFromPassword([]byte("SecurePass123"), 12)
	userRepo.findByEmailFn = func(_ context.Context, email string) (*domain.User, error) {
		return &domain.User{
			ID:           "user-id-1",
			Email:        email,
			PasswordHash: string(hash),
			Role:         domain.RoleGuest,
			IsActive:     false,
		}, nil
	}

	_, err := svc.Login(context.Background(), service.LoginInput{
		Email:    "inactive@example.com",
		Password: "SecurePass123",
	})
	if !errors.Is(err, domain.ErrForbidden) {
		t.Errorf("expected ErrForbidden for inactive user, got %v", err)
	}
}

func TestAuthService_Login_EmptyEmail(t *testing.T) {
	svc, _, _ := newTestAuthService()
	_, err := svc.Login(context.Background(), service.LoginInput{Email: "", Password: "pass"})
	if !errors.Is(err, domain.ErrBadRequest) {
		t.Errorf("expected ErrBadRequest for empty email, got %v", err)
	}
}

func TestAuthService_Login_EmptyPassword(t *testing.T) {
	svc, _, _ := newTestAuthService()
	_, err := svc.Login(context.Background(), service.LoginInput{Email: "a@b.com", Password: ""})
	if !errors.Is(err, domain.ErrBadRequest) {
		t.Errorf("expected ErrBadRequest for empty password, got %v", err)
	}
}

// ---- Refresh ----

func TestAuthService_Refresh_Success(t *testing.T) {
	svc, userRepo, tokenRepo := newTestAuthService()

	mgr := tokenpkg.NewTokenManager("test-secret-key-32-bytes-minimum!", 15*time.Minute, 7*24*time.Hour)
	rawToken, tokenHash, expiresAt, _ := mgr.GenerateRefreshToken()

	tokenRepo.findByHashFn = func(_ context.Context, hash string) (*domain.RefreshToken, error) {
		return &domain.RefreshToken{
			ID:        "rt-id-1",
			UserID:    "user-id-1",
			TokenHash: hash,
			ExpiresAt: expiresAt,
		}, nil
	}
	userRepo.findByIDFn = func(_ context.Context, id string) (*domain.User, error) {
		return &domain.User{
			ID:       "user-id-1",
			Email:    "test@example.com",
			Role:     domain.RoleGuest,
			IsActive: true,
		}, nil
	}

	_ = tokenHash // used internally by the service via HashRefreshToken

	result, err := svc.Refresh(context.Background(), rawToken)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result.AccessToken == "" {
		t.Error("expected non-empty new access token")
	}
	if result.RefreshToken == "" {
		t.Error("expected non-empty new refresh token")
	}
	if len(tokenRepo.revokedTokenIDs) == 0 {
		t.Error("expected old token to be revoked")
	}
}

func TestAuthService_Refresh_TokenNotFound(t *testing.T) {
	svc, _, _ := newTestAuthService()
	// tokenRepo.findByHashFn is nil → returns ErrNotFound

	_, err := svc.Refresh(context.Background(), "some-raw-token")
	if !errors.Is(err, domain.ErrUnauthorized) {
		t.Errorf("expected ErrUnauthorized for unknown token, got %v", err)
	}
}

func TestAuthService_Refresh_RevokedToken(t *testing.T) {
	svc, _, tokenRepo := newTestAuthService()

	now := time.Now()
	tokenRepo.findByHashFn = func(_ context.Context, hash string) (*domain.RefreshToken, error) {
		return &domain.RefreshToken{
			ID:        "rt-id-1",
			UserID:    "user-id-1",
			TokenHash: hash,
			ExpiresAt: now.Add(1 * time.Hour),
			RevokedAt: &now,
		}, nil
	}

	_, err := svc.Refresh(context.Background(), "some-raw-token")
	if !errors.Is(err, domain.ErrUnauthorized) {
		t.Errorf("expected ErrUnauthorized for revoked token, got %v", err)
	}
}

func TestAuthService_Refresh_ExpiredToken(t *testing.T) {
	svc, _, tokenRepo := newTestAuthService()

	tokenRepo.findByHashFn = func(_ context.Context, hash string) (*domain.RefreshToken, error) {
		return &domain.RefreshToken{
			ID:        "rt-id-1",
			UserID:    "user-id-1",
			TokenHash: hash,
			ExpiresAt: time.Now().Add(-1 * time.Hour), // already expired
		}, nil
	}

	_, err := svc.Refresh(context.Background(), "some-raw-token")
	if !errors.Is(err, domain.ErrUnauthorized) {
		t.Errorf("expected ErrUnauthorized for expired token, got %v", err)
	}
}

func TestAuthService_Refresh_EmptyToken(t *testing.T) {
	svc, _, _ := newTestAuthService()
	_, err := svc.Refresh(context.Background(), "")
	if !errors.Is(err, domain.ErrBadRequest) {
		t.Errorf("expected ErrBadRequest for empty token, got %v", err)
	}
}

// ---- Logout ----

func TestAuthService_Logout_Success(t *testing.T) {
	svc, _, tokenRepo := newTestAuthService()

	err := svc.Logout(context.Background(), "user-id-1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(tokenRepo.revokedUserIDs) == 0 {
		t.Error("expected RevokeAllUserTokens to be called")
	}
	if tokenRepo.revokedUserIDs[0] != "user-id-1" {
		t.Errorf("expected userID 'user-id-1', got %q", tokenRepo.revokedUserIDs[0])
	}
}

func TestAuthService_Logout_EmptyUserID(t *testing.T) {
	svc, _, _ := newTestAuthService()
	err := svc.Logout(context.Background(), "")
	if !errors.Is(err, domain.ErrBadRequest) {
		t.Errorf("expected ErrBadRequest for empty userID, got %v", err)
	}
}

// ---- Profile ----

func TestAuthService_Profile_Success(t *testing.T) {
	svc, userRepo, _ := newTestAuthService()

	userRepo.findByIDFn = func(_ context.Context, id string) (*domain.User, error) {
		return &domain.User{
			ID:       id,
			Email:    "test@example.com",
			FullName: "John Doe",
			Role:     domain.RoleGuest,
			IsActive: true,
		}, nil
	}

	user, err := svc.Profile(context.Background(), "user-id-1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if user.ID != "user-id-1" {
		t.Errorf("expected ID 'user-id-1', got %q", user.ID)
	}
}

func TestAuthService_Profile_NotFound(t *testing.T) {
	svc, _, _ := newTestAuthService()
	// userRepo.findByIDFn is nil → returns ErrNotFound

	_, err := svc.Profile(context.Background(), "nonexistent")
	if !errors.Is(err, domain.ErrNotFound) {
		t.Errorf("expected ErrNotFound, got %v", err)
	}
}

func TestAuthService_Profile_EmptyUserID(t *testing.T) {
	svc, _, _ := newTestAuthService()
	_, err := svc.Profile(context.Background(), "")
	if !errors.Is(err, domain.ErrBadRequest) {
		t.Errorf("expected ErrBadRequest for empty userID, got %v", err)
	}
}

// ---- issueTokens error paths ----

func TestAuthService_Register_TokenRepoPersistError(t *testing.T) {
	userRepo := &mockUserRepo{}
	tokenRepo := &mockTokenRepo{createErr: errors.New("db down")}
	mgr := tokenpkg.NewTokenManager("test-secret-key-32-bytes-minimum!", 15*time.Minute, 7*24*time.Hour)
	svc := service.NewAuthService(userRepo, tokenRepo, mgr)

	_, err := svc.Register(context.Background(), service.RegisterInput{
		Email:    "test@example.com",
		Password: "SecurePass123",
		FullName: "John Doe",
	})
	if err == nil {
		t.Fatal("expected error when token repo fails")
	}
}

func TestAuthService_Refresh_UserNotFoundAfterTokenLookup(t *testing.T) {
	userRepo := &mockUserRepo{} // findByIDFn is nil → ErrNotFound
	tokenRepo := &mockTokenRepo{}
	mgr := tokenpkg.NewTokenManager("test-secret-key-32-bytes-minimum!", 15*time.Minute, 7*24*time.Hour)
	svc := service.NewAuthService(userRepo, tokenRepo, mgr)

	tokenRepo.findByHashFn = func(_ context.Context, hash string) (*domain.RefreshToken, error) {
		return &domain.RefreshToken{
			ID:        "rt-id-1",
			UserID:    "user-id-1",
			TokenHash: hash,
			ExpiresAt: time.Now().Add(1 * time.Hour),
		}, nil
	}

	_, err := svc.Refresh(context.Background(), "some-raw-token")
	if !errors.Is(err, domain.ErrUnauthorized) {
		t.Errorf("expected ErrUnauthorized when user not found, got %v", err)
	}
}

func TestAuthService_Logout_RepoError(t *testing.T) {
	userRepo := &mockUserRepo{}
	tokenRepo := &mockTokenRepo{revokeAllErr: errors.New("db error")}
	mgr := tokenpkg.NewTokenManager("test-secret-key-32-bytes-minimum!", 15*time.Minute, 7*24*time.Hour)
	svc := service.NewAuthService(userRepo, tokenRepo, mgr)

	err := svc.Logout(context.Background(), "user-id-1")
	if err == nil {
		t.Fatal("expected error when token repo fails")
	}
}
