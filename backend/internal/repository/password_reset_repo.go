package repository

import (
	"booking-app/internal/domain"
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"
)

// pgPasswordResetRepo implements PasswordResetRepository using PostgreSQL.
type pgPasswordResetRepo struct {
	db *sql.DB
}

// NewPasswordResetRepo creates a new PostgreSQL-backed PasswordResetRepository.
func NewPasswordResetRepo(db *sql.DB) PasswordResetRepository {
	return &pgPasswordResetRepo{db: db}
}

// Create inserts a new password reset token row.
func (r *pgPasswordResetRepo) Create(ctx context.Context, reset *domain.PasswordReset) error {
	const q = `
		INSERT INTO password_resets (user_id, token_hash, expires_at)
		VALUES ($1, $2, $3)
		RETURNING id`

	if err := r.db.QueryRowContext(ctx, q,
		reset.UserID,
		reset.TokenHash,
		reset.ExpiresAt,
	).Scan(&reset.ID); err != nil {
		return fmt.Errorf("insert password reset: %w", err)
	}
	return nil
}

// FindByTokenHash retrieves a reset token record by its SHA-256 hash.
func (r *pgPasswordResetRepo) FindByTokenHash(ctx context.Context, tokenHash string) (*domain.PasswordReset, error) {
	const q = `
		SELECT id, user_id, token_hash, expires_at, used_at
		FROM password_resets
		WHERE token_hash = $1`

	pr := &domain.PasswordReset{}
	err := r.db.QueryRowContext(ctx, q, tokenHash).Scan(
		&pr.ID,
		&pr.UserID,
		&pr.TokenHash,
		&pr.ExpiresAt,
		&pr.UsedAt,
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, fmt.Errorf("reset token not found: %w", domain.ErrNotFound)
		}
		return nil, fmt.Errorf("query password reset: %w", err)
	}
	return pr, nil
}

// MarkUsed sets used_at to now for the given reset token row.
func (r *pgPasswordResetRepo) MarkUsed(ctx context.Context, id int64) error {
	res, err := r.db.ExecContext(ctx,
		`UPDATE password_resets SET used_at = $1 WHERE id = $2`,
		time.Now(), id,
	)
	if err != nil {
		return fmt.Errorf("mark password reset used: %w", err)
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return fmt.Errorf("reset token not found: %w", domain.ErrNotFound)
	}
	return nil
}
