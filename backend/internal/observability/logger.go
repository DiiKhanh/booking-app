package observability

import (
	"context"

	"go.uber.org/zap"
)

type contextKey string

const loggerKey contextKey = "logger"

var globalLogger *zap.Logger

// Init initializes the global JSON logger. Call once at startup.
func Init(production bool) error {
	var err error
	if production {
		globalLogger, err = zap.NewProduction()
	} else {
		globalLogger, err = zap.NewDevelopment()
	}
	return err
}

// L returns the logger from context, falling back to the global logger.
func L(ctx context.Context) *zap.Logger {
	if ctx != nil {
		if l, ok := ctx.Value(loggerKey).(*zap.Logger); ok {
			return l
		}
	}
	if globalLogger != nil {
		return globalLogger
	}
	l, _ := zap.NewProduction()
	return l
}

// WithLogger stores a logger in the context.
func WithLogger(ctx context.Context, l *zap.Logger) context.Context {
	return context.WithValue(ctx, loggerKey, l)
}

// Global returns the global logger (for use outside request context).
func Global() *zap.Logger {
	if globalLogger != nil {
		return globalLogger
	}
	l, _ := zap.NewProduction()
	return l
}
