package observability_test

import (
	"booking-app/internal/observability"
	"testing"

	"github.com/prometheus/client_golang/prometheus"
	dto "github.com/prometheus/client_model/go"
)

func TestMetrics_RegisteredWithoutPanic(t *testing.T) {
	// Importing the observability package triggers promauto registration.
	// If registration panics (duplicate), the test binary will crash.
	// We verify all exported metrics are non-nil.
	if observability.HTTPRequestsTotal == nil {
		t.Fatal("HTTPRequestsTotal should not be nil")
	}
	if observability.HTTPRequestDuration == nil {
		t.Fatal("HTTPRequestDuration should not be nil")
	}
	if observability.BookingsCreatedTotal == nil {
		t.Fatal("BookingsCreatedTotal should not be nil")
	}
	if observability.BookingConflictsTotal == nil {
		t.Fatal("BookingConflictsTotal should not be nil")
	}
	if observability.ActiveConnections == nil {
		t.Fatal("ActiveConnections should not be nil")
	}
}

func TestHTTPRequestsTotal_Increment(t *testing.T) {
	counter := observability.HTTPRequestsTotal.WithLabelValues("GET", "/test", "200")

	before := getCounterValue(t, counter)
	counter.Inc()
	after := getCounterValue(t, counter)

	if after-before != 1.0 {
		t.Errorf("expected counter to increment by 1, got %f", after-before)
	}
}

func TestHTTPRequestDuration_Observe(t *testing.T) {
	// Observe should not panic.
	observer := observability.HTTPRequestDuration.WithLabelValues("POST", "/bookings")
	observer.Observe(0.05)
	observer.Observe(0.5)
	observer.Observe(2.0)
}

func TestBookingsCreatedTotal_Increment(t *testing.T) {
	before := getCounterValue(t, observability.BookingsCreatedTotal)
	observability.BookingsCreatedTotal.Inc()
	after := getCounterValue(t, observability.BookingsCreatedTotal)

	if after-before != 1.0 {
		t.Errorf("expected BookingsCreatedTotal to increment by 1, got %f", after-before)
	}
}

func TestBookingConflictsTotal_Increment(t *testing.T) {
	before := getCounterValue(t, observability.BookingConflictsTotal)
	observability.BookingConflictsTotal.Inc()
	after := getCounterValue(t, observability.BookingConflictsTotal)

	if after-before != 1.0 {
		t.Errorf("expected BookingConflictsTotal to increment by 1, got %f", after-before)
	}
}

func TestActiveConnections_SetAndGet(t *testing.T) {
	observability.ActiveConnections.Set(0)
	observability.ActiveConnections.Inc()

	val := getGaugeValue(t, observability.ActiveConnections)
	if val != 1.0 {
		t.Errorf("expected ActiveConnections to be 1.0, got %f", val)
	}

	observability.ActiveConnections.Dec()
	val = getGaugeValue(t, observability.ActiveConnections)
	if val != 0.0 {
		t.Errorf("expected ActiveConnections to be 0.0, got %f", val)
	}
}

// getCounterValue reads the current value from a prometheus.Counter.
func getCounterValue(t *testing.T, c prometheus.Counter) float64 {
	t.Helper()
	m := &dto.Metric{}
	if err := c.Write(m); err != nil {
		t.Fatalf("failed to read counter value: %v", err)
	}
	return m.GetCounter().GetValue()
}

// getGaugeValue reads the current value from a prometheus.Gauge.
func getGaugeValue(t *testing.T, g prometheus.Gauge) float64 {
	t.Helper()
	m := &dto.Metric{}
	if err := g.Write(m); err != nil {
		t.Fatalf("failed to read gauge value: %v", err)
	}
	return m.GetGauge().GetValue()
}
