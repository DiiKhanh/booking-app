package redis

import (
	"context"
	"time"

	"github.com/redis/go-redis/v9"
)

// SearchCache wraps a Redis client and implements service.SearchCache.
type SearchCache struct {
	client *redis.Client
}

// NewSearchCache creates a SearchCache backed by the given Redis client.
func NewSearchCache(client *redis.Client) *SearchCache {
	return &SearchCache{client: client}
}

// Get retrieves a cached value. Returns (nil, false, nil) on cache miss.
func (c *SearchCache) Get(ctx context.Context, key string) ([]byte, bool, error) {
	val, err := c.client.Get(ctx, key).Bytes()
	if err == redis.Nil {
		return nil, false, nil
	}
	if err != nil {
		return nil, false, err
	}
	return val, true, nil
}

// Set stores a value with the given TTL.
func (c *SearchCache) Set(ctx context.Context, key string, val []byte, ttl time.Duration) error {
	return c.client.Set(ctx, key, val, ttl).Err()
}
