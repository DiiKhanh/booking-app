package observability

import (
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
)

// HTTPRequestsTotal counts all HTTP requests by method, path pattern, and status code.
var HTTPRequestsTotal = promauto.NewCounterVec(prometheus.CounterOpts{
	Name: "http_requests_total",
	Help: "Total number of HTTP requests",
}, []string{"method", "path", "status"})

// HTTPRequestDuration records the latency of HTTP requests by method and path pattern.
var HTTPRequestDuration = promauto.NewHistogramVec(prometheus.HistogramOpts{
	Name:    "http_request_duration_seconds",
	Help:    "HTTP request duration in seconds",
	Buckets: prometheus.DefBuckets,
}, []string{"method", "path"})

// BookingsCreatedTotal counts successfully created bookings.
var BookingsCreatedTotal = promauto.NewCounter(prometheus.CounterOpts{
	Name: "bookings_created_total",
	Help: "Total number of bookings created",
})

// BookingConflictsTotal counts booking conflict responses (HTTP 409).
var BookingConflictsTotal = promauto.NewCounter(prometheus.CounterOpts{
	Name: "booking_conflicts_total",
	Help: "Total number of booking conflicts (409)",
})

// ActiveConnections tracks the number of in-flight HTTP connections.
var ActiveConnections = promauto.NewGauge(prometheus.GaugeOpts{
	Name: "http_active_connections",
	Help: "Number of active HTTP connections",
})
