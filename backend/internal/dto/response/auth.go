package response

import "booking-app/internal/domain"

// AuthTokensResponse holds both access and refresh tokens returned after auth.
type AuthTokensResponse struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	TokenType    string `json:"token_type"`
	ExpiresIn    int64  `json:"expires_in"`
}

// UserProfileResponse is the public view of a user returned by /auth/me.
type UserProfileResponse struct {
	ID        string      `json:"id"`
	Email     string      `json:"email"`
	FullName  string      `json:"full_name"`
	Phone     string      `json:"phone,omitempty"`
	AvatarURL string      `json:"avatar_url,omitempty"`
	Role      domain.Role `json:"role"`
	IsActive  bool        `json:"is_active"`
}

// NewUserProfileResponse converts a domain User to a UserProfileResponse.
func NewUserProfileResponse(u *domain.User) UserProfileResponse {
	return UserProfileResponse{
		ID:        u.ID,
		Email:     u.Email,
		FullName:  u.FullName,
		Phone:     u.Phone,
		AvatarURL: u.AvatarURL,
		Role:      u.Role,
		IsActive:  u.IsActive,
	}
}
