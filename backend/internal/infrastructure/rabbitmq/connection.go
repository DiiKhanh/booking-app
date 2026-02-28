package rabbitmq

import (
	"fmt"
	"sync"
	"time"

	amqp "github.com/rabbitmq/amqp091-go"
	"go.uber.org/zap"
)

const (
	reconnectDelay = 5 * time.Second
	maxReconnects  = 10
)

// Connection wraps an AMQP connection with automatic reconnection.
type Connection struct {
	url     string
	conn    *amqp.Connection
	mu      sync.RWMutex
	logger  *zap.Logger
	done    chan struct{}
}

// NewConnection dials RabbitMQ and returns a managed Connection.
// It will block until the connection succeeds or maxReconnects is reached.
func NewConnection(url string, logger *zap.Logger) (*Connection, error) {
	c := &Connection{
		url:    url,
		logger: logger,
		done:   make(chan struct{}),
	}
	if err := c.dial(); err != nil {
		return nil, fmt.Errorf("initial rabbitmq dial: %w", err)
	}
	go c.watchForClose()
	return c, nil
}

// Channel opens a new AMQP channel from the current connection.
func (c *Connection) Channel() (*amqp.Channel, error) {
	c.mu.RLock()
	conn := c.conn
	c.mu.RUnlock()

	if conn == nil || conn.IsClosed() {
		return nil, fmt.Errorf("rabbitmq connection is closed")
	}
	ch, err := conn.Channel()
	if err != nil {
		return nil, fmt.Errorf("open amqp channel: %w", err)
	}
	return ch, nil
}

// Close cleanly shuts down the managed connection.
func (c *Connection) Close() error {
	close(c.done)
	c.mu.Lock()
	defer c.mu.Unlock()
	if c.conn != nil && !c.conn.IsClosed() {
		return c.conn.Close()
	}
	return nil
}

func (c *Connection) dial() error {
	conn, err := amqp.Dial(c.url)
	if err != nil {
		return err
	}
	c.mu.Lock()
	c.conn = conn
	c.mu.Unlock()
	c.logger.Info("connected to RabbitMQ")
	return nil
}

func (c *Connection) watchForClose() {
	for {
		c.mu.RLock()
		conn := c.conn
		c.mu.RUnlock()

		closed := make(chan *amqp.Error, 1)
		if conn != nil {
			conn.NotifyClose(closed)
		}

		select {
		case <-c.done:
			return
		case err := <-closed:
			if err == nil {
				return
			}
			c.logger.Warn("rabbitmq connection closed, reconnecting", zap.Error(err))
			c.reconnect()
		}
	}
}

func (c *Connection) reconnect() {
	for attempt := 1; attempt <= maxReconnects; attempt++ {
		select {
		case <-c.done:
			return
		default:
		}
		c.logger.Info("rabbitmq reconnect attempt", zap.Int("attempt", attempt))
		if err := c.dial(); err != nil {
			c.logger.Error("rabbitmq reconnect failed", zap.Int("attempt", attempt), zap.Error(err))
			time.Sleep(reconnectDelay)
			continue
		}
		c.logger.Info("rabbitmq reconnected successfully")
		go c.watchForClose()
		return
	}
	c.logger.Error("rabbitmq: exhausted reconnect attempts")
}
