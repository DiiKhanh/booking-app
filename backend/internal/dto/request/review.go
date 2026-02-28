package request

// CreateReviewRequest is the body for POST /api/v1/hotels/:id/reviews.
type CreateReviewRequest struct {
	BookingID int    `json:"booking_id" binding:"required,min=1"`
	Rating    int    `json:"rating"     binding:"required,min=1,max=5"`
	Title     string `json:"title"      binding:"max=255"`
	Comment   string `json:"comment"`
}

// UpdateReviewRequest is the body for PUT /api/v1/reviews/:id.
type UpdateReviewRequest struct {
	Rating  int    `json:"rating"  binding:"required,min=1,max=5"`
	Title   string `json:"title"   binding:"max=255"`
	Comment string `json:"comment"`
}
