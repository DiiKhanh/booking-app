package middleware

import (
	"booking-app/internal/observability"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
)

// MetricsMiddleware records Prometheus metrics for each request.
// Must be placed after Recovery so that panics are counted correctly.
func MetricsMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()

		observability.ActiveConnections.Inc()
		defer observability.ActiveConnections.Dec()

		c.Next()

		path := c.FullPath()
		if path == "" {
			path = c.Request.URL.Path
		}

		status := strconv.Itoa(c.Writer.Status())
		duration := time.Since(start).Seconds()

		observability.HTTPRequestsTotal.
			WithLabelValues(c.Request.Method, path, status).
			Inc()

		observability.HTTPRequestDuration.
			WithLabelValues(c.Request.Method, path).
			Observe(duration)
	}
}
