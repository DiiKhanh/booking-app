package response

import (
	"booking-app/internal/domain"
	"time"
)

// PaymentResponse is the public representation of a payment.
type PaymentResponse struct {
	ID             string                `json:"id"`
	BookingID      int                   `json:"booking_id"`
	Amount         float64               `json:"amount"`
	Currency       string                `json:"currency"`
	Status         domain.PaymentStatus  `json:"status"`
	IdempotencyKey string                `json:"idempotency_key"`
	GatewayRef     string                `json:"gateway_ref,omitempty"`
	FailedReason   string                `json:"failed_reason,omitempty"`
	CreatedAt      time.Time             `json:"created_at"`
	UpdatedAt      time.Time             `json:"updated_at"`
}

// NewPaymentResponse converts a domain Payment to a PaymentResponse.
func NewPaymentResponse(p *domain.Payment) PaymentResponse {
	return PaymentResponse{
		ID:             p.ID,
		BookingID:      p.BookingID,
		Amount:         p.Amount,
		Currency:       p.Currency,
		Status:         p.Status,
		IdempotencyKey: p.IdempotencyKey,
		GatewayRef:     p.GatewayRef,
		FailedReason:   p.FailedReason,
		CreatedAt:      p.CreatedAt,
		UpdatedAt:      p.UpdatedAt,
	}
}
