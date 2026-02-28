package repository

import (
	"booking-app/internal/domain"
	"context"
	"database/sql"
	"errors"
	"fmt"
)

// ReviewRepo handles all database operations for reviews.
type ReviewRepo struct {
	DB *sql.DB
}

// NewReviewRepo creates a new ReviewRepo.
func NewReviewRepo(db *sql.DB) *ReviewRepo {
	return &ReviewRepo{DB: db}
}

// CreateReview inserts a review and updates the hotel's avg_rating and review_count atomically.
func (r *ReviewRepo) CreateReview(ctx context.Context, review *domain.Review) (*domain.Review, error) {
	tx, err := r.DB.BeginTx(ctx, nil)
	if err != nil {
		return nil, fmt.Errorf("begin create review transaction: %w", err)
	}
	defer tx.Rollback()

	err = tx.QueryRowContext(ctx, `
		INSERT INTO reviews (user_id, hotel_id, booking_id, rating, title, comment)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id, created_at, updated_at
	`, review.UserID, review.HotelID, review.BookingID, review.Rating, review.Title, review.Comment).
		Scan(&review.ID, &review.CreatedAt, &review.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("insert review: %w", err)
	}

	if err := updateHotelRatingStats(ctx, tx, review.HotelID); err != nil {
		return nil, err
	}

	if err := tx.Commit(); err != nil {
		return nil, fmt.Errorf("commit create review transaction: %w", err)
	}

	return review, nil
}

// GetReviewByID fetches a single review by primary key.
func (r *ReviewRepo) GetReviewByID(ctx context.Context, id int) (*domain.Review, error) {
	review := &domain.Review{}
	err := r.DB.QueryRowContext(ctx, `
		SELECT id, user_id, hotel_id, booking_id, rating, title, comment, created_at, updated_at
		FROM reviews WHERE id = $1
	`, id).Scan(
		&review.ID, &review.UserID, &review.HotelID, &review.BookingID,
		&review.Rating, &review.Title, &review.Comment,
		&review.CreatedAt, &review.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, fmt.Errorf("review not found: %w", domain.ErrNotFound)
		}
		return nil, fmt.Errorf("get review by id: %w", err)
	}
	return review, nil
}

// GetReviewByBookingID returns the review tied to a booking (or ErrNotFound).
func (r *ReviewRepo) GetReviewByBookingID(ctx context.Context, bookingID int) (*domain.Review, error) {
	review := &domain.Review{}
	err := r.DB.QueryRowContext(ctx, `
		SELECT id, user_id, hotel_id, booking_id, rating, title, comment, created_at, updated_at
		FROM reviews WHERE booking_id = $1
	`, bookingID).Scan(
		&review.ID, &review.UserID, &review.HotelID, &review.BookingID,
		&review.Rating, &review.Title, &review.Comment,
		&review.CreatedAt, &review.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, fmt.Errorf("review not found for booking: %w", domain.ErrNotFound)
		}
		return nil, fmt.Errorf("get review by booking id: %w", err)
	}
	return review, nil
}

// ListReviewsByHotel returns paginated reviews for a hotel, newest first.
func (r *ReviewRepo) ListReviewsByHotel(ctx context.Context, hotelID, page, limit int) ([]*domain.Review, int, error) {
	offset := (page - 1) * limit

	var total int
	if err := r.DB.QueryRowContext(ctx,
		`SELECT COUNT(*) FROM reviews WHERE hotel_id = $1`, hotelID,
	).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("count reviews by hotel: %w", err)
	}

	rows, err := r.DB.QueryContext(ctx, `
		SELECT id, user_id, hotel_id, booking_id, rating, title, comment, created_at, updated_at
		FROM reviews
		WHERE hotel_id = $1
		ORDER BY created_at DESC
		LIMIT $2 OFFSET $3
	`, hotelID, limit, offset)
	if err != nil {
		return nil, 0, fmt.Errorf("list reviews by hotel: %w", err)
	}
	defer rows.Close()

	reviews, err := scanReviewRows(rows)
	if err != nil {
		return nil, 0, err
	}
	return reviews, total, nil
}

