package router

import (
	"booking-app/internal/domain"
	"booking-app/internal/handler"
	"booking-app/internal/middleware"
	tokenpkg "booking-app/internal/infrastructure/jwt"

	"github.com/gin-gonic/gin"
)

// New builds and returns the configured Gin engine.
func New(
	bookingHandler *handler.BookingHandler,
	authHandler *handler.AuthHandler,
	hotelHandler *handler.HotelHandler,
	roomHandler *handler.RoomHandler,
	ownerHandler *handler.OwnerHandler,
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
		// ----- Public auth routes -----
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

		// ----- Public hotel routes (no auth) -----
		v1.GET("/hotels", hotelHandler.ListHotels)
		v1.GET("/hotels/:id", hotelHandler.GetHotel)
		v1.GET("/hotels/:id/rooms", roomHandler.ListRoomsByHotel)

		// ----- Booking routes -----
		v1.POST("/bookings", bookingHandler.CreateBooking)
		v1.POST("/admin/init", bookingHandler.InitializeInventory)

		// ----- Owner routes (JWT + role=owner) -----
		ownerGroup := v1.Group("/owner")
		ownerGroup.Use(middleware.JWTAuth(tokenMgr))
		ownerGroup.Use(middleware.RequireRole(domain.RoleOwner))
		{
			ownerGroup.POST("/hotels", hotelHandler.CreateHotel)
			ownerGroup.GET("/hotels", hotelHandler.ListMyHotels)
			ownerGroup.PUT("/hotels/:id", hotelHandler.UpdateHotel)
			ownerGroup.DELETE("/hotels/:id", hotelHandler.DeleteHotel)

			ownerGroup.POST("/hotels/:id/rooms", roomHandler.CreateRoom)
			ownerGroup.PUT("/rooms/:id", roomHandler.UpdateRoom)
			ownerGroup.DELETE("/rooms/:id", roomHandler.DeleteRoom)
			ownerGroup.PUT("/rooms/:id/inventory", roomHandler.SetInventory)
			ownerGroup.GET("/rooms/:id/inventory", roomHandler.GetInventory)

			ownerGroup.GET("/dashboard", ownerHandler.Dashboard)
		}

		// ----- Admin routes (JWT + role=admin) -----
		adminGroup := v1.Group("/admin")
		adminGroup.Use(middleware.JWTAuth(tokenMgr))
		adminGroup.Use(middleware.RequireRole(domain.RoleAdmin))
		{
			adminGroup.GET("/hotels/pending", hotelHandler.ListPendingHotels)
			adminGroup.PUT("/hotels/:id/approve", hotelHandler.ApproveHotel)
			adminGroup.PUT("/hotels/:id/reject", hotelHandler.RejectHotel)
		}
	}

	// Legacy route (no version prefix) — kept for backward compatibility
	api := r.Group("/api")
	{
		api.POST("/bookings", bookingHandler.CreateBooking)
		api.POST("/admin/init", bookingHandler.InitializeInventory)
	}

	return r
}
