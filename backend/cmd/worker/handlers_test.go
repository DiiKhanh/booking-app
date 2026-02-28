package main

import (
	"booking-app/internal/domain"
	"context"
	"encoding/json"
	"errors"
	"testing"

	amqp "github.com/rabbitmq/amqp091-go"
	"go.uber.org/zap"
)

// --- Mock SagaOrchestrator ---

type mockSagaOrch struct {
	handlePaymentSuccessFn func(ctx context.Context, paymentID string) error
	handlePaymentFailureFn func(ctx context.Context, paymentID string, reason string) error
	handlePaymentTimeoutFn func(ctx context.Context, paymentID string) error
}

func (m *mockSagaOrch) HandlePaymentSuccess(ctx context.Context, paymentID string) error {
	return m.handlePaymentSuccessFn(ctx, paymentID)
}

func (m *mockSagaOrch) HandlePaymentFailure(ctx context.Context, paymentID string, reason string) error {
	return m.handlePaymentFailureFn(ctx, paymentID, reason)
}

func (m *mockSagaOrch) HandlePaymentTimeout(ctx context.Context, paymentID string) error {
	return m.handlePaymentTimeoutFn(ctx, paymentID)
}

func makeMockSagaOrch(overrides mockSagaOrch) *mockSagaOrch {
	defaults := &mockSagaOrch{
		handlePaymentSuccessFn: func(ctx context.Context, paymentID string) error { return nil },
		handlePaymentFailureFn: func(ctx context.Context, paymentID string, reason string) error { return nil },
		handlePaymentTimeoutFn: func(ctx context.Context, paymentID string) error { return nil },
	}
	if overrides.handlePaymentSuccessFn != nil {
		defaults.handlePaymentSuccessFn = overrides.handlePaymentSuccessFn
	}
	if overrides.handlePaymentFailureFn != nil {
		defaults.handlePaymentFailureFn = overrides.handlePaymentFailureFn
	}
	if overrides.handlePaymentTimeoutFn != nil {
		defaults.handlePaymentTimeoutFn = overrides.handlePaymentTimeoutFn
	}
	return defaults
}

var testLogger = zap.NewNop()

func makeDelivery(routingKey string, payload interface{}) amqp.Delivery {
	body, _ := json.Marshal(payload)
	return amqp.Delivery{
		RoutingKey: routingKey,
		Body:       body,
	}
}

// --- Tests: handlePaymentSucceeded ---

func TestHandlePaymentSucceeded_Acks_OnSuccess(t *testing.T) {
	called := false
	sagaOrch := makeMockSagaOrch(mockSagaOrch{
		handlePaymentSuccessFn: func(ctx context.Context, paymentID string) error {
			called = true
			return nil
		},
	})

	payload := domain.PaymentResultPayload{PaymentID: "pay-1", BookingID: 1}
	delivery := makeDelivery("payment.succeeded", payload)

	ack := handlePaymentSucceeded(context.Background(), delivery, sagaOrch, testLogger)

	if !ack {
		t.Error("expected ack=true on success")
	}
	if !called {
		t.Error("expected HandlePaymentSuccess to be called")
	}
}

func TestHandlePaymentSucceeded_Nacks_OnSagaError(t *testing.T) {
	sagaOrch := makeMockSagaOrch(mockSagaOrch{
		handlePaymentSuccessFn: func(ctx context.Context, paymentID string) error {
			return errors.New("db error")
		},
	})

	payload := domain.PaymentResultPayload{PaymentID: "pay-1", BookingID: 1}
	delivery := makeDelivery("payment.succeeded", payload)

	ack := handlePaymentSucceeded(context.Background(), delivery, sagaOrch, testLogger)

	if ack {
		t.Error("expected ack=false when saga returns error")
	}
}

func TestHandlePaymentSucceeded_Nacks_OnMalformedPayload(t *testing.T) {
	sagaOrch := makeMockSagaOrch(mockSagaOrch{})
	delivery := amqp.Delivery{
		RoutingKey: "payment.succeeded",
		Body:       []byte("not-json"),
	}

	ack := handlePaymentSucceeded(context.Background(), delivery, sagaOrch, testLogger)

	if ack {
		t.Error("expected ack=false for malformed JSON")
	}
}

