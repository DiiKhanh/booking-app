package repository

import (
	"booking-app/internal/domain"
	redisinfra "booking-app/internal/infrastructure/redis"
	"context"
	"database/sql"
	"errors"
	"fmt"
	"log"
	"time"
)

// BookingRepo handles all database operations for bookings.
// It delegates distributed locking to a Locker implementation.
type BookingRepo struct {
	DB     *sql.DB
	Locker redisinfra.Locker
}

// NewBookingRepo creates a new repository with a DB connection and a Locker.
func NewBookingRepo(db *sql.DB, locker redisinfra.Locker) *BookingRepo {
	return &BookingRepo{
		DB:     db,
		Locker: locker,
	}
}

// CreateBooking implements the full booking flow with distributed locking:
//  1. Acquire lock for the room+date combination
//  2. Begin database transaction
//  3. Check inventory availability
//  4. Update inventory (increment booked_count)
//  5. Insert booking record
//  6. Commit transaction
//  7. Release lock (via defer)
func (r *BookingRepo) CreateBooking(ctx context.Context, booking *domain.Booking) error {
	dateStr := booking.StartDate.Format("2006-01-02")

	lockValue, err := r.Locker.AcquireLock(ctx, booking.RoomID, dateStr)
	if err != nil {
		return domain.ErrLockFailed
	}

	defer func() {
		if releaseErr := r.Locker.ReleaseLock(ctx, booking.RoomID, dateStr, lockValue); releaseErr != nil {
			log.Printf("ERROR releasing lock: %v", releaseErr)
		}
	}()

	tx, err := r.DB.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback()

	var fullDays int
	err = tx.QueryRowContext(ctx, `
		SELECT count(*)
		FROM inventory
		WHERE room_id = $1
		  AND date >= $2 AND date < $3
		  AND booked_count >= total_inventory
	`, booking.RoomID, booking.StartDate, booking.EndDate).Scan(&fullDays)
	if err != nil {
		return fmt.Errorf("availability check failed: %w", err)
	}

	if fullDays > 0 {
		return domain.ErrNotAvailable
	}

	_, err = tx.ExecContext(ctx, `
		UPDATE inventory
		SET booked_count = booked_count + 1
		WHERE room_id = $1 AND date >= $2 AND date < $3
	`, booking.RoomID, booking.StartDate, booking.EndDate)
	if err != nil {
		return fmt.Errorf("inventory update failed: %w", err)
	}

	err = tx.QueryRowContext(ctx, `
		INSERT INTO bookings (user_id, room_id, start_date, end_date, total_price, status)
		VALUES ($1, $2, $3, $4, $5, 'pending')
		RETURNING id, created_at
	`, booking.UserID, booking.RoomID, booking.StartDate, booking.EndDate, booking.TotalPrice).
		Scan(&booking.ID, &booking.CreatedAt)
	if err != nil {
		return fmt.Errorf("booking insert failed: %w", err)
	}

	if err = tx.Commit(); err != nil {
		return fmt.Errorf("transaction commit failed: %w", err)
	}

	log.Printf("✅ Booking created: id=%d, user=%s, room=%d, date=%s",
		booking.ID, booking.UserID, booking.RoomID, dateStr)

	return nil
}

// FindBookingByID retrieves a single booking by ID.
func (r *BookingRepo) FindBookingByID(ctx context.Context, id int) (*domain.Booking, error) {
	booking := &domain.Booking{}
	err := r.DB.QueryRowContext(ctx, `
		SELECT id, user_id, room_id, start_date, end_date, total_price, status, created_at
		FROM bookings WHERE id = $1
	`, id).Scan(
		&booking.ID,
		&booking.UserID,
		&booking.RoomID,
		&booking.StartDate,
		&booking.EndDate,
		&booking.TotalPrice,
		&booking.Status,
		&booking.CreatedAt,
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, fmt.Errorf("booking not found: %w", domain.ErrNotFound)
		}
		return nil, fmt.Errorf("find booking by id: %w", err)
	}
	return booking, nil
}

// ListBookingsByUser returns paginated bookings for a given user.
func (r *BookingRepo) ListBookingsByUser(ctx context.Context, userID string, page, limit int) ([]*domain.Booking, int, error) {
	offset := (page - 1) * limit

	var total int
	if err := r.DB.QueryRowContext(ctx,
		`SELECT COUNT(*) FROM bookings WHERE user_id = $1`, userID,
	).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("count bookings by user: %w", err)
	}

	rows, err := r.DB.QueryContext(ctx, `
		SELECT id, user_id, room_id, start_date, end_date, total_price, status, created_at
		FROM bookings WHERE user_id = $1
		ORDER BY created_at DESC
		LIMIT $2 OFFSET $3
	`, userID, limit, offset)
	if err != nil {
		return nil, 0, fmt.Errorf("list bookings by user: %w", err)
	}
	defer rows.Close()

	bookings, err := scanBookingRows(rows)
	if err != nil {
		return nil, 0, err
	}
	return bookings, total, nil
}

