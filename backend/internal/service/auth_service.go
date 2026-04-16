package service

import (
	"booking-app/internal/domain"
	tokenpkg "booking-app/internal/infrastructure/jwt"
	"booking-app/internal/repository"
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"time"

	"golang.org/x/crypto/bcrypt"
)

const (
	bcryptCost           = 12
	passwordResetTTL     = 1 * time.Hour
	passwordResetMinLen  = 8
)

// RegisterInput holds the data needed to register a new user.
type RegisterInput struct {
	Email    string
	Password string
	FullName string
	Phone    string
}

// LoginInput holds the credentials for authentication.
type LoginInput struct {
	Email    string
	Password string
}

// AuthResult is returned by Register, Login, and Refresh operations.
type AuthResult struct {
	AccessToken  string
	RefreshToken string
	ExpiresIn    int64
	User         *domain.User
}

// UpdateProfileInput holds optional fields to update on a user profile.
// A nil pointer means "do not change this field".
type UpdateProfileInput struct {
	FullName  *string
	Phone     *string
	AvatarURL *string
}

// AuthService handles user authentication business logic.
type AuthService struct {
	userRepo      repository.UserRepository
	tokenRepo     repository.TokenRepository
	resetRepo     repository.PasswordResetRepository
	tokenMgr      *tokenpkg.TokenManager
}

// NewAuthService creates a new AuthService.
func NewAuthService(
	userRepo repository.UserRepository,
	tokenRepo repository.TokenRepository,
	resetRepo repository.PasswordResetRepository,
	tokenMgr *tokenpkg.TokenManager,
) *AuthService {
	return &AuthService{
		userRepo:  userRepo,
		tokenRepo: tokenRepo,
		resetRepo: resetRepo,
		tokenMgr:  tokenMgr,
	}
}

// Register creates a new user account and returns tokens.
func (s *AuthService) Register(ctx context.Context, input RegisterInput) (*AuthResult, error) {
	if input.Email == "" {
		return nil, fmt.Errorf("email is required: %w", domain.ErrBadRequest)
	}
	if input.Password == "" {
		return nil, fmt.Errorf("password is required: %w", domain.ErrBadRequest)
	}
	if input.FullName == "" {
		return nil, fmt.Errorf("full_name is required: %w", domain.ErrBadRequest)
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(input.Password), bcryptCost)
	if err != nil {
		return nil, fmt.Errorf("hash password: %w", domain.ErrInternal)
	}

	user := &domain.User{
		Email:        input.Email,
		PasswordHash: string(hash),
		FullName:     input.FullName,
		Phone:        input.Phone,
		Role:         domain.RoleGuest,
		IsActive:     true,
	}

	if err := s.userRepo.CreateUser(ctx, user); err != nil {
		return nil, err
	}

	return s.issueTokens(ctx, user)
}

// Login authenticates a user and returns tokens.
func (s *AuthService) Login(ctx context.Context, input LoginInput) (*AuthResult, error) {
	if input.Email == "" {
		return nil, fmt.Errorf("email is required: %w", domain.ErrBadRequest)
	}
	if input.Password == "" {
		return nil, fmt.Errorf("password is required: %w", domain.ErrBadRequest)
	}

	user, err := s.userRepo.FindUserByEmail(ctx, input.Email)
	if err != nil {
		// Mask not-found as unauthorized to prevent user enumeration
		return nil, fmt.Errorf("invalid credentials: %w", domain.ErrUnauthorized)
	}

	if !user.IsActive {
		return nil, fmt.Errorf("account is inactive: %w", domain.ErrForbidden)
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(input.Password)); err != nil {
		return nil, fmt.Errorf("invalid credentials: %w", domain.ErrUnauthorized)
	}

	return s.issueTokens(ctx, user)
}

// Refresh rotates the refresh token and issues new tokens.
func (s *AuthService) Refresh(ctx context.Context, rawToken string) (*AuthResult, error) {
	if rawToken == "" {
		return nil, fmt.Errorf("refresh token is required: %w", domain.ErrBadRequest)
	}

	tokenHash := s.tokenMgr.HashRefreshToken(rawToken)
	stored, err := s.tokenRepo.FindRefreshTokenByHash(ctx, tokenHash)
	if err != nil {
		return nil, fmt.Errorf("token not found: %w", domain.ErrUnauthorized)
	}

	if stored.IsRevoked() {
		return nil, fmt.Errorf("token has been revoked: %w", domain.ErrUnauthorized)
	}
	if stored.IsExpired() {
		return nil, fmt.Errorf("token has expired: %w", domain.ErrUnauthorized)
	}

	user, err := s.userRepo.FindUserByID(ctx, stored.UserID)
	if err != nil {
		return nil, fmt.Errorf("user not found: %w", domain.ErrUnauthorized)
	}

	// Revoke old token before issuing new one (rotation)
	if err := s.tokenRepo.RevokeRefreshToken(ctx, stored.ID, time.Now()); err != nil {
		return nil, fmt.Errorf("revoke old token: %w", domain.ErrInternal)
	}

	return s.issueTokens(ctx, user)
}

// Logout revokes all refresh tokens for the given user.
func (s *AuthService) Logout(ctx context.Context, userID string) error {
	if userID == "" {
		return fmt.Errorf("userID is required: %w", domain.ErrBadRequest)
	}
	if err := s.tokenRepo.RevokeAllUserTokens(ctx, userID, time.Now()); err != nil {
		return fmt.Errorf("revoke tokens: %w", err)
	}
	return nil
}

