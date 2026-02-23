package repository

import (
	"booking-app/internal/domain"
	redisinfra "booking-app/internal/infrastructure/redis"
	"context"
	"database/sql"
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
		VALUES ($1, $2, $3, $4, $5, 'confirmed')
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
