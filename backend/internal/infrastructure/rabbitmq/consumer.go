package rabbitmq

import (
	"context"
	"fmt"

	amqp "github.com/rabbitmq/amqp091-go"
	"go.uber.org/zap"
)

const prefetchCount = 10

// DeliveryHandler is called for each received message.
// Return true to ack, false to nack (with requeue=false → goes to DLQ after retries).
type DeliveryHandler func(ctx context.Context, delivery amqp.Delivery) bool

// Consumer consumes messages from a RabbitMQ queue with manual acknowledgement.
type Consumer struct {
	conn      *Connection
	queueName string
	tag       string
	logger    *zap.Logger
}

// NewConsumer creates a new Consumer for the specified queue.
func NewConsumer(conn *Connection, queueName, consumerTag string, logger *zap.Logger) *Consumer {
	return &Consumer{
		conn:      conn,
		queueName: queueName,
		tag:       consumerTag,
		logger:    logger,
	}
}

// Consume starts consuming messages. Blocks until ctx is cancelled.
func (c *Consumer) Consume(ctx context.Context, handler DeliveryHandler) error {
	ch, err := c.conn.Channel()
	if err != nil {
		return fmt.Errorf("open channel: %w", err)
	}
	defer ch.Close()

	if err := ch.Qos(prefetchCount, 0, false); err != nil {
		return fmt.Errorf("set QoS: %w", err)
	}

	deliveries, err := ch.Consume(c.queueName, c.tag, false, false, false, false, nil)
	if err != nil {
		return fmt.Errorf("start consuming %q: %w", c.queueName, err)
	}

	c.logger.Info("consumer started", zap.String("queue", c.queueName), zap.String("tag", c.tag))

	for {
		select {
		case <-ctx.Done():
			c.logger.Info("consumer stopping", zap.String("queue", c.queueName))
			return ctx.Err()
		case delivery, ok := <-deliveries:
			if !ok {
				return fmt.Errorf("delivery channel closed for queue %q", c.queueName)
			}
			c.handleDelivery(ctx, delivery, handler)
		}
	}
}

func (c *Consumer) handleDelivery(ctx context.Context, delivery amqp.Delivery, handler DeliveryHandler) {
	c.logger.Debug("received message",
		zap.String("queue", c.queueName),
		zap.String("routing_key", delivery.RoutingKey),
	)

	ack := handler(ctx, delivery)
	if ack {
		if err := delivery.Ack(false); err != nil {
			c.logger.Error("failed to ack message", zap.Error(err))
		}
	} else {
		// nack with requeue=false → message goes to DLX after retry limit.
		if err := delivery.Nack(false, false); err != nil {
			c.logger.Error("failed to nack message", zap.Error(err))
		}
	}
}
