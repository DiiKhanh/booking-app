package middleware

import (
	"booking-app/internal/dto/response"
	tokenpkg "booking-app/internal/infrastructure/jwt"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

const (
	contextKeyUserID   = "userID"
	contextKeyUserRole = "userRole"
)

// JWTAuth validates the Bearer token in the Authorization header.
// On success it sets "userID" and "userRole" in the Gin context.
func JWTAuth(mgr *tokenpkg.TokenManager) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, response.Fail("missing authorization header"))
			return
		}

		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
			c.AbortWithStatusJSON(http.StatusUnauthorized, response.Fail("invalid authorization header format"))
			return
		}

		claims, err := mgr.ValidateAccessToken(parts[1])
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, response.Fail("invalid or expired token"))
			return
		}

		c.Set(contextKeyUserID, claims.UserID)
		c.Set(contextKeyUserRole, claims.Role)
		c.Next()
	}
}
