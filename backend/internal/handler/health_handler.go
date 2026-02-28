package handler

import (
	"context"
	"database/sql"
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
)

// HealthHandler exposes liveness, readiness, and startup probe endpoints.
type HealthHandler struct {
	db          *sql.DB
	redisClient *redis.Client
}

// NewHealthHandler creates a new HealthHandler.
func NewHealthHandler(db *sql.DB, redisClient *redis.Client) *HealthHandler {
	return &HealthHandler{
		db:          db,
		redisClient: redisClient,
	}
}

// healthResponse is the JSON body returned by the readiness and startup probes.
type healthResponse struct {
	Status string            `json:"status"`
	Checks map[string]string `json:"checks"`
}

// Live handles GET /health/live.
// Always returns 200 — signals the process is running.
func (h *HealthHandler) Live(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"status": "alive"})
}

// Ready handles GET /health/ready.
// Returns 200 only when both DB and Redis are reachable; 503 otherwise.
func (h *HealthHandler) Ready(c *gin.Context) {
	h.checkHealth(c)
}

// Startup handles GET /health/startup.
// Same semantics as Ready — used during container initialisation.
func (h *HealthHandler) Startup(c *gin.Context) {
	h.checkHealth(c)
}

// checkHealth performs DB and Redis ping checks and writes the result.
func (h *HealthHandler) checkHealth(c *gin.Context) {
	ctx, cancel := context.WithTimeout(c.Request.Context(), 3*time.Second)
	defer cancel()

	checks := map[string]string{}
	healthy := true

	// Database check.
	if err := h.db.PingContext(ctx); err != nil {
		checks["database"] = fmt.Sprintf("error: %s", err.Error())
		healthy = false
	} else {
		checks["database"] = "ok"
	}

	// Redis check.
	if _, err := h.redisClient.Ping(ctx).Result(); err != nil {
		checks["redis"] = fmt.Sprintf("error: %s", err.Error())
		healthy = false
	} else {
		checks["redis"] = "ok"
	}

	status := "healthy"
	statusCode := http.StatusOK
	if !healthy {
		status = "unhealthy"
		statusCode = http.StatusServiceUnavailable
	}

	c.JSON(statusCode, healthResponse{
		Status: status,
		Checks: checks,
	})
}
