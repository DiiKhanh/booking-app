package router

import (
	"booking-app/internal/handler"
	"booking-app/internal/middleware"

	"github.com/gin-gonic/gin"
)

// New builds and returns the configured Gin engine.
func New(bookingHandler *handler.BookingHandler) *gin.Engine {
	r := gin.New()

	// Global middleware stack (order matters — see distributed-booping-galaxy.md)
	r.Use(middleware.Recovery())
	r.Use(middleware.CorrelationID())
	r.Use(middleware.RequestLogger())

	r.GET("/ping", func(c *gin.Context) {
		c.JSON(200, gin.H{"message": "pong"})
	})

	v1 := r.Group("/api/v1")
	{
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
