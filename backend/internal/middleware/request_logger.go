package middleware

import (
	"booking-app/internal/observability"
	"time"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

// RequestLogger logs each HTTP request using the structured Zap logger.
// It replaces gin's default logger with JSON-structured output.
func RequestLogger() gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		path := c.Request.URL.Path
		correlationID := GetCorrelationID(c)

		c.Next()

		observability.Global().Info("request",
			zap.String("method", c.Request.Method),
			zap.String("path", path),
			zap.Int("status", c.Writer.Status()),
			zap.Duration("latency", time.Since(start)),
			zap.String("correlation_id", correlationID),
			zap.String("client_ip", c.ClientIP()),
		)
	}
}
