package redis

import (
	"context"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
)

// Locker defines the distributed locking interface.
type Locker interface {
	AcquireLock(ctx context.Context, roomID int, date string) (string, error)
	ReleaseLock(ctx context.Context, roomID int, date string, lockValue string) error
}

const (
	lockKeyFormat  = "lock:room:%d:%s"
	lockTTL        = 5 * time.Second
	lockRetryDelay = 50 * time.Millisecond
	lockMaxRetries = 10
)

// RedisLocker implements Locker using Redis SETNX.
type RedisLocker struct {
	client *redis.Client
}

// NewRedisLocker creates a new RedisLocker.
func NewRedisLocker(client *redis.Client) Locker {
	return &RedisLocker{client: client}
}

// AcquireLock attempts to acquire a distributed lock using Redis SETNX.
// It uses a unique lockValue (timestamp-based) so only the owner can release it.
// Retries up to lockMaxRetries times with lockRetryDelay between attempts.
func (l *RedisLocker) AcquireLock(ctx context.Context, roomID int, date string) (string, error) {
	lockKey := fmt.Sprintf(lockKeyFormat, roomID, date)
	lockValue := fmt.Sprintf("%d", time.Now().UnixNano())

	for i := 0; i < lockMaxRetries; i++ {
		success, err := l.client.SetNX(ctx, lockKey, lockValue, lockTTL).Result()
		if err != nil {
			return "", fmt.Errorf("redis SETNX failed: %w", err)
		}
		if success {
			return lockValue, nil
		}
		time.Sleep(lockRetryDelay)
	}

	return "", fmt.Errorf("could not acquire lock after %d retries: key=%s", lockMaxRetries, lockKey)
}

// ReleaseLock releases the distributed lock only if we still own it.
// Uses a Lua script for atomic check-and-delete to avoid releasing another holder's lock.
func (l *RedisLocker) ReleaseLock(ctx context.Context, roomID int, date string, lockValue string) error {
	lockKey := fmt.Sprintf(lockKeyFormat, roomID, date)

	luaScript := `
		if redis.call("GET", KEYS[1]) == ARGV[1] then
			return redis.call("DEL", KEYS[1])
		end
		return 0
	`

	_, err := l.client.Eval(ctx, luaScript, []string{lockKey}, lockValue).Result()
	if err != nil {
		return fmt.Errorf("redis lock release failed: %w", err)
	}

	return nil
}
