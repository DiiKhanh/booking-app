package domain

import "time"

// PasswordReset represents a one-time token used to reset a user's password.
type PasswordReset struct {
	ID        int64
	UserID    string
	TokenHash string
	ExpiresAt time.Time
	UsedAt    *time.Time
}

// IsUsed returns true if the token has already been consumed.
func (pr *PasswordReset) IsUsed() bool {
	return pr.UsedAt != nil
}

// IsExpired returns true if the token is past its expiration time.
func (pr *PasswordReset) IsExpired() bool {
	return time.Now().After(pr.ExpiresAt)
}

// UserUpdates holds the optional fields that can be updated on a user profile.
// A nil pointer means the field should not be changed.
type UserUpdates struct {
	FullName  *string
	Phone     *string
	AvatarURL *string
}