func TestHandlePaymentSucceeded_PassesCorrectPaymentID(t *testing.T) {
	var capturedID string
	sagaOrch := makeMockSagaOrch(mockSagaOrch{
		handlePaymentSuccessFn: func(ctx context.Context, paymentID string) error {
			capturedID = paymentID
			return nil
		},
	})

	payload := domain.PaymentResultPayload{PaymentID: "pay-xyz-789", BookingID: 42}
	delivery := makeDelivery("payment.succeeded", payload)

	handlePaymentSucceeded(context.Background(), delivery, sagaOrch, testLogger)

	if capturedID != "pay-xyz-789" {
		t.Errorf("expected paymentID=pay-xyz-789, got %q", capturedID)
	}
}

// --- Tests: handlePaymentFailed ---

func TestHandlePaymentFailed_Acks_OnSuccess(t *testing.T) {
	called := false
	sagaOrch := makeMockSagaOrch(mockSagaOrch{
		handlePaymentFailureFn: func(ctx context.Context, paymentID string, reason string) error {
			called = true
			return nil
		},
	})

	payload := domain.PaymentResultPayload{PaymentID: "pay-1", BookingID: 1, Reason: "card declined"}
	delivery := makeDelivery("payment.failed", payload)

	ack := handlePaymentFailed(context.Background(), delivery, sagaOrch, testLogger)

	if !ack {
		t.Error("expected ack=true on success")
	}
	if !called {
		t.Error("expected HandlePaymentFailure to be called")
	}
}

func TestHandlePaymentFailed_PassesReason(t *testing.T) {
	var capturedReason string
	sagaOrch := makeMockSagaOrch(mockSagaOrch{
		handlePaymentFailureFn: func(ctx context.Context, paymentID string, reason string) error {
			capturedReason = reason
			return nil
		},
	})

	payload := domain.PaymentResultPayload{PaymentID: "pay-1", BookingID: 1, Reason: "insufficient funds"}
	delivery := makeDelivery("payment.failed", payload)

	handlePaymentFailed(context.Background(), delivery, sagaOrch, testLogger)

	if capturedReason != "insufficient funds" {
		t.Errorf("expected reason=insufficient funds, got %q", capturedReason)
	}
}

func TestHandlePaymentFailed_Nacks_OnSagaError(t *testing.T) {
	sagaOrch := makeMockSagaOrch(mockSagaOrch{
		handlePaymentFailureFn: func(ctx context.Context, paymentID string, reason string) error {
			return errors.New("saga error")
		},
	})

	payload := domain.PaymentResultPayload{PaymentID: "pay-1", BookingID: 1}
	delivery := makeDelivery("payment.failed", payload)

	ack := handlePaymentFailed(context.Background(), delivery, sagaOrch, testLogger)

	if ack {
		t.Error("expected ack=false on saga error")
	}
}

// --- Tests: handlePaymentTimedOut ---

func TestHandlePaymentTimedOut_Acks_OnSuccess(t *testing.T) {
	called := false
	sagaOrch := makeMockSagaOrch(mockSagaOrch{
		handlePaymentTimeoutFn: func(ctx context.Context, paymentID string) error {
			called = true
			return nil
		},
	})

	payload := domain.PaymentResultPayload{PaymentID: "pay-1", BookingID: 1}
	delivery := makeDelivery("payment.timed_out", payload)

	ack := handlePaymentTimedOut(context.Background(), delivery, sagaOrch, testLogger)

	if !ack {
		t.Error("expected ack=true on success")
	}
	if !called {
		t.Error("expected HandlePaymentTimeout to be called")
	}
}

func TestHandlePaymentTimedOut_Nacks_OnSagaError(t *testing.T) {
	sagaOrch := makeMockSagaOrch(mockSagaOrch{
		handlePaymentTimeoutFn: func(ctx context.Context, paymentID string) error {
			return errors.New("timeout saga error")
		},
	})

	payload := domain.PaymentResultPayload{PaymentID: "pay-1", BookingID: 1}
	delivery := makeDelivery("payment.timed_out", payload)

	ack := handlePaymentTimedOut(context.Background(), delivery, sagaOrch, testLogger)

	if ack {
		t.Error("expected ack=false on saga error")
	}
}

func TestHandlePaymentTimedOut_Nacks_OnMalformedPayload(t *testing.T) {
	sagaOrch := makeMockSagaOrch(mockSagaOrch{})
	delivery := amqp.Delivery{
		RoutingKey: "payment.timed_out",
		Body:       []byte("{bad json"),
	}

	ack := handlePaymentTimedOut(context.Background(), delivery, sagaOrch, testLogger)

	if ack {
		t.Error("expected ack=false for malformed JSON")
	}
}
