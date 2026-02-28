package domain

import "time"

// ConversationType classifies the kind of conversation.
type ConversationType string

const (
	ConversationTypeDirect    ConversationType = "direct"
	ConversationTypeBroadcast ConversationType = "broadcast"
)

// Conversation represents a chat thread between participants.
type Conversation struct {
	ID            int64
	Type          ConversationType
	HotelID       *int
	BookingID     *int
	ParticipantA  string  // initiator (guest, or admin for broadcast)
	ParticipantB  *string // recipient (owner); nil for broadcast
	LastMessageAt time.Time
	CreatedAt     time.Time
}

// IsParticipant reports whether userID is allowed to read/write in this conversation.
func (c *Conversation) IsParticipant(userID string) bool {
	if c.ParticipantA == userID {
		return true
	}
	if c.ParticipantB != nil && *c.ParticipantB == userID {
		return true
	}
	return false
}

// Message represents a single chat message.
type Message struct {
	ID             int64
	ConversationID int64
	SenderID       string
	Content        string
	IsRead         bool
	CreatedAt      time.Time
}

// CreateConversationInput carries input for creating a direct conversation.
type CreateConversationInput struct {
	HotelID       *int
	BookingID     *int
	ParticipantID string // the other party
}

// SendMessageInput carries input for sending a message.
type SendMessageInput struct {
	ConversationID int64
	Content        string
}
