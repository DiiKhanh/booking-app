package repository

import (
	"booking-app/internal/models"
	"context"
	"database/sql"
	"fmt"
	"log"
	"time"

	"github.com/redis/go-redis/v9"
)

// BookingRepo handles all database operations for bookings.
// It uses a Redis client for distributed locking to prevent race conditions.
type BookingRepo struct {
	DB    *sql.DB
	Redis *redis.Client
}

// NewBookingRepo creates a new repository with both DB and Redis connections.
func NewBookingRepo(db *sql.DB, redisClient *redis.Client) *BookingRepo {
	return &BookingRepo{
		DB:    db,
		Redis: redisClient,
	}
}

// --- Distributed Lock Implementation ---

// lockKeyFormat defines the Redis key pattern for room/date locking.
// Format: lock:room:{roomID}:{date}
// Each room+date combination gets its own lock for maximum concurrency.
const lockKeyFormat = "lock:room:%d:%s"

// lockTTL is how long a lock lives before auto-expiring.
// Acts as a safety net: if the holder crashes, the lock will expire.
const lockTTL = 5 * time.Second

// lockRetryDelay is the wait time between retry attempts when lock is busy.
const lockRetryDelay = 50 * time.Millisecond

// lockMaxRetries is the maximum number of attempts to acquire the lock.
const lockMaxRetries = 10

// AcquireLock attempts to acquire a distributed lock using Redis SETNX.
// It uses a unique lockValue (timestamp-based) to ensure only the owner can release it.
// Retry logic: tries up to lockMaxRetries times with lockRetryDelay between attempts.
func (r *BookingRepo) AcquireLock(ctx context.Context, roomID int, date string) (string, error) {
	lockKey := fmt.Sprintf(lockKeyFormat, roomID, date)

	// Unique value per lock holder — prevents accidental release by another goroutine
	lockValue := fmt.Sprintf("%d", time.Now().UnixNano())

	for i := 0; i < lockMaxRetries; i++ {
		// SETNX: Set if Not Exists — atomic operation, the core of distributed locking
		success, err := r.Redis.SetNX(ctx, lockKey, lockValue, lockTTL).Result()
		if err != nil {
			return "", fmt.Errorf("redis SETNX failed: %w", err)
		}

		if success {
			log.Printf("🔒 Lock acquired: key=%s value=%s", lockKey, lockValue)
			return lockValue, nil
		}

		// Lock is held by someone else — wait and retry
		log.Printf("⏳ Lock busy, retrying (%d/%d): key=%s", i+1, lockMaxRetries, lockKey)
		time.Sleep(lockRetryDelay)
	}

	return "", fmt.Errorf("could not acquire lock after %d retries: key=%s", lockMaxRetries, lockKey)
}

// ReleaseLock releases the distributed lock, but ONLY if we still own it.
// Uses a Lua script for atomicity: check-and-delete in a single Redis command.
// This prevents the dangerous scenario where our lock expired, another process
// acquired it, and we accidentally delete THEIR lock.
func (r *BookingRepo) ReleaseLock(ctx context.Context, roomID int, date string, lockValue string) error {
	lockKey := fmt.Sprintf(lockKeyFormat, roomID, date)

	// Lua script: atomically check ownership and delete
	// This is the industry-standard pattern for safe lock release
	luaScript := `
		if redis.call("GET", KEYS[1]) == ARGV[1] then
			return redis.call("DEL", KEYS[1])
		end
		return 0
	`

	result, err := r.Redis.Eval(ctx, luaScript, []string{lockKey}, lockValue).Result()
	if err != nil {
		return fmt.Errorf("redis lock release failed: %w", err)
	}

	if result.(int64) == 1 {
		log.Printf("🔓 Lock released: key=%s", lockKey)
	} else {
		log.Printf("⚠️  Lock already expired or owned by another process: key=%s", lockKey)
	}

	return nil
}

// --- Booking Operations ---

// CreateBooking implements the full booking flow with distributed locking:
//
//  1. Acquire Redis lock for the room+date combination
//  2. Begin database transaction
//  3. Check inventory availability
//  4. Simulate latency (demonstrates the problem this lock solves)
//  5. Update inventory (increment booked_count)
//  6. Insert booking record
//  7. Commit transaction
//  8. Release Redis lock (via defer)
func (r *BookingRepo) CreateBooking(ctx context.Context, booking *models.Booking) error {
	// Format date for lock key (using start_date as the critical date)
	dateStr := booking.StartDate.Format("2006-01-02")

	// Step 1: Acquire the distributed lock BEFORE touching the database
	lockValue, err := r.AcquireLock(ctx, booking.RoomID, dateStr)
	if err != nil {
		return fmt.Errorf("booking failed — could not acquire lock: %w", err)
	}

	// Ensure lock is released no matter what happens (success or failure)
	defer func() {
		if releaseErr := r.ReleaseLock(ctx, booking.RoomID, dateStr, lockValue); releaseErr != nil {
			log.Printf("ERROR releasing lock: %v", releaseErr)
		}
	}()

	// Step 2: Begin database transaction
	tx, err := r.DB.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback()

	// Step 3: Check availability — now safe because we hold the lock
	queryCheck := `
		SELECT count(*)
		FROM inventory
		WHERE room_id = $1 
		  AND date >= $2 AND date < $3
		  AND booked_count >= total_inventory
	`
	var fullDays int
	err = tx.QueryRowContext(ctx, queryCheck, booking.RoomID, booking.StartDate, booking.EndDate).Scan(&fullDays)
	if err != nil {
		return fmt.Errorf("availability check failed: %w", err)
	}

	if fullDays > 0 {
		return fmt.Errorf("room not available for selected dates")
	}

	// Step 4: SIMULATE LATENCY — Intentional delay to widen the race condition window
	// In real life, this comes from network hops, payment processing, or complex logic.
	// Without the Redis lock, this sleep allows other goroutines to read stale data.
	time.Sleep(200 * time.Millisecond)

	// Step 5: Update inventory (increment booked_count)
	queryUpdate := `
		UPDATE inventory
		SET booked_count = booked_count + 1
		WHERE room_id = $1 AND date >= $2 AND date < $3
	`
	_, err = tx.ExecContext(ctx, queryUpdate, booking.RoomID, booking.StartDate, booking.EndDate)
	if err != nil {
		return fmt.Errorf("inventory update failed: %w", err)
	}

	// Step 6: Create booking record
	queryInsert := `
		INSERT INTO bookings (user_id, room_id, start_date, end_date, total_price, status)
		VALUES ($1, $2, $3, $4, $5, 'confirmed')
		RETURNING id, created_at
	`
	err = tx.QueryRowContext(ctx, queryInsert,
		booking.UserID, booking.RoomID, booking.StartDate, booking.EndDate, booking.TotalPrice).Scan(&booking.ID, &booking.CreatedAt)
	if err != nil {
		return fmt.Errorf("booking insert failed: %w", err)
	}

	// Step 7: Commit transaction
	if err = tx.Commit(); err != nil {
		return fmt.Errorf("transaction commit failed: %w", err)
	}

	log.Printf("✅ Booking created: id=%d, user=%s, room=%d, date=%s",
		booking.ID, booking.UserID, booking.RoomID, dateStr)

	return nil
}

// InitializeInventory creates inventory records for a room (helper function for testing)
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
