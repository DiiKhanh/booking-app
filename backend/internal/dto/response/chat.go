package response

import (
	"booking-app/internal/domain"
	"time"
)

// ConversationResponse is the API representation of a conversation.
type ConversationResponse struct {
	ID            int64            `json:"id"`
	Type          string           `json:"type"`
	HotelID       *int             `json:"hotel_id,omitempty"`
	BookingID     *int             `json:"booking_id,omitempty"`
	ParticipantA  string           `json:"participant_a"`
	ParticipantB  *string          `json:"participant_b,omitempty"`
	LastMessage   *MessageResponse `json:"last_message,omitempty"`
	UnreadCount   int              `json:"unread_count"`
	LastMessageAt time.Time        `json:"last_message_at"`
	CreatedAt     time.Time        `json:"created_at"`
}

// MessageResponse is the API representation of a chat message.
type MessageResponse struct {
	ID             int64     `json:"id"`
	ConversationID int64     `json:"conversation_id"`
	SenderID       string    `json:"sender_id"`
	Content        string    `json:"content"`
	IsRead         bool      `json:"is_read"`
	CreatedAt      time.Time `json:"created_at"`
}

// NewConversationResponse maps a domain.Conversation to its API representation.
func NewConversationResponse(c *domain.Conversation) *ConversationResponse {
	return &ConversationResponse{
		ID:            c.ID,
		Type:          string(c.Type),
		HotelID:       c.HotelID,
		BookingID:     c.BookingID,
		ParticipantA:  c.ParticipantA,
		ParticipantB:  c.ParticipantB,
		LastMessageAt: c.LastMessageAt,
		CreatedAt:     c.CreatedAt,
	}
}

// NewMessageResponse maps a domain.Message to its API representation.
func NewMessageResponse(m *domain.Message) *MessageResponse {
	return &MessageResponse{
		ID:             m.ID,
		ConversationID: m.ConversationID,
		SenderID:       m.SenderID,
		Content:        m.Content,
		IsRead:         m.IsRead,
		CreatedAt:      m.CreatedAt,
	}
}

// NewMessageListResponse maps a slice of domain messages to their API representations.
func NewMessageListResponse(msgs []*domain.Message) []*MessageResponse {
	out := make([]*MessageResponse, len(msgs))
	for i, m := range msgs {
		out[i] = NewMessageResponse(m)
	}
	return out
}
