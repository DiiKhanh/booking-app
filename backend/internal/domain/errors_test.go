package domain_test

import (
	"booking-app/internal/domain"
	"errors"
	"fmt"
	"testing"
)

func TestDomainErrors_Sentinel(t *testing.T) {
	cases := []struct {
		name    string
		err     error
		wrapped error
	}{
		{"ErrNotFound", domain.ErrNotFound, fmt.Errorf("wrap: %w", domain.ErrNotFound)},
		{"ErrConflict", domain.ErrConflict, fmt.Errorf("wrap: %w", domain.ErrConflict)},
		{"ErrUnauthorized", domain.ErrUnauthorized, fmt.Errorf("wrap: %w", domain.ErrUnauthorized)},
		{"ErrForbidden", domain.ErrForbidden, fmt.Errorf("wrap: %w", domain.ErrForbidden)},
		{"ErrBadRequest", domain.ErrBadRequest, fmt.Errorf("wrap: %w", domain.ErrBadRequest)},
		{"ErrInternal", domain.ErrInternal, fmt.Errorf("wrap: %w", domain.ErrInternal)},
		{"ErrLockFailed", domain.ErrLockFailed, fmt.Errorf("wrap: %w", domain.ErrLockFailed)},
		{"ErrNotAvailable", domain.ErrNotAvailable, fmt.Errorf("wrap: %w", domain.ErrNotAvailable)},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if !errors.Is(tc.wrapped, tc.err) {
				t.Errorf("errors.Is failed: %v not found in %v", tc.err, tc.wrapped)
			}
		})
	}
}
