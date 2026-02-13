package main

import (
	"booking-app/internal/config"
	"booking-app/internal/handler"
	"booking-app/internal/repository"
	"context"
	"database/sql"
	"fmt"
	"log"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	_ "github.com/lib/pq"
	"github.com/redis/go-redis/v9"
)

func main() {
	// 0. Load .env file (ignore error if not present — env vars may be set externally)
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, reading from environment")
	}

	// 1. Load Configuration
	cfg := config.Load()
	log.Printf("Starting %s...", cfg.AppName)

	// 2. Connect to PostgreSQL
	db, err := sql.Open("postgres", cfg.DBConnString())
	if err != nil {
		log.Fatalf("Failed to open DB connection: %v", err)
	}
	defer db.Close()

	if err = db.Ping(); err != nil {
		log.Fatalf("Could not ping DB: %v", err)
	}
	fmt.Println("✅ Connected to PostgreSQL!")

	// 3. Connect to Redis
	redisClient := redis.NewClient(&redis.Options{
		Addr:     cfg.RedisAddr,
		Password: cfg.RedisPassword,
		DB:       0,
	})

	// Verify Redis connection using explicit context (go-redis/v9 requirement)
	if _, err := redisClient.Ping(context.Background()).Result(); err != nil {
		log.Fatalf("Could not connect to Redis: %v", err)
	}
	fmt.Println("✅ Connected to Redis!")
	defer redisClient.Close()

	// 4. Initialize Dependencies (pass both DB and Redis to repo)
	bookingRepo := repository.NewBookingRepo(db, redisClient)
	bookingHandler := handler.NewBookingHandler(bookingRepo)

	// 5. Setup Router with Panic Recovery middleware
	r := gin.Default()

	r.GET("/ping", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"message": "pong",
		})
	})

	api := r.Group("/api")
	{
		api.POST("/bookings", bookingHandler.CreateBooking)
		api.POST("/admin/init", bookingHandler.InitializeInventory)
	}

	// 6. Run Server
	port := cfg.HTTPPort
	fmt.Printf("🚀 Server running on port %s\n", port)
	if err := r.Run(":" + port); err != nil {
		log.Fatal(err)
	}
}
