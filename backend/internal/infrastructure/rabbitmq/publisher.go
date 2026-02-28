package rabbitmq

import (
	"context"
	"fmt"
	"time"

	amqp "github.com/rabbitmq/amqp091-go"
	"go.uber.org/zap"
)

const publishTimeout = 5 * time.Second

// Publisher publishes messages to a RabbitMQ exchange in confirm mode.
type Publisher struct {
	conn   *Connection
	logger *zap.Logger
}

// NewPublisher creates a new Publisher.
func NewPublisher(conn *Connection, logger *zap.Logger) *Publisher {
	return &Publisher{conn: conn, logger: logger}
}

// Publish sends a message to the specified exchange with the given routing key.
// It uses publisher confirms to verify delivery.
func (p *Publisher) Publish(ctx context.Context, exchange, routingKey string, body []byte) error {
	ch, err := p.conn.Channel()
	if err != nil {
		return fmt.Errorf("open channel: %w", err)
	}
	defer ch.Close()

	// Enable publisher confirms on this channel.
	if err := ch.Confirm(false); err != nil {
		return fmt.Errorf("enable publisher confirms: %w", err)
	}

	confirms := ch.NotifyPublish(make(chan amqp.Confirmation, 1))

	err = ch.PublishWithContext(ctx, exchange, routingKey, false, false, amqp.Publishing{
		ContentType:  "application/json",
		DeliveryMode: amqp.Persistent,
		Timestamp:    time.Now(),
		Body:         body,
	})
	if err != nil {
		return fmt.Errorf("publish message: %w", err)
	}

	select {
	case confirm := <-confirms:
		if !confirm.Ack {
			return fmt.Errorf("broker nacked the message (exchange=%q routing_key=%q)", exchange, routingKey)
		}
		p.logger.Debug("message published",
			zap.String("exchange", exchange),
			zap.String("routing_key", routingKey),
		)
		return nil
	case <-ctx.Done():
		return fmt.Errorf("publish confirm timed out: %w", ctx.Err())
	case <-time.After(publishTimeout):
		return fmt.Errorf("publish confirm timed out after %s", publishTimeout)
	}
}

// SetupTopology declares the exchange, queues, and bindings needed for the payment saga.
func SetupTopology(ch *amqp.Channel) error {
	// Main exchange.
	if err := ch.ExchangeDeclare("booking.events", "topic", true, false, false, false, nil); err != nil {
		return fmt.Errorf("declare main exchange: %w", err)
	}

	// Dead letter exchange.
	if err := ch.ExchangeDeclare("booking.events.dlx", "topic", true, false, false, false, nil); err != nil {
		return fmt.Errorf("declare DLX: %w", err)
	}

	// Dead letter queue.
	if _, err := ch.QueueDeclare("booking.events.dlq", true, false, false, false, nil); err != nil {
		return fmt.Errorf("declare DLQ: %w", err)
	}
	if err := ch.QueueBind("booking.events.dlq", "#", "booking.events.dlx", false, nil); err != nil {
		return fmt.Errorf("bind DLQ: %w", err)
	}

	// Payment queue with DLX configured.
	args := amqp.Table{
		"x-dead-letter-exchange": "booking.events.dlx",
	}
	if _, err := ch.QueueDeclare("booking.payments", true, false, false, false, args); err != nil {
		return fmt.Errorf("declare payments queue: %w", err)
	}
	if err := ch.QueueBind("booking.payments", "payment.#", "booking.events", false, nil); err != nil {
		return fmt.Errorf("bind payments queue: %w", err)
	}

	return nil
}
