package jwt

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// Claims holds the data embedded in a JWT access token.
type Claims struct {
	UserID string `json:"user_id"`
	Role   string `json:"role"`
	jwt.RegisteredClaims
}

// TokenManager handles generation and validation of JWT tokens.
type TokenManager struct {
	secret        []byte
	accessTTL     time.Duration
	refreshTTL    time.Duration
}

// NewTokenManager creates a new TokenManager with the given secret and TTLs.
func NewTokenManager(secret string, accessTTL, refreshTTL time.Duration) *TokenManager {
	return &TokenManager{
		secret:     []byte(secret),
		accessTTL:  accessTTL,
		refreshTTL: refreshTTL,
	}
}

// GenerateAccessToken creates a signed JWT access token for the given user.
func (m *TokenManager) GenerateAccessToken(userID, role string) (string, error) {
	if userID == "" {
		return "", fmt.Errorf("userID must not be empty")
	}
	if role == "" {
		return "", fmt.Errorf("role must not be empty")
	}

	now := time.Now()
	claims := Claims{
		UserID: userID,
		Role:   role,
		RegisteredClaims: jwt.RegisteredClaims{
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(m.accessTTL)),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signed, err := token.SignedString(m.secret)
	if err != nil {
		return "", fmt.Errorf("sign access token: %w", err)
	}
	return signed, nil
}

// ValidateAccessToken parses and validates a JWT access token.
// Returns the embedded claims if the token is valid.
func (m *TokenManager) ValidateAccessToken(tokenStr string) (*Claims, error) {
	if tokenStr == "" {
		return nil, fmt.Errorf("token must not be empty")
	}

	parsed, err := jwt.ParseWithClaims(tokenStr, &Claims{}, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", t.Header["alg"])
		}
		return m.secret, nil
	})
	if err != nil {
		return nil, fmt.Errorf("parse access token: %w", err)
	}

	claims, ok := parsed.Claims.(*Claims)
	if !ok || !parsed.Valid {
		return nil, fmt.Errorf("invalid token claims")
	}
	return claims, nil
}

// GenerateRefreshToken creates a cryptographically-random refresh token.
// Returns: raw token (to send to client), SHA-256 hash (to store), expiry time.
func (m *TokenManager) GenerateRefreshToken() (raw, hash string, expiresAt time.Time, err error) {
	b := make([]byte, 32)
	if _, err = rand.Read(b); err != nil {
		return "", "", time.Time{}, fmt.Errorf("generate random bytes: %w", err)
	}
	raw = base64.URLEncoding.EncodeToString(b)
	hash = m.HashRefreshToken(raw)
	expiresAt = time.Now().Add(m.refreshTTL)
	return raw, hash, expiresAt, nil
}

// HashRefreshToken returns the SHA-256 hex hash of the raw token.
func (m *TokenManager) HashRefreshToken(raw string) string {
	sum := sha256.Sum256([]byte(raw))
	return hex.EncodeToString(sum[:])
}
