package middleware

import (
	"booking-app/internal/dto/response"
	"booking-app/internal/observability"
	"net/http"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

// Recovery catches panics and returns a standard 500 error envelope.
// It replaces gin's default recovery middleware with structured logging.
func Recovery() gin.HandlerFunc {
	return func(c *gin.Context) {
		defer func() {
			if err := recover(); err != nil {
				correlationID := GetCorrelationID(c)
				observability.Global().Error("panic recovered",
					zap.Any("error", err),
					zap.String("correlation_id", correlationID),
					zap.String("path", c.Request.URL.Path),
				)
				c.AbortWithStatusJSON(http.StatusInternalServerError,
					response.Fail("internal server error"))
			}
		}()
		c.Next()
	}
}
