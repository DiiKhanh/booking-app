package handler

import (
	"booking-app/internal/domain"
	"booking-app/internal/infrastructure/rabbitmq"
	"booking-app/internal/repository"
	"context"
	"encoding/json"

	amqp "github.com/rabbitmq/amqp091-go"
	"go.uber.org/zap"
)

// BookingBroadcastRepo is the minimal booking repository surface needed for WS broadcasting.
type BookingBroadcastRepo interface {
	FindBookingByID(ctx context.Context, id int) (*domain.Booking, error)
}

// NewPaymentBroadcastHandler returns a RabbitMQ DeliveryHandler that broadcasts
// booking status updates to connected WebSocket clients via the Hub.
//
// It consumes from the booking.notifications queue (payment.succeeded / payment.failed
// / payment.timed_out routing keys) and pushes a WSMessage to the booking owner.
func NewPaymentBroadcastHandler(hub *Hub, payRepo repository.PaymentRepository, bookingRepo BookingBroadcastRepo, logger *zap.Logger) rabbitmq.DeliveryHandler {
	return func(ctx context.Context, delivery amqp.Delivery) bool {
		var payload domain.PaymentResultPayload
		if err := json.Unmarshal(delivery.Body, &payload); err != nil {
			logger.Error("broadcast handler: malformed payload",
				zap.String("routing_key", delivery.RoutingKey),
				zap.Error(err),
			)
			return false // nack
		}

		// Resolve userID: look up the booking to find who to broadcast to.
		booking, err := bookingRepo.FindBookingByID(ctx, payload.BookingID)
		if err != nil {
			logger.Error("broadcast handler: booking not found",
				zap.Int("booking_id", payload.BookingID),
				zap.Error(err),
			)
			return false
		}

		// Map routing key to booking status.
		bookingStatus := routingKeyToBookingStatus(delivery.RoutingKey)

		msg := WSMessage{
			Type: "booking_status_updated",
			Payload: map[string]any{
				"booking_id": payload.BookingID,
				"payment_id": payload.PaymentID,
				"status":     bookingStatus,
			},
		}
		raw, err := json.Marshal(msg)
		if err != nil {
			logger.Error("broadcast handler: marshal failed", zap.Error(err))
			return false
		}

		hub.Broadcast(booking.UserID, raw)

		logger.Info("broadcasted booking status update",
			zap.String("user_id", booking.UserID),
			zap.Int("booking_id", payload.BookingID),
			zap.String("status", bookingStatus),
		)
		return true
	}
}

func routingKeyToBookingStatus(routingKey string) string {
	switch routingKey {
	case "payment.succeeded":
		return domain.BookingStatusConfirmed
	case "payment.failed":
		return domain.BookingStatusFailed
	case "payment.timed_out":
		return domain.BookingStatusCancelled
	default:
		return "unknown"
	}
}
