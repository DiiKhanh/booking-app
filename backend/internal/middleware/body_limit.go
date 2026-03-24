package middleware

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

// BodyLimiter restricts the maximum JSON request body size.
// When the body exceeds maxBytes, subsequent reads by the handler will fail,
// causing ShouldBindJSON to return an error and the handler to respond 400.
// This prevents memory exhaustion from oversized payloads.
func BodyLimiter(maxBytes int64) gin.HandlerFunc {
	return func(c *gin.Context) {
		if c.Request.Body != nil {
			c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, maxBytes)
		}
		c.Next()
	}
}