// Profile returns the user profile for the given user ID.
func (s *AuthService) Profile(ctx context.Context, userID string) (*domain.User, error) {
	if userID == "" {
		return nil, fmt.Errorf("userID is required: %w", domain.ErrBadRequest)
	}
	user, err := s.userRepo.FindUserByID(ctx, userID)
	if err != nil {
		return nil, err
	}
	return user, nil
}

// UpdateProfile applies partial updates to the current user's profile.
// At least one field in input must be non-nil.
func (s *AuthService) UpdateProfile(ctx context.Context, userID string, input UpdateProfileInput) (*domain.User, error) {
	if userID == "" {
		return nil, fmt.Errorf("userID is required: %w", domain.ErrBadRequest)
	}
	if input.FullName == nil && input.Phone == nil && input.AvatarURL == nil {
		return nil, fmt.Errorf("at least one field is required: %w", domain.ErrBadRequest)
	}

	user, err := s.userRepo.UpdateUser(ctx, userID, domain.UserUpdates{
		FullName:  input.FullName,
		Phone:     input.Phone,
		AvatarURL: input.AvatarURL,
	})
	if err != nil {
		return nil, err
	}
	return user, nil
}

// ForgotPassword creates a one-time reset token for the given email address and returns
// the plain token. In production this token would be emailed to the user; here it is
// returned directly so the flow can be tested without an email service.
// Returns (ErrNotFound, "") when the email is not registered — callers should map this
// to a generic 200 response to prevent user enumeration.
func (s *AuthService) ForgotPassword(ctx context.Context, email string) (string, error) {
	if email == "" {
		return "", fmt.Errorf("email is required: %w", domain.ErrBadRequest)
	}

	user, err := s.userRepo.FindUserByEmail(ctx, email)
	if err != nil {
		return "", err // ErrNotFound propagated; handler maps to 200
	}

	// Generate a cryptographically random token.
	raw, tokenHash, err := generateResetToken()
	if err != nil {
		return "", fmt.Errorf("generate reset token: %w", domain.ErrInternal)
	}

	reset := &domain.PasswordReset{
		UserID:    user.ID,
		TokenHash: tokenHash,
		ExpiresAt: time.Now().Add(passwordResetTTL),
	}
	if err := s.resetRepo.Create(ctx, reset); err != nil {
		return "", fmt.Errorf("store reset token: %w", domain.ErrInternal)
	}

	return raw, nil
}

// ResetPassword validates the one-time token and updates the user's password.
func (s *AuthService) ResetPassword(ctx context.Context, rawToken, newPassword string) error {
	if rawToken == "" {
		return fmt.Errorf("token is required: %w", domain.ErrBadRequest)
	}
	if len(newPassword) < passwordResetMinLen {
		return fmt.Errorf("password must be at least %d characters: %w", passwordResetMinLen, domain.ErrBadRequest)
	}

	tokenHash := hashResetToken(rawToken)
	pr, err := s.resetRepo.FindByTokenHash(ctx, tokenHash)
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			return fmt.Errorf("invalid or expired token: %w", domain.ErrUnauthorized)
		}
		return fmt.Errorf("look up reset token: %w", domain.ErrInternal)
	}

	if pr.IsUsed() {
		return fmt.Errorf("token has already been used: %w", domain.ErrUnauthorized)
	}
	if pr.IsExpired() {
		return fmt.Errorf("token has expired: %w", domain.ErrUnauthorized)
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcryptCost)
	if err != nil {
		return fmt.Errorf("hash password: %w", domain.ErrInternal)
	}

	if err := s.userRepo.UpdateUserPassword(ctx, pr.UserID, string(hash)); err != nil {
		return fmt.Errorf("update password: %w", domain.ErrInternal)
	}

	if err := s.resetRepo.MarkUsed(ctx, pr.ID); err != nil {
		// Non-fatal: password is already updated; log but don't fail the request.
		_ = err
	}

	return nil
}

// generateResetToken returns (plaintext, sha256-hex-hash) for a new 32-byte random token.
func generateResetToken() (string, string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", "", err
	}
	raw := hex.EncodeToString(b)
	return raw, hashResetToken(raw), nil
}

// hashResetToken returns the hex-encoded SHA-256 digest of a plain reset token.
func hashResetToken(raw string) string {
	sum := sha256.Sum256([]byte(raw))
	return hex.EncodeToString(sum[:])
}

// issueTokens generates an access token + refresh token and persists the refresh token.
func (s *AuthService) issueTokens(ctx context.Context, user *domain.User) (*AuthResult, error) {
	accessToken, err := s.tokenMgr.GenerateAccessToken(user.ID, string(user.Role))
	if err != nil {
		return nil, fmt.Errorf("generate access token: %w", domain.ErrInternal)
	}

	rawRefresh, hashRefresh, expiresAt, err := s.tokenMgr.GenerateRefreshToken()
	if err != nil {
		return nil, fmt.Errorf("generate refresh token: %w", domain.ErrInternal)
	}

	rt := &domain.RefreshToken{
		UserID:    user.ID,
		TokenHash: hashRefresh,
		ExpiresAt: expiresAt,
	}
	if err := s.tokenRepo.CreateRefreshToken(ctx, rt); err != nil {
		return nil, fmt.Errorf("store refresh token: %w", domain.ErrInternal)
	}

	return &AuthResult{
		AccessToken:  accessToken,
		RefreshToken: rawRefresh,
		ExpiresIn:    900, // 15 minutes in seconds
		User:         user,
	}, nil
}