// UpdateReview replaces editable fields and recalculates hotel rating stats atomically.
func (r *ReviewRepo) UpdateReview(ctx context.Context, review *domain.Review) (*domain.Review, error) {
	tx, err := r.DB.BeginTx(ctx, nil)
	if err != nil {
		return nil, fmt.Errorf("begin update review transaction: %w", err)
	}
	defer tx.Rollback()

	err = tx.QueryRowContext(ctx, `
		UPDATE reviews
		SET rating = $1, title = $2, comment = $3, updated_at = NOW()
		WHERE id = $4
		RETURNING updated_at
	`, review.Rating, review.Title, review.Comment, review.ID).Scan(&review.UpdatedAt)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, fmt.Errorf("review not found: %w", domain.ErrNotFound)
		}
		return nil, fmt.Errorf("update review: %w", err)
	}

	if err := updateHotelRatingStats(ctx, tx, review.HotelID); err != nil {
		return nil, err
	}

	if err := tx.Commit(); err != nil {
		return nil, fmt.Errorf("commit update review transaction: %w", err)
	}

	return review, nil
}

// DeleteReview removes a review and recalculates hotel rating stats atomically.
func (r *ReviewRepo) DeleteReview(ctx context.Context, id int) error {
	tx, err := r.DB.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("begin delete review transaction: %w", err)
	}
	defer tx.Rollback()

	// Fetch hotel_id before deleting so we can update stats.
	var hotelID int
	if err := tx.QueryRowContext(ctx,
		`SELECT hotel_id FROM reviews WHERE id = $1`, id,
	).Scan(&hotelID); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return fmt.Errorf("review not found: %w", domain.ErrNotFound)
		}
		return fmt.Errorf("find review for delete: %w", err)
	}

	if _, err := tx.ExecContext(ctx, `DELETE FROM reviews WHERE id = $1`, id); err != nil {
		return fmt.Errorf("delete review: %w", err)
	}

	if err := updateHotelRatingStats(ctx, tx, hotelID); err != nil {
		return err
	}

	return tx.Commit()
}

// HasConfirmedBookingAtHotel returns true when the user has at least one
// confirmed booking for any room that belongs to the given hotel.
func (r *ReviewRepo) HasConfirmedBookingAtHotel(ctx context.Context, userID string, hotelID int) (bool, error) {
	var exists bool
	err := r.DB.QueryRowContext(ctx, `
		SELECT EXISTS (
			SELECT 1
			FROM bookings b
			JOIN rooms rm ON b.room_id = rm.id
			WHERE b.user_id = $1
			  AND rm.hotel_id = $2
			  AND b.status = 'confirmed'
		)
	`, userID, hotelID).Scan(&exists)
	if err != nil {
		return false, fmt.Errorf("check confirmed booking at hotel: %w", err)
	}
	return exists, nil
}

// updateHotelRatingStats recalculates avg_rating and review_count for a hotel
// within an open transaction.
func updateHotelRatingStats(ctx context.Context, tx *sql.Tx, hotelID int) error {
	_, err := tx.ExecContext(ctx, `
		UPDATE hotels
		SET avg_rating   = COALESCE((SELECT AVG(rating)::DECIMAL(3,2) FROM reviews WHERE hotel_id = $1), 0),
		    review_count = (SELECT COUNT(*) FROM reviews WHERE hotel_id = $1)
		WHERE id = $1
	`, hotelID)
	if err != nil {
		return fmt.Errorf("update hotel rating stats: %w", err)
	}
	return nil
}

// scanReviewRows scans multiple review rows into a slice.
func scanReviewRows(rows *sql.Rows) ([]*domain.Review, error) {
	var reviews []*domain.Review
	for rows.Next() {
		rv := &domain.Review{}
		if err := rows.Scan(
			&rv.ID, &rv.UserID, &rv.HotelID, &rv.BookingID,
			&rv.Rating, &rv.Title, &rv.Comment,
			&rv.CreatedAt, &rv.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("scan review row: %w", err)
		}
		reviews = append(reviews, rv)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate review rows: %w", err)
	}
	if reviews == nil {
		reviews = []*domain.Review{}
	}
	return reviews, nil
}
