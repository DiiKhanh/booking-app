package repository

import (
	"booking-app/internal/domain"
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"

	"github.com/lib/pq"
)

// pgUserRepo implements UserRepository using PostgreSQL.
type pgUserRepo struct {
	db *sql.DB
}

// NewUserRepo creates a new PostgreSQL-backed UserRepository.
func NewUserRepo(db *sql.DB) UserRepository {
	return &pgUserRepo{db: db}
}

// CreateUser inserts a new user row. Returns ErrConflict if email is taken.
func (r *pgUserRepo) CreateUser(ctx context.Context, user *domain.User) error {
	const q = `
		INSERT INTO users (email, password_hash, full_name, phone, avatar_url, role, is_active)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id, created_at, updated_at`

	row := r.db.QueryRowContext(ctx, q,
		user.Email,
		user.PasswordHash,
		user.FullName,
		user.Phone,
		user.AvatarURL,
		string(user.Role),
		user.IsActive,
	)

	if err := row.Scan(&user.ID, &user.CreatedAt, &user.UpdatedAt); err != nil {
		var pqErr *pq.Error
		if errors.As(err, &pqErr) && pqErr.Code == "23505" {
			return fmt.Errorf("email already registered: %w", domain.ErrConflict)
		}
		return fmt.Errorf("insert user: %w", err)
	}
	return nil
}

// FindUserByEmail looks up a user by their email address.
func (r *pgUserRepo) FindUserByEmail(ctx context.Context, email string) (*domain.User, error) {
	const q = `
		SELECT id, email, password_hash, full_name, phone, avatar_url, role, is_active, created_at, updated_at
		FROM users WHERE email = $1`

	user := &domain.User{}
	err := r.db.QueryRowContext(ctx, q, email).Scan(
		&user.ID,
		&user.Email,
		&user.PasswordHash,
		&user.FullName,
		&user.Phone,
		&user.AvatarURL,
		&user.Role,
		&user.IsActive,
		&user.CreatedAt,
		&user.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, fmt.Errorf("user not found: %w", domain.ErrNotFound)
		}
		return nil, fmt.Errorf("query user by email: %w", err)
	}
	return user, nil
}

// FindUserByID looks up a user by their UUID.
func (r *pgUserRepo) FindUserByID(ctx context.Context, id string) (*domain.User, error) {
	const q = `
		SELECT id, email, password_hash, full_name, phone, avatar_url, role, is_active, created_at, updated_at
		FROM users WHERE id = $1`

	user := &domain.User{}
	err := r.db.QueryRowContext(ctx, q, id).Scan(
		&user.ID,
		&user.Email,
		&user.PasswordHash,
		&user.FullName,
		&user.Phone,
		&user.AvatarURL,
		&user.Role,
		&user.IsActive,
		&user.CreatedAt,
		&user.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, fmt.Errorf("user not found: %w", domain.ErrNotFound)
		}
		return nil, fmt.Errorf("query user by id: %w", err)
	}
	return user, nil
}

