package request

// RegisterRequest contains the fields required to create a new user account.
type RegisterRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=8"`
	FullName string `json:"full_name" binding:"required,min=2"`
	Phone    string `json:"phone"`
}

// LoginRequest contains the fields required to authenticate a user.
type LoginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

// RefreshRequest contains the refresh token needed to obtain new tokens.
type RefreshRequest struct {
	RefreshToken string `json:"refresh_token" binding:"required"`
}

// UpdateProfileRequest contains optional fields to update on the current user's profile.
// At least one field must be non-empty.
type UpdateProfileRequest struct {
	FullName  *string `json:"full_name"`
	Phone     *string `json:"phone"`
	AvatarURL *string `json:"avatar_url"`
}

// ForgotPasswordRequest contains the email address to send a password reset link to.
type ForgotPasswordRequest struct {
	Email string `json:"email" binding:"required,email"`
}

// ResetPasswordRequest contains the one-time reset token and the desired new password.
type ResetPasswordRequest struct {
	Token       string `json:"token"        binding:"required"`
	NewPassword string `json:"new_password" binding:"required,min=8"`
}
