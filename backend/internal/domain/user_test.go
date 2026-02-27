package domain_test

import (
	"booking-app/internal/domain"
	"testing"
	"time"
)

func TestRefreshToken_IsRevoked_False(t *testing.T) {
	rt := &domain.RefreshToken{
		ID:        "rt-1",
		UserID:    "user-1",
		TokenHash: "hash",
		ExpiresAt: time.Now().Add(1 * time.Hour),
		RevokedAt: nil,
	}
	if rt.IsRevoked() {
		t.Error("expected IsRevoked() = false when RevokedAt is nil")
	}
}

func TestRefreshToken_IsRevoked_True(t *testing.T) {
	now := time.Now()
	rt := &domain.RefreshToken{
		ID:        "rt-1",
		UserID:    "user-1",
		TokenHash: "hash",
		ExpiresAt: time.Now().Add(1 * time.Hour),
		RevokedAt: &now,
	}
	if !rt.IsRevoked() {
		t.Error("expected IsRevoked() = true when RevokedAt is set")
	}
}

func TestRefreshToken_IsExpired_False(t *testing.T) {
	rt := &domain.RefreshToken{
		ExpiresAt: time.Now().Add(1 * time.Hour),
	}
	if rt.IsExpired() {
		t.Error("expected IsExpired() = false for future expiry")
	}
}

func TestRefreshToken_IsExpired_True(t *testing.T) {
	rt := &domain.RefreshToken{
		ExpiresAt: time.Now().Add(-1 * time.Hour),
	}
	if !rt.IsExpired() {
		t.Error("expected IsExpired() = true for past expiry")
	}
}

func TestRole_Constants(t *testing.T) {
	if domain.RoleGuest != "guest" {
		t.Errorf("expected RoleGuest = 'guest', got %q", domain.RoleGuest)
	}
	if domain.RoleOwner != "owner" {
		t.Errorf("expected RoleOwner = 'owner', got %q", domain.RoleOwner)
	}
	if domain.RoleAdmin != "admin" {
		t.Errorf("expected RoleAdmin = 'admin', got %q", domain.RoleAdmin)
	}
}