// UpdateBookingStatus updates the status of a booking.
func (r *BookingRepo) UpdateBookingStatus(ctx context.Context, id int, status string) error {
	res, err := r.DB.ExecContext(ctx, `
		UPDATE bookings SET status = $1 WHERE id = $2
	`, status, id)
	if err != nil {
		return fmt.Errorf("update booking status: %w", err)
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return fmt.Errorf("booking not found: %w", domain.ErrNotFound)
	}
	return nil
}

// CancelBooking cancels a booking and restores inventory in a transaction.
// It verifies the booking belongs to the given userID before cancelling.
func (r *BookingRepo) CancelBooking(ctx context.Context, id int, userID string) error {
	tx, err := r.DB.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("begin transaction for cancel: %w", err)
	}
	defer tx.Rollback()

	var booking domain.Booking
	err = tx.QueryRowContext(ctx, `
		SELECT id, user_id, room_id, start_date, end_date, status
		FROM bookings WHERE id = $1
	`, id).Scan(
		&booking.ID,
		&booking.UserID,
		&booking.RoomID,
		&booking.StartDate,
		&booking.EndDate,
		&booking.Status,
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return fmt.Errorf("booking not found: %w", domain.ErrNotFound)
		}
		return fmt.Errorf("find booking for cancel: %w", err)
	}

	if booking.UserID != userID {
		return fmt.Errorf("booking does not belong to user: %w", domain.ErrUnauthorized)
	}

	if booking.Status == "cancelled" {
		return fmt.Errorf("booking already cancelled: %w", domain.ErrConflict)
	}

	_, err = tx.ExecContext(ctx, `
		UPDATE bookings SET status = 'cancelled' WHERE id = $1
	`, id)
	if err != nil {
		return fmt.Errorf("cancel booking update: %w", err)
	}

	_, err = tx.ExecContext(ctx, `
		UPDATE inventory
		SET booked_count = booked_count - 1
		WHERE room_id = $1 AND date >= $2 AND date < $3
	`, booking.RoomID, booking.StartDate, booking.EndDate)
	if err != nil {
		return fmt.Errorf("restore inventory after cancel: %w", err)
	}

	if err = tx.Commit(); err != nil {
		return fmt.Errorf("commit cancel transaction: %w", err)
	}

	log.Printf("Booking cancelled: id=%d, user=%s, room=%d", id, userID, booking.RoomID)
	return nil
}

// ListAllBookings returns all bookings across all users, paginated by created_at DESC.
func (r *BookingRepo) ListAllBookings(ctx context.Context, page, limit int) ([]*domain.Booking, int, error) {
	offset := (page - 1) * limit

	var total int
	if err := r.DB.QueryRowContext(ctx, `SELECT COUNT(*) FROM bookings`).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("count all bookings: %w", err)
	}

	rows, err := r.DB.QueryContext(ctx, `
		SELECT id, user_id, room_id, start_date, end_date, total_price, status, created_at
		FROM bookings
		ORDER BY created_at DESC
		LIMIT $1 OFFSET $2
	`, limit, offset)
	if err != nil {
		return nil, 0, fmt.Errorf("list all bookings: %w", err)
	}
	defer rows.Close()

	bookings, err := scanBookingRows(rows)
	if err != nil {
		return nil, 0, err
	}
	return bookings, total, nil
}

// scanBookingRows scans multiple booking rows into a slice.
func scanBookingRows(rows *sql.Rows) ([]*domain.Booking, error) {
	var bookings []*domain.Booking
	for rows.Next() {
		b := &domain.Booking{}
		if err := rows.Scan(
			&b.ID,
			&b.UserID,
			&b.RoomID,
			&b.StartDate,
			&b.EndDate,
			&b.TotalPrice,
			&b.Status,
			&b.CreatedAt,
		); err != nil {
			return nil, fmt.Errorf("scan booking row: %w", err)
		}
		bookings = append(bookings, b)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate booking rows: %w", err)
	}
	if bookings == nil {
		bookings = []*domain.Booking{}
	}
	return bookings, nil
}

// InitializeInventory creates inventory records for a room (helper for testing).
func (r *BookingRepo) InitializeInventory(ctx context.Context, roomID int, startDate time.Time, days int, total int) error {
	tx, err := r.DB.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	for i := 0; i < days; i++ {
		date := startDate.AddDate(0, 0, i)
		_, err := tx.ExecContext(ctx, `
			INSERT INTO inventory (room_id, date, total_inventory, booked_count)
			VALUES ($1, $2, $3, 0)
			ON CONFLICT (room_id, date) DO NOTHING
		`, roomID, date, total)
		if err != nil {
			return err
		}
	}
	return tx.Commit()
}
