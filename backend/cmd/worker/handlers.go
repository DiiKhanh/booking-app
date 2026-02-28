package main

import (
	"booking-app/internal/domain"
	"context"
	"encoding/json"

	amqp "github.com/rabbitmq/amqp091-go"
	"go.uber.org/zap"
)

// sagaResultHandler is the minimal interface needed for payment result consumers.
type sagaResultHandler interface {
	HandlePaymentSuccess(ctx context.Context, paymentID string) error
	HandlePaymentFailure(ctx context.Context, paymentID string, reason string) error
	HandlePaymentTimeout(ctx context.Context, paymentID string) error
}

// handlePaymentSucceeded processes a payment.succeeded event.
// Calls sagaOrch.HandlePaymentSuccess to confirm the booking and notify the user.
func handlePaymentSucceeded(ctx context.Context, delivery amqp.Delivery, sagaOrch sagaResultHandler, logger *zap.Logger) bool {
	var payload domain.PaymentResultPayload
	if err := json.Unmarshal(delivery.Body, &payload); err != nil {
		logger.Error("malformed payment.succeeded payload",
			zap.String("body", string(delivery.Body)),
			zap.Error(err),
		)
		return false
	}

	logger.Info("handling payment.succeeded", zap.String("payment_id", payload.PaymentID), zap.Int("booking_id", payload.BookingID))

	if err := sagaOrch.HandlePaymentSuccess(ctx, payload.PaymentID); err != nil {
		logger.Error("HandlePaymentSuccess failed",
			zap.String("payment_id", payload.PaymentID),
			zap.Error(err),
		)
		return false
	}

	logger.Info("booking confirmed", zap.String("payment_id", payload.PaymentID), zap.Int("booking_id", payload.BookingID))
	return true
}

// handlePaymentFailed processes a payment.failed event.
// Calls sagaOrch.HandlePaymentFailure to mark booking failed and restore inventory.
func handlePaymentFailed(ctx context.Context, delivery amqp.Delivery, sagaOrch sagaResultHandler, logger *zap.Logger) bool {
	var payload domain.PaymentResultPayload
	if err := json.Unmarshal(delivery.Body, &payload); err != nil {
		logger.Error("malformed payment.failed payload",
			zap.String("body", string(delivery.Body)),
			zap.Error(err),
		)
		return false
	}

	logger.Info("handling payment.failed",
		zap.String("payment_id", payload.PaymentID),
		zap.Int("booking_id", payload.BookingID),
		zap.String("reason", payload.Reason),
	)

	if err := sagaOrch.HandlePaymentFailure(ctx, payload.PaymentID, payload.Reason); err != nil {
		logger.Error("HandlePaymentFailure failed",
			zap.String("payment_id", payload.PaymentID),
			zap.Error(err),
		)
		return false
	}

	logger.Info("booking marked failed", zap.String("payment_id", payload.PaymentID), zap.Int("booking_id", payload.BookingID))
	return true
}

// handlePaymentTimedOut processes a payment.timed_out event.
// Calls sagaOrch.HandlePaymentTimeout to cancel booking and restore inventory.
func handlePaymentTimedOut(ctx context.Context, delivery amqp.Delivery, sagaOrch sagaResultHandler, logger *zap.Logger) bool {
	var payload domain.PaymentResultPayload
	if err := json.Unmarshal(delivery.Body, &payload); err != nil {
		logger.Error("malformed payment.timed_out payload",
			zap.String("body", string(delivery.Body)),
			zap.Error(err),
		)
		return false
	}

	logger.Info("handling payment.timed_out", zap.String("payment_id", payload.PaymentID), zap.Int("booking_id", payload.BookingID))

	if err := sagaOrch.HandlePaymentTimeout(ctx, payload.PaymentID); err != nil {
		logger.Error("HandlePaymentTimeout failed",
			zap.String("payment_id", payload.PaymentID),
			zap.Error(err),
		)
		return false
	}

	logger.Info("booking cancelled on timeout", zap.String("payment_id", payload.PaymentID), zap.Int("booking_id", payload.BookingID))
	return true
}
