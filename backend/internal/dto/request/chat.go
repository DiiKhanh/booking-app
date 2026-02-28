package request

// CreateConversationRequest is the body for POST /api/v1/conversations.
type CreateConversationRequest struct {
	HotelID       *int   `json:"hotel_id"`
	BookingID     *int   `json:"booking_id"`
	ParticipantID string `json:"participant_id" binding:"required"`
}

// SendMessageRequest is the body for POST /api/v1/conversations/:id/messages.
type SendMessageRequest struct {
	Content string `json:"content" binding:"required"`
}

// BroadcastAnnouncementRequest is the body for POST /api/v1/admin/broadcast.
type BroadcastAnnouncementRequest struct {
	Content string `json:"content" binding:"required"`
}
