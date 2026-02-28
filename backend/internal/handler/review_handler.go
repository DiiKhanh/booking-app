package handler

import (
	"booking-app/internal/domain"
	"booking-app/internal/dto/request"
	"booking-app/internal/dto/response"
	"booking-app/internal/service"
	"context"
	"errors"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
)

// ReviewServiceInterface defines what the review handler needs from the service.
type ReviewServiceInterface interface {
	CreateReview(ctx context.Context, userID string, hotelID int, input service.CreateReviewInput) (*domain.Review, error)
	ListReviewsByHotel(ctx context.Context, hotelID, page, limit int) ([]*domain.Review, int, error)
	UpdateReview(ctx context.Context, id int, callerUserID string, input service.UpdateReviewInput) (*domain.Review, error)
	DeleteReview(ctx context.Context, id int, callerUserID, callerRole string) error
}

// ReviewHandler handles HTTP requests for review endpoints.
type ReviewHandler struct {
	svc ReviewServiceInterface
}

// NewReviewHandler creates a new ReviewHandler.
func NewReviewHandler(svc ReviewServiceInterface) *ReviewHandler {
	return &ReviewHandler{svc: svc}
}

// CreateReview handles POST /api/v1/hotels/:id/reviews.
func (h *ReviewHandler) CreateReview(c *gin.Context) {
	hotelID, err := parseIDParam(c, "id")
	if err != nil {
		c.JSON(http.StatusBadRequest, response.Fail("invalid hotel id"))
		return
	}

	userID := getUserIDFromContext(c)
	if userID == "" {
		c.JSON(http.StatusUnauthorized, response.Fail("authentication required"))
		return
	}

	var req request.CreateReviewRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, response.Fail(err.Error()))
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	review, err := h.svc.CreateReview(ctx, userID, hotelID, service.CreateReviewInput{
		BookingID: req.BookingID,
		Rating:    req.Rating,
		Title:     req.Title,
		Comment:   req.Comment,
	})
	if err != nil {
		handleReviewError(c, err)
		return
	}

	c.JSON(http.StatusCreated, response.OK(response.NewReviewResponse(review)))
}

// ListReviewsByHotel handles GET /api/v1/hotels/:id/reviews.
func (h *ReviewHandler) ListReviewsByHotel(c *gin.Context) {
	hotelID, err := parseIDParam(c, "id")
	if err != nil {
		c.JSON(http.StatusBadRequest, response.Fail("invalid hotel id"))
		return
	}

	page := queryIntDefault(c, "page", 1)
	limit := queryIntDefault(c, "limit", 20)

	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	reviews, total, err := h.svc.ListReviewsByHotel(ctx, hotelID, page, limit)
	if err != nil {
		handleReviewError(c, err)
		return
	}

	pages := calculatePages(total, limit)
	c.JSON(http.StatusOK, response.OKList(
		response.NewReviewListResponse(reviews),
		response.Meta{Total: total, Page: page, Limit: limit, Pages: pages},
	))
}

// UpdateReview handles PUT /api/v1/reviews/:id.
func (h *ReviewHandler) UpdateReview(c *gin.Context) {
	id, err := parseIDParam(c, "id")
	if err != nil {
		c.JSON(http.StatusBadRequest, response.Fail("invalid review id"))
		return
	}

	var req request.UpdateReviewRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, response.Fail(err.Error()))
		return
	}

	callerUserID := getUserIDFromContext(c)

	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	review, err := h.svc.UpdateReview(ctx, id, callerUserID, service.UpdateReviewInput{
		Rating:  req.Rating,
		Title:   req.Title,
		Comment: req.Comment,
	})
	if err != nil {
		handleReviewError(c, err)
		return
	}

	c.JSON(http.StatusOK, response.OK(response.NewReviewResponse(review)))
}

// DeleteReview handles DELETE /api/v1/reviews/:id.
func (h *ReviewHandler) DeleteReview(c *gin.Context) {
	id, err := parseIDParam(c, "id")
	if err != nil {
		c.JSON(http.StatusBadRequest, response.Fail("invalid review id"))
		return
	}

	callerUserID := getUserIDFromContext(c)
	callerRole := c.GetString("userRole")

	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	if err := h.svc.DeleteReview(ctx, id, callerUserID, callerRole); err != nil {
		handleReviewError(c, err)
		return
	}

	c.Status(http.StatusNoContent)
}

// handleReviewError maps domain errors to HTTP status codes.
func handleReviewError(c *gin.Context, err error) {
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
