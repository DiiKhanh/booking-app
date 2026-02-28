package router

import (
	"booking-app/internal/domain"
	"booking-app/internal/handler"
	tokenpkg "booking-app/internal/infrastructure/jwt"
	"booking-app/internal/middleware"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	"github.com/redis/go-redis/v9"
)

// New builds and returns the configured Gin engine.
func New(
	bookingHandler *handler.BookingHandler,
	authHandler *handler.AuthHandler,
	hotelHandler *handler.HotelHandler,
	roomHandler *handler.RoomHandler,
	ownerHandler *handler.OwnerHandler,
	reviewHandler *handler.ReviewHandler,
	searchHandler *handler.SearchHandler,
	paymentHandler *handler.PaymentHandler,
	tokenMgr *tokenpkg.TokenManager,
	allowedOrigins []string,
	healthHandler *handler.HealthHandler,
	redisClient *redis.Client,
	rateLimitPublic int,
	rateLimitAuth int,
	notificationHandler *handler.NotificationHandler,
	wsHandler *handler.WSHandler,
	adminHandler *handler.AdminHandler,
) *gin.Engine {
	r := gin.New()

	// Global middleware stack (order matters).
	r.Use(middleware.Recovery())
	r.Use(middleware.CorrelationID())
	r.Use(middleware.MetricsMiddleware())
	r.Use(middleware.RequestLogger())
	r.Use(middleware.CORS(allowedOrigins))

	// Health probe endpoints — no auth, no rate limiting.
	r.GET("/health/live", healthHandler.Live)
	r.GET("/health/ready", healthHandler.Ready)
	r.GET("/health/startup", healthHandler.Startup)

	// Prometheus scrape endpoint — no auth.
	r.GET("/metrics", gin.WrapH(promhttp.Handler()))

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

		// Protected auth routes.
		authProtected := v1.Group("/auth")
		authProtected.Use(middleware.JWTAuth(tokenMgr))
		{
			authProtected.POST("/logout", authHandler.Logout)
			authProtected.GET("/me", authHandler.Me)
		}

		// ----- Public hotel routes (no auth, public rate limit) -----
		publicGroup := v1.Group("")
		publicGroup.Use(middleware.RateLimiter(redisClient, rateLimitPublic, time.Minute, "rl:public"))
		{
			publicGroup.GET("/hotels", hotelHandler.ListHotels)
			publicGroup.GET("/hotels/search", searchHandler.Search)
			publicGroup.GET("/hotels/:id", hotelHandler.GetHotel)
			publicGroup.GET("/hotels/:id/rooms", roomHandler.ListRoomsByHotel)
			// Reviews listing is public (no auth required).
			publicGroup.GET("/hotels/:id/reviews", reviewHandler.ListReviewsByHotel)
		}

		// ----- Review write routes (JWT + guest role + auth rate limit) -----
		reviewGroup := v1.Group("")
		reviewGroup.Use(middleware.JWTAuth(tokenMgr))
		reviewGroup.Use(middleware.RateLimiter(redisClient, rateLimitAuth, time.Minute, "rl:auth"))
		{
			// Create review — any authenticated guest who has a confirmed booking.
			reviewGroup.POST("/hotels/:id/reviews", reviewHandler.CreateReview)
			// Update/delete are scoped to the review ID.
			reviewGroup.PUT("/reviews/:id", reviewHandler.UpdateReview)
			reviewGroup.DELETE("/reviews/:id", reviewHandler.DeleteReview)
		}

		// ----- Booking routes (JWT required + auth rate limit) -----
		bookingGroup := v1.Group("/bookings")
		bookingGroup.Use(middleware.JWTAuth(tokenMgr))
		bookingGroup.Use(middleware.RateLimiter(redisClient, rateLimitAuth, time.Minute, "rl:auth"))
		{
			bookingGroup.POST("", bookingHandler.CreateBooking)
			bookingGroup.GET("", bookingHandler.ListMyBookings)
			bookingGroup.GET("/:id", bookingHandler.GetBooking)
			bookingGroup.GET("/:id/status", bookingHandler.GetBookingStatus)
			bookingGroup.DELETE("/:id", bookingHandler.CancelBooking)
		}

		// ----- Payment routes (JWT required + auth rate limit) -----
		paymentGroup := v1.Group("")
		paymentGroup.Use(middleware.JWTAuth(tokenMgr))
		paymentGroup.Use(middleware.RateLimiter(redisClient, rateLimitAuth, time.Minute, "rl:auth"))
		{
			paymentGroup.POST("/checkout", paymentHandler.Checkout)
			paymentGroup.GET("/payments/:id", paymentHandler.GetPayment)
		}

		// Admin init route (no auth, matches original behaviour).
		v1.POST("/admin/init", bookingHandler.InitializeInventory)

		// ----- Owner routes (JWT + role=owner + auth rate limit) -----
		ownerGroup := v1.Group("/owner")
		ownerGroup.Use(middleware.JWTAuth(tokenMgr))
		ownerGroup.Use(middleware.RequireRole(domain.RoleOwner))
		ownerGroup.Use(middleware.RateLimiter(redisClient, rateLimitAuth, time.Minute, "rl:auth"))
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

		// ----- Admin routes (JWT + role=admin + auth rate limit) -----
		adminGroup := v1.Group("/admin")
		adminGroup.Use(middleware.JWTAuth(tokenMgr))
		adminGroup.Use(middleware.RequireRole(domain.RoleAdmin))
		adminGroup.Use(middleware.RateLimiter(redisClient, rateLimitAuth, time.Minute, "rl:auth"))
		{
			adminGroup.GET("/hotels/pending", hotelHandler.ListPendingHotels)
			adminGroup.PUT("/hotels/:id/approve", hotelHandler.ApproveHotel)
			adminGroup.PUT("/hotels/:id/reject", hotelHandler.RejectHotel)

			// Phase 10: Admin user management
			adminGroup.GET("/users", adminHandler.ListUsers)
			adminGroup.GET("/users/:id", adminHandler.GetUser)
			adminGroup.PUT("/users/:id/role", adminHandler.UpdateUserRole)
			adminGroup.PUT("/users/:id/deactivate", adminHandler.DeactivateUser)

			// Phase 10: Admin bookings view
			adminGroup.GET("/bookings", adminHandler.ListAllBookings)

			// Phase 10: System health (admin-scoped)
			adminGroup.GET("/system/health", adminHandler.SystemHealth)

			// Phase 10: DLQ management
			adminGroup.GET("/events/dlq", adminHandler.ListDLQEvents)
			adminGroup.POST("/events/dlq/:id/retry", adminHandler.RetryDLQEvent)
		}

		// ----- Notification routes (JWT required + auth rate limit) -----
		notifGroup := v1.Group("/notifications")
		notifGroup.Use(middleware.JWTAuth(tokenMgr))
		notifGroup.Use(middleware.RateLimiter(redisClient, rateLimitAuth, time.Minute, "rl:auth"))
		{
			notifGroup.GET("", notificationHandler.ListNotifications)
			notifGroup.GET("/unread-count", notificationHandler.UnreadCount)
			notifGroup.PUT("/:id/read", notificationHandler.MarkRead)
			notifGroup.PUT("/read-all", notificationHandler.MarkAllRead)
		}

		// ----- WebSocket route (JWT via ?token= query param, no rate limit) -----
		v1.GET("/ws/bookings", wsHandler.ServeWS)
	}

	// Legacy routes (no version prefix) — backward compatibility with k6 load tests.
	api := r.Group("/api")
	{
		api.POST("/bookings", bookingHandler.CreateBookingLegacy)
		api.POST("/admin/init", bookingHandler.InitializeInventory)
	}

	return r
}
