package config

import (
	"fmt"
	"os"
)

// Config holds all application configuration loaded from environment variables.
// Following 12-factor app: config is stored in the environment, not in code.
type Config struct {
	AppName     string
	HTTPPort    string
	Environment string

	DBHost     string
	DBPort     string
	DBUser     string
	DBPassword string
	DBName     string
	DBSSLMode  string

	RedisAddr     string
	RedisPassword string

	// Phase 2: JWT
	JWTSecret          string
	JWTAccessTokenTTL  string
	JWTRefreshTokenTTL string

	// Phase 5: Rate Limiter
	RateLimitPublic int
	RateLimitAuth   int

	// Phase 7: Elasticsearch
	ElasticsearchURL string

	// Phase 8: RabbitMQ
	RabbitMQURL string

	// Phase 10: OpenTelemetry
	OTELEndpoint    string
	OTELServiceName string
}

// IsProduction returns true when running in production mode.
func (c *Config) IsProduction() bool {
	return c.Environment == "production"
}

// Load reads configuration from environment variables with sensible defaults.
func Load() *Config {
	return &Config{
		AppName:     getEnv("APP_NAME", "booking-app"),
		HTTPPort:    getEnv("HTTP_PORT", "8080"),
		Environment: getEnv("ENVIRONMENT", "development"),

		DBHost:     getEnv("DB_HOST", "localhost"),
		DBPort:     getEnv("DB_PORT", "5432"),
		DBUser:     getEnv("DB_USER", "user"),
		DBPassword: getEnv("DB_PASSWORD", "password"),
		DBName:     getEnv("DB_NAME", "booking_db"),
		DBSSLMode:  getEnv("DB_SSLMODE", "disable"),

		RedisAddr:     getEnv("REDIS_ADDR", "localhost:6379"),
		RedisPassword: getEnv("REDIS_PASSWORD", ""),

		JWTSecret:          getEnv("JWT_SECRET", "change-me-in-production"),
		JWTAccessTokenTTL:  getEnv("JWT_ACCESS_TOKEN_TTL", "15m"),
		JWTRefreshTokenTTL: getEnv("JWT_REFRESH_TOKEN_TTL", "7d"),

		RateLimitPublic: getEnvInt("RATE_LIMIT_PUBLIC", 100),
		RateLimitAuth:   getEnvInt("RATE_LIMIT_AUTH", 30),

		ElasticsearchURL: getEnv("ELASTICSEARCH_URL", "http://localhost:9200"),

		RabbitMQURL: getEnv("RABBITMQ_URL", "amqp://guest:guest@localhost:5672/"),

		OTELEndpoint:    getEnv("OTEL_ENDPOINT", "http://localhost:4318"),
		OTELServiceName: getEnv("OTEL_SERVICE_NAME", "booking-app"),
	}
}

// DBConnString builds a PostgreSQL connection string from config fields.
func (c *Config) DBConnString() string {
	return fmt.Sprintf(
		"postgres://%s:%s@%s:%s/%s?sslmode=%s",
		c.DBUser, c.DBPassword, c.DBHost, c.DBPort, c.DBName, c.DBSSLMode,
	)
}

func getEnv(key, fallback string) string {
	if value, ok := os.LookupEnv(key); ok {
		return value
	}
	return fallback
}

func getEnvInt(key string, fallback int) int {
	if value, ok := os.LookupEnv(key); ok {
		var n int
		if _, err := fmt.Sscanf(value, "%d", &n); err == nil {
			return n
		}
	}
	return fallback
}
