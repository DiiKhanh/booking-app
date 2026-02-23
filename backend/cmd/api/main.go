package main

import (
	"booking-app/internal/config"
	"booking-app/internal/handler"
	redisinfra "booking-app/internal/infrastructure/redis"
	"booking-app/internal/observability"
	"booking-app/internal/repository"
	"booking-app/internal/router"
	"booking-app/internal/service"
	"context"
	"database/sql"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/joho/godotenv"
	_ "github.com/lib/pq"
	"github.com/redis/go-redis/v9"
	"go.uber.org/zap"
)

func main() {
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, reading from environment")
	}

	// 1. Config
	cfg := config.Load()

	// 2. Logger
	if err := observability.Init(!cfg.IsProduction()); err != nil {
		log.Fatalf("Failed to initialize logger: %v", err)
	}
	logger := observability.Global()
	defer logger.Sync()

	logger.Info("starting server", zap.String("app", cfg.AppName), zap.String("port", cfg.HTTPPort))

	// 3. PostgreSQL
	db, err := sql.Open("postgres", cfg.DBConnString())
	if err != nil {
		logger.Fatal("failed to open DB", zap.Error(err))
	}
	defer db.Close()
	if err = db.Ping(); err != nil {
		logger.Fatal("could not ping DB", zap.Error(err))
	}
	logger.Info("connected to PostgreSQL")

	// 4. Redis
	redisClient := redis.NewClient(&redis.Options{
		Addr:     cfg.RedisAddr,
		Password: cfg.RedisPassword,
	})
	if _, err := redisClient.Ping(context.Background()).Result(); err != nil {
		logger.Fatal("could not connect to Redis", zap.Error(err))
	}
	defer redisClient.Close()
	logger.Info("connected to Redis")

	// 5. Infrastructure
	locker := redisinfra.NewRedisLocker(redisClient)

	// 6. Repositories
	bookingRepo := repository.NewBookingRepo(db, locker)

	// 7. Services
	bookingSvc := service.NewBookingService(bookingRepo)

	// 8. Handlers
	bookingHandler := handler.NewBookingHandler(bookingSvc)

	// 9. Router
	r := router.New(bookingHandler)

	// 10. Server with graceful shutdown
	srv := &http.Server{
		Addr:    fmt.Sprintf(":%s", cfg.HTTPPort),
		Handler: r,
	}

	go func() {
		logger.Info("server listening", zap.String("addr", srv.Addr))
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.Fatal("server error", zap.Error(err))
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	logger.Info("shutting down server...")
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := srv.Shutdown(ctx); err != nil {
		logger.Error("server forced to shutdown", zap.Error(err))
	}
	logger.Info("server exited")
}
