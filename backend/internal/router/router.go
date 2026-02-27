package router

import (
	"booking-app/internal/handler"
	"booking-app/internal/middleware"
	tokenpkg "booking-app/internal/infrastructure/jwt"

	"github.com/gin-gonic/gin"
)

// New builds and returns the configured Gin engine.
func New(
	bookingHandler *handler.BookingHandler,
	authHandler *handler.AuthHandler,
	tokenMgr *tokenpkg.TokenManager,
	allowedOrigins []string,
) *gin.Engine {
	r := gin.New()

	// Global middleware stack (order matters — see distributed-booping-galaxy.md)
	r.Use(middleware.Recovery())
	r.Use(middleware.CorrelationID())
	r.Use(middleware.RequestLogger())
	r.Use(middleware.CORS(allowedOrigins))

	r.GET("/ping", func(c *gin.Context) {
		c.JSON(200, gin.H{"message": "pong"})
	})

	v1 := r.Group("/api/v1")
	{
		// Public auth routes
		auth := v1.Group("/auth")
		{
			auth.POST("/register", authHandler.Register)
			auth.POST("/login", authHandler.Login)
			auth.POST("/refresh", authHandler.Refresh)
		}

		// Protected auth routes
		authProtected := v1.Group("/auth")
		authProtected.Use(middleware.JWTAuth(tokenMgr))
		{
			authProtected.POST("/logout", authHandler.Logout)
			authProtected.GET("/me", authHandler.Me)
		}

		// Booking routes
		v1.POST("/bookings", bookingHandler.CreateBooking)
		v1.POST("/admin/init", bookingHandler.InitializeInventory)
	}

	// Legacy route (no version prefix) — kept for backward compatibility
	api := r.Group("/api")
	{
		api.POST("/bookings", bookingHandler.CreateBooking)
		api.POST("/admin/init", bookingHandler.InitializeInventory)
	}

	return r
}
