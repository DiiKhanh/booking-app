package handler

import (
	"booking-app/internal/domain"
	"booking-app/internal/dto/response"
	"booking-app/internal/service"
	"context"
	"errors"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
)

// checkoutRequest is the body for POST /api/v1/checkout.
type checkoutRequest struct {
	BookingID int `json:"booking_id" binding:"required,min=1"`
}

// PaymentHandler handles HTTP requests for payment endpoints.
type PaymentHandler struct {
	paymentSvc service.PaymentServiceInterface
	sagaOrch   service.SagaOrchestratorInterface
}

// NewPaymentHandler creates a new PaymentHandler.
func NewPaymentHandler(paymentSvc service.PaymentServiceInterface, sagaOrch service.SagaOrchestratorInterface) *PaymentHandler {
	return &PaymentHandler{
		paymentSvc: paymentSvc,
		sagaOrch:   sagaOrch,
	}
}

// Checkout handles POST /api/v1/checkout.
// Initiates a payment saga for the specified booking.
func (h *PaymentHandler) Checkout(c *gin.Context) {
	userID := getUserIDFromContext(c)
	if userID == "" {
		c.JSON(http.StatusUnauthorized, response.Fail("authentication required"))
		return
	}

	var req checkoutRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, response.Fail(err.Error()))
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 15*time.Second)
	defer cancel()

	payment, err := h.sagaOrch.StartCheckout(ctx, req.BookingID, userID)
	if err != nil {
		handlePaymentError(c, err)
		return
	}

	c.JSON(http.StatusCreated, response.OK(response.NewPaymentResponse(payment)))
}

// GetPayment handles GET /api/v1/payments/:id.
func (h *PaymentHandler) GetPayment(c *gin.Context) {
	paymentID := c.Param("id")
	userID := getUserIDFromContext(c)

	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	payment, err := h.paymentSvc.GetPayment(ctx, paymentID, userID)
	if err != nil {
		handlePaymentError(c, err)
		return
	}

	c.JSON(http.StatusOK, response.OK(response.NewPaymentResponse(payment)))
}

// handlePaymentError maps domain errors to HTTP status codes.
func handlePaymentError(c *gin.Context, err error) {
	switch {
	case errors.Is(err, domain.ErrNotFound):
		c.JSON(http.StatusNotFound, response.Fail(err.Error()))
	case errors.Is(err, domain.ErrForbidden), errors.Is(err, domain.ErrUnauthorized):
		c.JSON(http.StatusForbidden, response.Fail(err.Error()))
	case errors.Is(err, domain.ErrConflict):
		c.JSON(http.StatusConflict, response.Fail(err.Error()))
	case errors.Is(err, domain.ErrBadRequest):
		c.JSON(http.StatusBadRequest, response.Fail(err.Error()))
	default:
		c.JSON(http.StatusInternalServerError, response.Fail("internal server error"))
	}
}
