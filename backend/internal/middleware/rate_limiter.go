package middleware

import (
	"booking-app/internal/observability"
	"context"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
	"go.uber.org/zap"
)

// rateLimitScript is a Lua script that atomically increments a counter and sets
// an expiry on the first increment. Returns the current count after increment.
const rateLimitScript = `
local key    = KEYS[1]
local limit  = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local current = redis.call('INCR', key)
if current == 1 then
  redis.call('EXPIRE', key, window)
end
return current
`

// RateLimiter returns a Gin middleware that limits requests per client IP.
//
// limit     – maximum requests allowed per window
// window    – duration of the sliding window
// keyPrefix – Redis key namespace, e.g. "rl:public" or "rl:auth"
//
// Behaviour on Redis outage: fail-open (request is allowed, warning is logged).
func RateLimiter(redisClient *redis.Client, limit int, window time.Duration, keyPrefix string) gin.HandlerFunc {
	windowSeconds := int(window.Seconds())

	return func(c *gin.Context) {
		key := keyPrefix + ":" + c.ClientIP()

		count, err := runRateLimitScript(c.Request.Context(), redisClient, key, limit, windowSeconds)
		if err != nil {
			// Fail open: Redis is unavailable — allow the request and warn.
			observability.Global().Warn("rate limiter: Redis error, allowing request",
				zap.String("key", key),
				zap.Error(err),
			)
			c.Next()
			return
		}

		remaining := limit - count
		if remaining < 0 {
			remaining = 0
		}

		ttl := fetchTTL(c.Request.Context(), redisClient, key, windowSeconds)

		setRateLimitHeaders(c, limit, remaining, ttl)

		if count > limit {
			c.Header("Retry-After", strconv.Itoa(ttl))
			c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{
				"error": "rate limit exceeded",
			})
			return
		}

		c.Next()
	}
}

// runRateLimitScript executes the Lua rate-limit script and returns the current count.
func runRateLimitScript(ctx context.Context, client *redis.Client, key string, limit, windowSeconds int) (int, error) {
	result, err := client.Eval(ctx, rateLimitScript, []string{key}, limit, windowSeconds).Int()
	if err != nil {
		return 0, err
	}
	return result, nil
}

// fetchTTL retrieves the TTL for a Redis key in seconds.
// Falls back to the full window duration if TTL cannot be determined.
func fetchTTL(ctx context.Context, client *redis.Client, key string, windowSeconds int) int {
	ttl, err := client.TTL(ctx, key).Result()
	if err != nil || ttl <= 0 {
		return windowSeconds
	}
	return int(ttl.Seconds())
}

// setRateLimitHeaders writes standard rate-limit response headers.
func setRateLimitHeaders(c *gin.Context, limit, remaining, resetSeconds int) {
	c.Header("X-RateLimit-Limit", strconv.Itoa(limit))
	c.Header("X-RateLimit-Remaining", strconv.Itoa(remaining))
	c.Header("X-RateLimit-Reset", strconv.Itoa(resetSeconds))
}
