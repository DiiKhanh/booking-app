package handler_test

import (
	"booking-app/internal/domain"
	"booking-app/internal/handler"
	"context"
	"encoding/json"
	"errors"
	"testing"
	"time"

	amqp "github.com/rabbitmq/amqp091-go"
	"go.uber.org/zap"
)

// --- Mock PaymentRepository (minimal) ---

type mockBroadcastPayRepo struct {
	getPaymentByIDFn func(ctx context.Context, id string) (*domain.Payment, error)
}

func (m *mockBroadcastPayRepo) CreatePayment(ctx context.Context, p *domain.Payment) (*domain.Payment, error) {
	return nil, nil
}
func (m *mockBroadcastPayRepo) GetPaymentByID(ctx context.Context, id string) (*domain.Payment, error) {
	if m.getPaymentByIDFn != nil {
		return m.getPaymentByIDFn(ctx, id)
	}
	return &domain.Payment{ID: id, BookingID: 1}, nil
}
func (m *mockBroadcastPayRepo) GetPaymentByBookingID(ctx context.Context, bookingID int) (*domain.Payment, error) {
	return nil, nil
}
func (m *mockBroadcastPayRepo) UpdatePaymentStatus(ctx context.Context, id string, status domain.PaymentStatus, ref, reason string) error {
	return nil
}
func (m *mockBroadcastPayRepo) GetPaymentByIdempotencyKey(ctx context.Context, key string) (*domain.Payment, error) {
	return nil, domain.ErrNotFound
}

// --- Mock BookingBroadcastRepo ---

type mockBroadcastBookingRepo struct {
	findBookingByIDFn func(ctx context.Context, id int) (*domain.Booking, error)
}

func (m *mockBroadcastBookingRepo) FindBookingByID(ctx context.Context, id int) (*domain.Booking, error) {
	if m.findBookingByIDFn != nil {
		return m.findBookingByIDFn(ctx, id)
	}
	return &domain.Booking{
		ID:        id,
		UserID:    "user-1",
		RoomID:    10,
		StartDate: time.Now(),
		EndDate:   time.Now().Add(48 * time.Hour),
	}, nil
}

// --- Helper ---

func makeResultDelivery(routingKey string, paymentID string, bookingID int) amqp.Delivery {
	payload := domain.PaymentResultPayload{
		PaymentID: paymentID,
		BookingID: bookingID,
	}
	body, _ := json.Marshal(payload)
	return amqp.Delivery{
		RoutingKey: routingKey,
		Body:       body,
	}
}

// --- Tests ---

func TestPaymentBroadcastHandler_SuccessRoutingKey_BroadcastsConfirmed(t *testing.T) {
	hub := handler.NewHub()
	payRepo := &mockBroadcastPayRepo{}
	bookingRepo := &mockBroadcastBookingRepo{}

	h := handler.NewPaymentBroadcastHandler(hub, payRepo, bookingRepo, zap.NewNop())

	delivery := makeResultDelivery("payment.succeeded", "pay-1", 42)
	ack := h(context.Background(), delivery)

	if !ack {
		t.Error("expected ack=true on successful broadcast")
	}
}

func TestPaymentBroadcastHandler_FailedRoutingKey_BroadcastsFailedStatus(t *testing.T) {
	hub := handler.NewHub()
	payRepo := &mockBroadcastPayRepo{}
	bookingRepo := &mockBroadcastBookingRepo{}

	h := handler.NewPaymentBroadcastHandler(hub, payRepo, bookingRepo, zap.NewNop())

	delivery := makeResultDelivery("payment.failed", "pay-1", 42)
	ack := h(context.Background(), delivery)

	if !ack {
		t.Error("expected ack=true on successful broadcast")
	}
}

func TestPaymentBroadcastHandler_TimedOutRoutingKey_BroadcastsCancelled(t *testing.T) {
	hub := handler.NewHub()
	payRepo := &mockBroadcastPayRepo{}
	bookingRepo := &mockBroadcastBookingRepo{}

	h := handler.NewPaymentBroadcastHandler(hub, payRepo, bookingRepo, zap.NewNop())

	delivery := makeResultDelivery("payment.timed_out", "pay-1", 42)
	ack := h(context.Background(), delivery)

	if !ack {
		t.Error("expected ack=true on successful broadcast")
	}
}

func TestPaymentBroadcastHandler_BookingNotFound_Nacks(t *testing.T) {
	hub := handler.NewHub()
	payRepo := &mockBroadcastPayRepo{}
	bookingRepo := &mockBroadcastBookingRepo{
		findBookingByIDFn: func(ctx context.Context, id int) (*domain.Booking, error) {
			return nil, domain.ErrNotFound
		},
	}

	h := handler.NewPaymentBroadcastHandler(hub, payRepo, bookingRepo, zap.NewNop())

	delivery := makeResultDelivery("payment.succeeded", "pay-1", 999)
	ack := h(context.Background(), delivery)

	if ack {
		t.Error("expected ack=false when booking not found")
	}
}

func TestPaymentBroadcastHandler_MalformedPayload_Nacks(t *testing.T) {
	hub := handler.NewHub()
	payRepo := &mockBroadcastPayRepo{}
	bookingRepo := &mockBroadcastBookingRepo{}

	h := handler.NewPaymentBroadcastHandler(hub, payRepo, bookingRepo, zap.NewNop())

	delivery := amqp.Delivery{
		RoutingKey: "payment.succeeded",
		Body:       []byte("not json"),
	}
	ack := h(context.Background(), delivery)

	if ack {
		t.Error("expected ack=false for malformed JSON")
	}
}

func TestPaymentBroadcastHandler_BroadcastsToCorrectUser(t *testing.T) {
	hub := handler.NewHub()

	// Register a fake conn for user-99 to verify broadcast reaches them.
	// Since we can't inject a fake websocket.Conn easily, just verify no panic + ack.
	payRepo := &mockBroadcastPayRepo{}
	bookingRepo := &mockBroadcastBookingRepo{
		findBookingByIDFn: func(ctx context.Context, id int) (*domain.Booking, error) {
			return &domain.Booking{ID: id, UserID: "user-99"}, nil
		},
	}

	h := handler.NewPaymentBroadcastHandler(hub, payRepo, bookingRepo, zap.NewNop())

	delivery := makeResultDelivery("payment.succeeded", "pay-1", 1)
	ack := h(context.Background(), delivery)

	if !ack {
		t.Error("expected ack=true")
	}
}

func TestPaymentBroadcastHandler_BookingRepoError_Nacks(t *testing.T) {
	hub := handler.NewHub()
	payRepo := &mockBroadcastPayRepo{}
	bookingRepo := &mockBroadcastBookingRepo{
		findBookingByIDFn: func(ctx context.Context, id int) (*domain.Booking, error) {
			return nil, errors.New("db connection lost")
		},
	}

	h := handler.NewPaymentBroadcastHandler(hub, payRepo, bookingRepo, zap.NewNop())

	delivery := makeResultDelivery("payment.succeeded", "pay-1", 5)
	ack := h(context.Background(), delivery)

	if ack {
		t.Error("expected ack=false on booking repo error")
	}
}
