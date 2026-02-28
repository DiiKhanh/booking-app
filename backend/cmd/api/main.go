package main

import (
	"booking-app/internal/config"
	"booking-app/internal/handler"
	esinfra "booking-app/internal/infrastructure/elasticsearch"
	tokenpkg "booking-app/internal/infrastructure/jwt"
	rabbitinfra "booking-app/internal/infrastructure/rabbitmq"
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

	accessTTL, err := time.ParseDuration(cfg.JWTAccessTokenTTL)
	if err != nil {
		logger.Fatal("invalid JWT_ACCESS_TOKEN_TTL", zap.Error(err))
	}
	refreshTTL := 7 * 24 * time.Hour
	tokenMgr := tokenpkg.NewTokenManager(cfg.JWTSecret, accessTTL, refreshTTL)

	// 5b. Elasticsearch
	esClient, err := esinfra.NewClient(cfg.ElasticsearchURL)
	if err != nil {
		logger.Fatal("failed to create Elasticsearch client", zap.Error(err))
	}
	if ensureErr := esinfra.EnsureIndex(esClient); ensureErr != nil {
		logger.Warn("could not ensure Elasticsearch index (search may be unavailable)", zap.Error(ensureErr))
	} else {
		logger.Info("connected to Elasticsearch")
	}

	// 6. Repositories
	bookingRepo := repository.NewBookingRepo(db, locker)
	userRepo := repository.NewUserRepo(db)
	tokenRepo := repository.NewTokenRepo(db)
	hotelRepo := repository.NewHotelRepo(db)
	roomRepo := repository.NewRoomRepo(db)
	inventoryRepo := repository.NewInventoryRepo(db)
	dashboardRepo := repository.NewDashboardRepo(db)
	reviewRepo := repository.NewReviewRepo(db)
	searchRepo := repository.NewESSearchRepo(esClient)
	paymentRepo := repository.NewPaymentRepo(db)
	outboxRepo := repository.NewOutboxRepo(db)

	// 7. Services
	bookingSvc := service.NewBookingService(bookingRepo, roomRepo)
	authSvc := service.NewAuthService(userRepo, tokenRepo, tokenMgr)
	hotelSvc := service.NewHotelService(hotelRepo)
	roomSvc := service.NewRoomService(roomRepo, hotelRepo)
	inventorySvc := service.NewInventoryService(inventoryRepo, roomRepo, hotelRepo)
	reviewSvc := service.NewReviewService(reviewRepo)
	searchCache := redisinfra.NewSearchCache(redisClient)
	searchSvc := service.NewSearchService(searchRepo, searchCache)
	paymentSvc := service.NewPaymentService(paymentRepo, outboxRepo, time.Now().UnixNano())

	// 7b. RabbitMQ (optional — warn and continue if unavailable)
	var sagaOrch service.SagaOrchestratorInterface
	rabbitConn, rabbitErr := rabbitinfra.NewConnection(cfg.RabbitMQURL, logger)
	if rabbitErr != nil {
		logger.Warn("RabbitMQ not available, saga orchestration disabled", zap.Error(rabbitErr))
		sagaOrch = service.NewSagaOrchestrator(bookingRepo, paymentRepo, outboxRepo, inventorySvc)
	} else {
		defer rabbitConn.Close()
		logger.Info("connected to RabbitMQ")

		ch, topErr := rabbitConn.Channel()
		if topErr == nil {
			if setupErr := rabbitinfra.SetupTopology(ch); setupErr != nil {
				logger.Warn("RabbitMQ topology setup failed", zap.Error(setupErr))
			}
			ch.Close()
		}

		publisher := rabbitinfra.NewPublisher(rabbitConn, logger)
		outboxWorker := service.NewOutboxWorker(outboxRepo, publisher, logger)
		go func() {
			workerCtx, workerCancel := context.WithCancel(context.Background())
			defer workerCancel()
			if err := outboxWorker.Run(workerCtx); err != nil {
				logger.Error("outbox worker stopped", zap.Error(err))
			}
		}()

		sagaOrch = service.NewSagaOrchestrator(bookingRepo, paymentRepo, outboxRepo, inventorySvc)
	}

	// 8. Handlers
	bookingHandler := handler.NewBookingHandler(bookingSvc)
	authHandler := handler.NewAuthHandler(authSvc)
	hotelHandler := handler.NewHotelHandler(hotelSvc)
	roomHandler := handler.NewRoomHandler(roomSvc, inventorySvc)
	ownerHandler := handler.NewOwnerHandler(dashboardRepo)
	reviewHandler := handler.NewReviewHandler(reviewSvc)
	searchHandler := handler.NewSearchHandler(searchSvc)
	paymentHandler := handler.NewPaymentHandler(paymentSvc, sagaOrch)
	healthHandler := handler.NewHealthHandler(db, redisClient)

	// 9. Router
	allowedOrigins := []string{"http://localhost:3000", "http://localhost:8081"}
	r := router.New(
		bookingHandler,
		authHandler,
		hotelHandler,
		roomHandler,
		ownerHandler,
		reviewHandler,
		searchHandler,
		paymentHandler,
		tokenMgr,
		allowedOrigins,
		healthHandler,
		redisClient,
		cfg.RateLimitPublic,
		cfg.RateLimitAuth,
	)

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
