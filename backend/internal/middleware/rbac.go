package middleware

import (
	"booking-app/internal/domain"
	"booking-app/internal/dto/response"
	"net/http"

	"github.com/gin-gonic/gin"
)

// RequireRole aborts with 403 if the authenticated user's role is not in the
// allowed list. Must be used after JWTAuth which sets "userRole" in context.
func RequireRole(roles ...domain.Role) gin.HandlerFunc {
	allowed := make(map[string]struct{}, len(roles))
	for _, r := range roles {
		allowed[string(r)] = struct{}{}
	}

	return func(c *gin.Context) {
		roleVal, exists := c.Get(contextKeyUserRole)
		if !exists {
			c.AbortWithStatusJSON(http.StatusForbidden, response.Fail("missing role in context"))
			return
		}

		role, ok := roleVal.(string)
		if !ok {
			c.AbortWithStatusJSON(http.StatusForbidden, response.Fail("invalid role type in context"))
			return
		}

		if _, permitted := allowed[role]; !permitted {
			c.AbortWithStatusJSON(http.StatusForbidden, response.Fail("insufficient permissions"))
			return
		}

		c.Next()
	}
}
