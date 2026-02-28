package response

import (
	"booking-app/internal/domain"
	"time"
)

// ReviewResponse is the public representation of a review.
type ReviewResponse struct {
	ID        int       `json:"id"`
	UserID    string    `json:"user_id"`
	HotelID   int       `json:"hotel_id"`
	BookingID int       `json:"booking_id"`
	Rating    int       `json:"rating"`
	Title     string    `json:"title"`
	Comment   string    `json:"comment"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// NewReviewResponse converts a domain Review to a ReviewResponse.
func NewReviewResponse(r *domain.Review) ReviewResponse {
	return ReviewResponse{
		ID:        r.ID,
		UserID:    r.UserID,
		HotelID:   r.HotelID,
		BookingID: r.BookingID,
		Rating:    r.Rating,
		Title:     r.Title,
		Comment:   r.Comment,
		CreatedAt: r.CreatedAt,
		UpdatedAt: r.UpdatedAt,
	}
}

// NewReviewListResponse converts a slice of domain Reviews to ReviewResponses.
func NewReviewListResponse(reviews []*domain.Review) []ReviewResponse {
	result := make([]ReviewResponse, 0, len(reviews))
	for _, r := range reviews {
		result = append(result, NewReviewResponse(r))
	}
	return result
}
