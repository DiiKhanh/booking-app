package config

import (
	"fmt"
	"os"
)

// Config holds all application configuration loaded from environment variables.
// Following 12-factor app: config is stored in the environment, not in code.
type Config struct {
	AppName  string
	HTTPPort string

	DBHost     string
	DBPort     string
	DBUser     string
	DBPassword string
	DBName     string
	DBSSLMode  string

	RedisAddr     string
	RedisPassword string
}

// Load reads configuration from environment variables with sensible defaults.
func Load() *Config {
	return &Config{
		AppName:  getEnv("APP_NAME", "booking-app"),
		HTTPPort: getEnv("HTTP_PORT", "8080"),

		DBHost:     getEnv("DB_HOST", "localhost"),
		DBPort:     getEnv("DB_PORT", "5432"),
		DBUser:     getEnv("DB_USER", "user"),
		DBPassword: getEnv("DB_PASSWORD", "password"),
		DBName:     getEnv("DB_NAME", "booking_db"),
		DBSSLMode:  getEnv("DB_SSLMODE", "disable"),

		RedisAddr:     getEnv("REDIS_ADDR", "localhost:6379"),
		RedisPassword: getEnv("REDIS_PASSWORD", ""),
	}
}

// DBConnString builds a PostgreSQL connection string from config fields.
func (c *Config) DBConnString() string {
	return fmt.Sprintf(
		"postgres://%s:%s@%s:%s/%s?sslmode=%s",
		c.DBUser, c.DBPassword, c.DBHost, c.DBPort, c.DBName, c.DBSSLMode,
	)
}

// getEnv reads an env var or returns a fallback default.
func getEnv(key, fallback string) string {
	if value, ok := os.LookupEnv(key); ok {
		return value
	}
	return fallback
}
