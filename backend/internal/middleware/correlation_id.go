package middleware

import (
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

const CorrelationIDHeader = "X-Correlation-ID"

// CorrelationID injects a correlation ID into each request.
// It reads from the incoming header if present, otherwise generates a new UUID.
func CorrelationID() gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.GetHeader(CorrelationIDHeader)
		if id == "" {
			id = uuid.NewString()
		}
		c.Set(CorrelationIDHeader, id)
		c.Header(CorrelationIDHeader, id)
		c.Next()
	}
}

// GetCorrelationID retrieves the correlation ID from the gin context.
func GetCorrelationID(c *gin.Context) string {
	id, _ := c.Get(CorrelationIDHeader)
	if s, ok := id.(string); ok {
		return s
	}
	return ""
}
