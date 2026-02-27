package service

import (
	"booking-app/internal/domain"
	tokenpkg "booking-app/internal/infrastructure/jwt"
	"booking-app/internal/repository"
	"context"
	"fmt"
	"time"

	"golang.org/x/crypto/bcrypt"
)

const bcryptCost = 12

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

// AuthService handles user authentication business logic.
type AuthService struct {
	userRepo  repository.UserRepository
	tokenRepo repository.TokenRepository
	tokenMgr  *tokenpkg.TokenManager
}

// NewAuthService creates a new AuthService.
func NewAuthService(
	userRepo repository.UserRepository,
	tokenRepo repository.TokenRepository,
	tokenMgr *tokenpkg.TokenManager,
) *AuthService {
	return &AuthService{
		userRepo:  userRepo,
		tokenRepo: tokenRepo,
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
