package service

import (
	"booking-app/internal/domain"
	"booking-app/internal/repository"
	"context"
	"errors"
	"fmt"
	"strings"
	"time"
)

const maxMessageLength = 2000

// ChatServiceInterface defines the contract for chat business logic.
type ChatServiceInterface interface {
	GetOrCreateConversation(ctx context.Context, senderID string, input domain.CreateConversationInput) (*domain.Conversation, error)
	SendMessage(ctx context.Context, senderID string, input domain.SendMessageInput) (*domain.Message, error)
	ListConversations(ctx context.Context, userID string, page, limit int) ([]*domain.Conversation, int, error)
	ListMessages(ctx context.Context, conversationID int64, userID string, beforeID *int64, limit int) ([]*domain.Message, error)
	MarkConversationRead(ctx context.Context, conversationID int64, userID string) error
	GetTotalUnreadCount(ctx context.Context, userID string) (int, error)
	GetConversationByID(ctx context.Context, id int64, userID string) (*domain.Conversation, error)
}

// ChatService implements ChatServiceInterface.
type ChatService struct {
	repo      repository.ChatRepository
	hotelRepo repository.HotelRepository
}

// NewChatService creates a new ChatService.
func NewChatService(repo repository.ChatRepository, hotelRepo repository.HotelRepository) *ChatService {
	return &ChatService{repo: repo, hotelRepo: hotelRepo}
}

// GetOrCreateConversation finds an existing direct conversation between the sender and the
// given participant (optionally scoped to a hotel), or creates one if none exists.
func (s *ChatService) GetOrCreateConversation(ctx context.Context, senderID string, input domain.CreateConversationInput) (*domain.Conversation, error) {
	if input.ParticipantID == "" {
		return nil, fmt.Errorf("participant_id is required: %w", domain.ErrBadRequest)
	}
	if senderID == input.ParticipantID {
		return nil, fmt.Errorf("cannot start a conversation with yourself: %w", domain.ErrBadRequest)
	}

	existing, err := s.repo.FindDirectConversation(ctx, senderID, input.ParticipantID, input.HotelID)
	if err == nil {
		return existing, nil
	}
	if !errors.Is(err, domain.ErrNotFound) {
		return nil, fmt.Errorf("find direct conversation: %w", err)
	}

	now := time.Now()
	conv := &domain.Conversation{
		Type:          domain.ConversationTypeDirect,
		HotelID:       input.HotelID,
		BookingID:     input.BookingID,
		ParticipantA:  senderID,
		ParticipantB:  &input.ParticipantID,
		LastMessageAt: now,
	}
	return s.repo.CreateConversation(ctx, conv)
}

// SendMessage validates and persists a message, then bumps the conversation timestamp.
func (s *ChatService) SendMessage(ctx context.Context, senderID string, input domain.SendMessageInput) (*domain.Message, error) {
	content := strings.TrimSpace(input.Content)
	if content == "" {
		return nil, fmt.Errorf("message content must not be empty: %w", domain.ErrBadRequest)
	}
	if len([]rune(content)) > maxMessageLength {
		return nil, fmt.Errorf("message content exceeds %d characters: %w", maxMessageLength, domain.ErrBadRequest)
	}

	conv, err := s.repo.GetConversationByID(ctx, input.ConversationID)
	if err != nil {
		return nil, fmt.Errorf("get conversation: %w", err)
	}
	if !conv.IsParticipant(senderID) {
		return nil, fmt.Errorf("not a participant of this conversation: %w", domain.ErrForbidden)
	}

	msg := &domain.Message{
		ConversationID: input.ConversationID,
		SenderID:       senderID,
		Content:        content,
	}
	created, err := s.repo.CreateMessage(ctx, msg)
	if err != nil {
		return nil, fmt.Errorf("create message: %w", err)
	}

	// Best-effort: update last_message_at; a failure here doesn't fail the send.
	_ = s.repo.UpdateLastMessageAt(ctx, input.ConversationID, created.CreatedAt)

	return created, nil
}

// ListConversations returns paginated conversations for a user, newest first.
func (s *ChatService) ListConversations(ctx context.Context, userID string, page, limit int) ([]*domain.Conversation, int, error) {
	page, limit = normalizePagination(page, limit)
	return s.repo.ListConversationsByUser(ctx, userID, page, limit)
}

// ListMessages returns cursor-paginated messages for a conversation.
// The requesting user must be a participant.
func (s *ChatService) ListMessages(ctx context.Context, conversationID int64, userID string, beforeID *int64, limit int) ([]*domain.Message, error) {
	conv, err := s.repo.GetConversationByID(ctx, conversationID)
	if err != nil {
		return nil, fmt.Errorf("get conversation: %w", err)
	}
	if !conv.IsParticipant(userID) {
		return nil, fmt.Errorf("not a participant of this conversation: %w", domain.ErrForbidden)
	}

	if limit <= 0 || limit > 100 {
		limit = 50
	}
	return s.repo.ListMessagesByConversation(ctx, conversationID, beforeID, limit)
}

// MarkConversationRead marks all messages in a conversation as read for the given user.
func (s *ChatService) MarkConversationRead(ctx context.Context, conversationID int64, userID string) error {
	conv, err := s.repo.GetConversationByID(ctx, conversationID)
	if err != nil {
		return fmt.Errorf("get conversation: %w", err)
	}
	if !conv.IsParticipant(userID) {
		return fmt.Errorf("not a participant of this conversation: %w", domain.ErrForbidden)
	}
	return s.repo.MarkMessagesRead(ctx, conversationID, userID)
}

// GetTotalUnreadCount returns the total unread message count for a user.
func (s *ChatService) GetTotalUnreadCount(ctx context.Context, userID string) (int, error) {
	return s.repo.GetTotalUnreadCount(ctx, userID)
}

// GetConversationByID retrieves a conversation by id, scoped to the requesting user.
func (s *ChatService) GetConversationByID(ctx context.Context, id int64, userID string) (*domain.Conversation, error) {
	conv, err := s.repo.GetConversationByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if !conv.IsParticipant(userID) {
		return nil, fmt.Errorf("not a participant of this conversation: %w", domain.ErrForbidden)
	}
	return conv, nil
}
