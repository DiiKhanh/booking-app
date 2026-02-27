package jwt_test

import (
	"booking-app/internal/domain"
	tokenpkg "booking-app/internal/infrastructure/jwt"
	"testing"
	"time"
)

func newTestManager() *tokenpkg.TokenManager {
	return tokenpkg.NewTokenManager("test-secret-key-32-bytes-minimum!", 15*time.Minute, 7*24*time.Hour)
}

// ---- GenerateAccessToken ----

func TestTokenManager_GenerateAccessToken_ReturnsToken(t *testing.T) {
	mgr := newTestManager()
	token, err := mgr.GenerateAccessToken("user-123", string(domain.RoleGuest))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if token == "" {
		t.Error("expected non-empty access token")
	}
}

func TestTokenManager_GenerateAccessToken_EmptyUserID_Error(t *testing.T) {
	mgr := newTestManager()
	_, err := mgr.GenerateAccessToken("", string(domain.RoleGuest))
	if err == nil {
		t.Error("expected error for empty userID")
	}
}

func TestTokenManager_GenerateAccessToken_EmptyRole_Error(t *testing.T) {
	mgr := newTestManager()
	_, err := mgr.GenerateAccessToken("user-123", "")
	if err == nil {
		t.Error("expected error for empty role")
	}
}

// ---- ValidateAccessToken ----

func TestTokenManager_ValidateAccessToken_ValidToken(t *testing.T) {
	mgr := newTestManager()
	token, err := mgr.GenerateAccessToken("user-abc", string(domain.RoleOwner))
	if err != nil {
		t.Fatalf("generate error: %v", err)
	}

	claims, err := mgr.ValidateAccessToken(token)
	if err != nil {
		t.Fatalf("unexpected validation error: %v", err)
	}
	if claims.UserID != "user-abc" {
		t.Errorf("expected userID 'user-abc', got %q", claims.UserID)
	}
	if claims.Role != string(domain.RoleOwner) {
		t.Errorf("expected role 'owner', got %q", claims.Role)
	}
}

func TestTokenManager_ValidateAccessToken_InvalidSignature(t *testing.T) {
	mgr := newTestManager()
	otherMgr := tokenpkg.NewTokenManager("different-secret-key-32-bytes!!", 15*time.Minute, 7*24*time.Hour)
	token, _ := otherMgr.GenerateAccessToken("user-abc", string(domain.RoleGuest))

	_, err := mgr.ValidateAccessToken(token)
	if err == nil {
		t.Error("expected error for token signed with different secret")
	}
}

func TestTokenManager_ValidateAccessToken_Malformed(t *testing.T) {
	mgr := newTestManager()
	_, err := mgr.ValidateAccessToken("not.a.valid.jwt.token")
	if err == nil {
		t.Error("expected error for malformed token")
	}
}

func TestTokenManager_ValidateAccessToken_Empty(t *testing.T) {
	mgr := newTestManager()
	_, err := mgr.ValidateAccessToken("")
	if err == nil {
		t.Error("expected error for empty token")
	}
}

func TestTokenManager_ValidateAccessToken_Expired(t *testing.T) {
	// Create manager with -1 second TTL to produce already-expired tokens
	mgr := tokenpkg.NewTokenManager("test-secret-key-32-bytes-minimum!", -1*time.Second, 7*24*time.Hour)
	token, err := mgr.GenerateAccessToken("user-abc", string(domain.RoleGuest))
	if err != nil {
		t.Fatalf("generate error: %v", err)
	}
	_, err = mgr.ValidateAccessToken(token)
	if err == nil {
		t.Error("expected error for expired token")
	}
}

// ---- GenerateRefreshToken ----

func TestTokenManager_GenerateRefreshToken_ReturnsTokenAndHash(t *testing.T) {
	mgr := newTestManager()
	raw, hash, expiresAt, err := mgr.GenerateRefreshToken()
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if raw == "" {
		t.Error("expected non-empty raw token")
	}
	if hash == "" {
		t.Error("expected non-empty hash")
	}
	if raw == hash {
		t.Error("raw token and hash must differ")
	}
	if expiresAt.Before(time.Now()) {
		t.Error("expiresAt should be in the future")
	}
}

func TestTokenManager_GenerateRefreshToken_UniqueOnEachCall(t *testing.T) {
	mgr := newTestManager()
	raw1, hash1, _, _ := mgr.GenerateRefreshToken()
	raw2, hash2, _, _ := mgr.GenerateRefreshToken()
	if raw1 == raw2 {
		t.Error("expected unique raw tokens")
	}
	if hash1 == hash2 {
		t.Error("expected unique hashes")
	}
}

// ---- HashRefreshToken / VerifyRefreshToken ----

func TestTokenManager_HashRefreshToken_Deterministic(t *testing.T) {
	mgr := newTestManager()
	h1 := mgr.HashRefreshToken("some-raw-token")
	h2 := mgr.HashRefreshToken("some-raw-token")
	if h1 != h2 {
		t.Error("expected same hash for same input")
	}
}

func TestTokenManager_HashRefreshToken_DifferentInputs(t *testing.T) {
	mgr := newTestManager()
	h1 := mgr.HashRefreshToken("token-a")
	h2 := mgr.HashRefreshToken("token-b")
	if h1 == h2 {
		t.Error("expected different hashes for different inputs")
	}
}
