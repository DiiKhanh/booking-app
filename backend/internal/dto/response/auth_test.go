package response_test

import (
	"booking-app/internal/domain"
	"booking-app/internal/dto/response"
	"testing"
)

func TestNewUserProfileResponse(t *testing.T) {
	user := &domain.User{
		ID:        "user-id-1",
		Email:     "test@example.com",
		FullName:  "John Doe",
		Phone:     "0901234567",
		AvatarURL: "https://example.com/avatar.jpg",
		Role:      domain.RoleOwner,
		IsActive:  true,
	}

	resp := response.NewUserProfileResponse(user)

	if resp.ID != user.ID {
		t.Errorf("expected ID %q, got %q", user.ID, resp.ID)
	}
	if resp.Email != user.Email {
		t.Errorf("expected Email %q, got %q", user.Email, resp.Email)
	}
	if resp.FullName != user.FullName {
		t.Errorf("expected FullName %q, got %q", user.FullName, resp.FullName)
	}
	if resp.Phone != user.Phone {
		t.Errorf("expected Phone %q, got %q", user.Phone, resp.Phone)
	}
	if resp.AvatarURL != user.AvatarURL {
		t.Errorf("expected AvatarURL %q, got %q", user.AvatarURL, resp.AvatarURL)
	}
	if resp.Role != domain.RoleOwner {
		t.Errorf("expected Role 'owner', got %q", resp.Role)
	}
	if !resp.IsActive {
		t.Error("expected IsActive = true")
	}
}

func TestNewUserProfileResponse_EmptyOptionalFields(t *testing.T) {
	user := &domain.User{
		ID:       "user-id-2",
		Email:    "min@example.com",
		FullName: "Min User",
		Role:     domain.RoleGuest,
		IsActive: false,
	}

	resp := response.NewUserProfileResponse(user)

	if resp.Phone != "" {
		t.Errorf("expected empty Phone, got %q", resp.Phone)
	}
	if resp.AvatarURL != "" {
		t.Errorf("expected empty AvatarURL, got %q", resp.AvatarURL)
	}
	if resp.IsActive {
		t.Error("expected IsActive = false")
	}
}