// ListUsers returns paginated users ordered by created_at DESC.
func (r *pgUserRepo) ListUsers(ctx context.Context, page, limit int) ([]*domain.User, int, error) {
	offset := (page - 1) * limit

	var total int
	if err := r.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM users`).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("count users: %w", err)
	}

	rows, err := r.db.QueryContext(ctx, `
		SELECT id, email, password_hash, full_name, phone, avatar_url, role, is_active, created_at, updated_at
		FROM users
		ORDER BY created_at DESC
		LIMIT $1 OFFSET $2
	`, limit, offset)
	if err != nil {
		return nil, 0, fmt.Errorf("list users: %w", err)
	}
	defer rows.Close()

	var users []*domain.User
	for rows.Next() {
		u := &domain.User{}
		if err := rows.Scan(
			&u.ID, &u.Email, &u.PasswordHash, &u.FullName, &u.Phone,
			&u.AvatarURL, &u.Role, &u.IsActive, &u.CreatedAt, &u.UpdatedAt,
		); err != nil {
			return nil, 0, fmt.Errorf("scan user row: %w", err)
		}
		users = append(users, u)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("iterate user rows: %w", err)
	}
	if users == nil {
		users = []*domain.User{}
	}
	return users, total, nil
}

// UpdateUserRole updates a user's role.
func (r *pgUserRepo) UpdateUserRole(ctx context.Context, id string, role domain.Role) error {
	res, err := r.db.ExecContext(ctx,
		`UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2`,
		string(role), id,
	)
	if err != nil {
		return fmt.Errorf("update user role: %w", err)
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return fmt.Errorf("user not found: %w", domain.ErrNotFound)
	}
	return nil
}

// DeactivateUser sets is_active=false for the given user.
func (r *pgUserRepo) DeactivateUser(ctx context.Context, id string) error {
	res, err := r.db.ExecContext(ctx,
		`UPDATE users SET is_active = false, updated_at = NOW() WHERE id = $1`,
		id,
	)
	if err != nil {
		return fmt.Errorf("deactivate user: %w", err)
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return fmt.Errorf("user not found: %w", domain.ErrNotFound)
	}
	return nil
}

// pgTokenRepo implements TokenRepository using PostgreSQL.
type pgTokenRepo struct {
	db *sql.DB
}

// NewTokenRepo creates a new PostgreSQL-backed TokenRepository.
func NewTokenRepo(db *sql.DB) TokenRepository {
	return &pgTokenRepo{db: db}
}

// CreateRefreshToken inserts a new refresh token row.
func (r *pgTokenRepo) CreateRefreshToken(ctx context.Context, token *domain.RefreshToken) error {
	const q = `
		INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
		VALUES ($1, $2, $3)
		RETURNING id`

	if err := r.db.QueryRowContext(ctx, q,
		token.UserID,
		token.TokenHash,
		token.ExpiresAt,
	).Scan(&token.ID); err != nil {
		return fmt.Errorf("insert refresh token: %w", err)
	}
	return nil
}

// FindRefreshTokenByHash finds a refresh token by its SHA-256 hash.
func (r *pgTokenRepo) FindRefreshTokenByHash(ctx context.Context, tokenHash string) (*domain.RefreshToken, error) {
	const q = `
		SELECT id, user_id, token_hash, expires_at, revoked_at
		FROM refresh_tokens WHERE token_hash = $1`

	rt := &domain.RefreshToken{}
	err := r.db.QueryRowContext(ctx, q, tokenHash).Scan(
		&rt.ID,
		&rt.UserID,
		&rt.TokenHash,
		&rt.ExpiresAt,
		&rt.RevokedAt,
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, fmt.Errorf("token not found: %w", domain.ErrNotFound)
		}
		return nil, fmt.Errorf("query refresh token: %w", err)
	}
	return rt, nil
}

// RevokeRefreshToken marks a single token as revoked.
func (r *pgTokenRepo) RevokeRefreshToken(ctx context.Context, tokenID string, revokedAt time.Time) error {
	const q = `UPDATE refresh_tokens SET revoked_at = $1 WHERE id = $2`

	if _, err := r.db.ExecContext(ctx, q, revokedAt, tokenID); err != nil {
		return fmt.Errorf("revoke refresh token: %w", err)
	}
	return nil
}

// RevokeAllUserTokens revokes every active token for a user (used on logout).
func (r *pgTokenRepo) RevokeAllUserTokens(ctx context.Context, userID string, revokedAt time.Time) error {
	const q = `UPDATE refresh_tokens SET revoked_at = $1 WHERE user_id = $2 AND revoked_at IS NULL`

	if _, err := r.db.ExecContext(ctx, q, revokedAt, userID); err != nil {
		return fmt.Errorf("revoke all user tokens: %w", err)
	}
	return nil
}
