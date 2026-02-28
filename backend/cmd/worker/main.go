package main

import (
	"booking-app/internal/config"
	"booking-app/internal/domain"
	"booking-app/internal/infrastructure/rabbitmq"
	"booking-app/internal/observability"
	"booking-app/internal/repository"
	"booking-app/internal/service"
	"context"
	"database/sql"
	"encoding/json"
	"log"
	"os"
	"os/signal"
	"syscall"
	"time"

	amqp "github.com/rabbitmq/amqp091-go"

	"github.com/joho/godotenv"
	_ "github.com/lib/pq"
	"go.uber.org/zap"
)

func main() {
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, reading from environment")
	}

	cfg := config.Load()

	if err := observability.Init(!cfg.IsProduction()); err != nil {
		log.Fatalf("failed to init logger: %v", err)
	}
	logger := observability.Global()
	defer logger.Sync()

	logger.Info("starting payment worker")

	// PostgreSQL.
	db, err := sql.Open("postgres", cfg.DBConnString())
	if err != nil {
		logger.Fatal("failed to open DB", zap.Error(err))
	}
	defer db.Close()
	if err = db.Ping(); err != nil {
		logger.Fatal("could not ping DB", zap.Error(err))
	}

	// Repositories.
	payRepo := repository.NewPaymentRepo(db)
	outboxRepo := repository.NewOutboxRepo(db)

	// Payment service (use time-based seed for production).
	paymentSvc := service.NewPaymentService(payRepo, outboxRepo, time.Now().UnixNano())

	// RabbitMQ connection.
	conn, err := rabbitmq.NewConnection(cfg.RabbitMQURL, logger)
	if err != nil {
		logger.Fatal("failed to connect to RabbitMQ", zap.Error(err))
	}
	defer conn.Close()

	// Setup topology.
	ch, err := conn.Channel()
	if err != nil {
		logger.Fatal("failed to open channel for topology setup", zap.Error(err))
	}
	if err := rabbitmq.SetupTopology(ch); err != nil {
		logger.Fatal("failed to set up RabbitMQ topology", zap.Error(err))
	}
	ch.Close()

	// Publisher for outbox worker.
	publisher := rabbitmq.NewPublisher(conn, logger)

	// Outbox worker (publishes pending events to RabbitMQ).
	outboxWorker := service.NewOutboxWorker(outboxRepo, publisher, logger)

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// Start outbox worker in background.
	go func() {
		if err := outboxWorker.Run(ctx); err != nil && ctx.Err() == nil {
			logger.Error("outbox worker exited with error", zap.Error(err))
		}
	}()

	// Consumer for payment processing.
	consumer := rabbitmq.NewConsumer(conn, "booking.payments", "payment-worker", logger)

	go func() {
		err := consumer.Consume(ctx, func(ctx context.Context, delivery amqp.Delivery) bool {
			return handleDelivery(ctx, delivery, paymentSvc, outboxRepo, logger)
		})
		if err != nil && ctx.Err() == nil {
			logger.Error("consumer exited with error", zap.Error(err))
			os.Exit(1)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	logger.Info("worker shutting down...")
	cancel()
	time.Sleep(2 * time.Second)
	logger.Info("worker stopped")
}

// handleDelivery routes incoming RabbitMQ messages to the appropriate handler.
// Returns true to ack, false to nack.
func handleDelivery(ctx context.Context, delivery amqp.Delivery, paymentSvc *service.PaymentService, outboxRepo repository.OutboxRepository, logger *zap.Logger) bool {
	// Check idempotency.
	alreadyProcessed, err := outboxRepo.IsEventProcessed(ctx, delivery.MessageId)
	if err != nil {
		logger.Error("failed to check processed event", zap.Error(err))
		return false
	}
	if alreadyProcessed {
		logger.Debug("skipping already-processed event", zap.String("message_id", delivery.MessageId))
		return true
	}

	switch delivery.RoutingKey {
	case "payment.initiated":
		return handlePaymentInitiated(ctx, delivery, paymentSvc, logger)
	default:
		logger.Warn("unknown routing key", zap.String("routing_key", delivery.RoutingKey))
		return false
	}
}

func handlePaymentInitiated(ctx context.Context, delivery amqp.Delivery, paymentSvc *service.PaymentService, logger *zap.Logger) bool {
	var payload domain.PaymentInitiatedPayload
	if err := json.Unmarshal(delivery.Body, &payload); err != nil {
		logger.Error("failed to unmarshal payment initiated payload",
			zap.String("body", string(delivery.Body)),
			zap.Error(err),
		)
		return false
	}

	logger.Info("processing payment", zap.String("payment_id", payload.PaymentID))

	if err := paymentSvc.ProcessPayment(ctx, payload.PaymentID); err != nil {
		logger.Error("failed to process payment",
			zap.String("payment_id", payload.PaymentID),
			zap.Error(err),
		)
		return false
	}

	logger.Info("payment processed successfully", zap.String("payment_id", payload.PaymentID))
	return true
}
