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

// JWTAuth validates the Bearer token in the Authorization header, or falls back
// to the HttpOnly access_token cookie (used by web clients).
// On success it sets "userID" and "userRole" in the Gin context.
func JWTAuth(mgr *tokenpkg.TokenManager) gin.HandlerFunc {
	return func(c *gin.Context) {
		var tokenStr string

		// Priority 1: Bearer header (mobile, API clients).
		if authHeader := c.GetHeader("Authorization"); authHeader != "" {
			parts := strings.SplitN(authHeader, " ", 2)
			if len(parts) == 2 && strings.EqualFold(parts[0], "Bearer") {
				tokenStr = parts[1]
			}
		}

		// Priority 2: HttpOnly cookie (web browser clients).
		if tokenStr == "" {
			if cookie, err := c.Cookie("access_token"); err == nil {
				tokenStr = cookie
			}
		}

		if tokenStr == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, response.Fail("missing authorization"))
			return
		}

		claims, err := mgr.ValidateAccessToken(tokenStr)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, response.Fail("invalid or expired token"))
			return
		}

		c.Set(contextKeyUserID, claims.UserID)
		c.Set(contextKeyUserRole, claims.Role)
		c.Next()
	}
}
