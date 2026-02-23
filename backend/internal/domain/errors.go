package domain

import "errors"

// Domain-level sentinel errors. Use errors.Is() to check these in handlers.
var (
	ErrNotFound     = errors.New("resource not found")
	ErrConflict     = errors.New("resource conflict")
	ErrUnauthorized = errors.New("unauthorized")
	ErrForbidden    = errors.New("forbidden")
	ErrBadRequest   = errors.New("bad request")
	ErrInternal     = errors.New("internal server error")
	ErrLockFailed   = errors.New("could not acquire lock")
	ErrNotAvailable = errors.New("room not available for selected dates")
)
