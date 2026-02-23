package redis_test

import (
	"booking-app/internal/domain"
	redisinfra "booking-app/internal/infrastructure/redis"
	"context"
	"errors"
	"testing"
)

// mockLocker is a test double for Locker.
type mockLocker struct {
	acquireErr error
	releaseErr error
	acquired   bool
	released   bool
}

func (m *mockLocker) AcquireLock(_ context.Context, _ int, _ string) (string, error) {
	if m.acquireErr != nil {
		return "", m.acquireErr
	}
	m.acquired = true
	return "lock-value", nil
}

func (m *mockLocker) ReleaseLock(_ context.Context, _ int, _ string, _ string) error {
	m.released = true
	return m.releaseErr
}

// Ensure mockLocker satisfies the interface at compile time.
var _ redisinfra.Locker = (*mockLocker)(nil)

func TestMockLocker_AcquireSuccess(t *testing.T) {
	l := &mockLocker{}
	val, err := l.AcquireLock(context.Background(), 1, "2026-03-01")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if val == "" {
		t.Error("expected non-empty lock value")
	}
	if !l.acquired {
		t.Error("expected acquired=true")
	}
}

func TestMockLocker_AcquireFailure(t *testing.T) {
	l := &mockLocker{acquireErr: domain.ErrLockFailed}
	_, err := l.AcquireLock(context.Background(), 1, "2026-03-01")
	if !errors.Is(err, domain.ErrLockFailed) {
		t.Errorf("expected ErrLockFailed, got %v", err)
	}
}

func TestMockLocker_Release(t *testing.T) {
	l := &mockLocker{}
	err := l.ReleaseLock(context.Background(), 1, "2026-03-01", "lock-value")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !l.released {
		t.Error("expected released=true")
	}
}
