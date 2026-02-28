package service_test

import (
	"booking-app/internal/domain"
	"booking-app/internal/service"
	"context"
	"errors"
	"fmt"
	"strings"
	"testing"
	"time"
)

// --- Mock ChatRepository ---

type mockChatRepo struct {
	createConversationFn          func(ctx context.Context, conv *domain.Conversation) (*domain.Conversation, error)
	getConversationByIDFn         func(ctx context.Context, id int64) (*domain.Conversation, error)
	findDirectConversationFn      func(ctx context.Context, pA, pB string, hotelID *int) (*domain.Conversation, error)
	listConversationsByUserFn     func(ctx context.Context, userID string, page, limit int) ([]*domain.Conversation, int, error)
	updateLastMessageAtFn         func(ctx context.Context, conversationID int64, at time.Time) error
	createMessageFn               func(ctx context.Context, msg *domain.Message) (*domain.Message, error)
	listMessagesByConversationFn  func(ctx context.Context, conversationID int64, beforeID *int64, limit int) ([]*domain.Message, error)
	markMessagesReadFn            func(ctx context.Context, conversationID int64, userID string) error
	getUnreadCountByConversationFn func(ctx context.Context, conversationID int64, userID string) (int, error)
	getTotalUnreadCountFn         func(ctx context.Context, userID string) (int, error)
	getLastMessageFn              func(ctx context.Context, conversationID int64) (*domain.Message, error)
}

func (m *mockChatRepo) CreateConversation(ctx context.Context, conv *domain.Conversation) (*domain.Conversation, error) {
	if m.createConversationFn != nil {
		return m.createConversationFn(ctx, conv)
	}
	return nil, fmt.Errorf("not configured")
}

func (m *mockChatRepo) GetConversationByID(ctx context.Context, id int64) (*domain.Conversation, error) {
	if m.getConversationByIDFn != nil {
		return m.getConversationByIDFn(ctx, id)
	}
	return nil, fmt.Errorf("not configured")
}

func (m *mockChatRepo) FindDirectConversation(ctx context.Context, pA, pB string, hotelID *int) (*domain.Conversation, error) {
	if m.findDirectConversationFn != nil {
		return m.findDirectConversationFn(ctx, pA, pB, hotelID)
	}
	return nil, fmt.Errorf("not configured")
}

func (m *mockChatRepo) ListConversationsByUser(ctx context.Context, userID string, page, limit int) ([]*domain.Conversation, int, error) {
	if m.listConversationsByUserFn != nil {
		return m.listConversationsByUserFn(ctx, userID, page, limit)
	}
	return nil, 0, fmt.Errorf("not configured")
}

func (m *mockChatRepo) UpdateLastMessageAt(ctx context.Context, conversationID int64, at time.Time) error {
	if m.updateLastMessageAtFn != nil {
		return m.updateLastMessageAtFn(ctx, conversationID, at)
	}
	return nil // best-effort; default to success
}

func (m *mockChatRepo) CreateMessage(ctx context.Context, msg *domain.Message) (*domain.Message, error) {
	if m.createMessageFn != nil {
		return m.createMessageFn(ctx, msg)
	}
	return nil, fmt.Errorf("not configured")
}

func (m *mockChatRepo) ListMessagesByConversation(ctx context.Context, conversationID int64, beforeID *int64, limit int) ([]*domain.Message, error) {
	if m.listMessagesByConversationFn != nil {
		return m.listMessagesByConversationFn(ctx, conversationID, beforeID, limit)
	}
	return nil, fmt.Errorf("not configured")
}

func (m *mockChatRepo) MarkMessagesRead(ctx context.Context, conversationID int64, userID string) error {
	if m.markMessagesReadFn != nil {
		return m.markMessagesReadFn(ctx, conversationID, userID)
	}
	return nil
}

func (m *mockChatRepo) GetUnreadCountByConversation(ctx context.Context, conversationID int64, userID string) (int, error) {
	if m.getUnreadCountByConversationFn != nil {
		return m.getUnreadCountByConversationFn(ctx, conversationID, userID)
	}
	return 0, nil
}

func (m *mockChatRepo) GetTotalUnreadCount(ctx context.Context, userID string) (int, error) {
	if m.getTotalUnreadCountFn != nil {
		return m.getTotalUnreadCountFn(ctx, userID)
	}
	return 0, nil
}

func (m *mockChatRepo) GetLastMessage(ctx context.Context, conversationID int64) (*domain.Message, error) {
	if m.getLastMessageFn != nil {
		return m.getLastMessageFn(ctx, conversationID)
	}
	return nil, domain.ErrNotFound
}

// --- Mock HotelRepository (minimal; chat service only uses it for future ownership checks) ---

type mockHotelRepoForChat struct{}

func (m *mockHotelRepoForChat) CreateHotel(ctx context.Context, hotel *domain.Hotel) (*domain.Hotel, error) {
	return nil, nil
}
func (m *mockHotelRepoForChat) GetHotelByID(ctx context.Context, id int) (*domain.Hotel, error) {
	return nil, domain.ErrNotFound
}
func (m *mockHotelRepoForChat) ListApprovedHotels(ctx context.Context, page, limit int) ([]*domain.Hotel, int, error) {
	return nil, 0, nil
}
func (m *mockHotelRepoForChat) ListHotelsByOwner(ctx context.Context, ownerID string, page, limit int) ([]*domain.Hotel, int, error) {
	return nil, 0, nil
}
func (m *mockHotelRepoForChat) ListPendingHotels(ctx context.Context, page, limit int) ([]*domain.Hotel, int, error) {
	return nil, 0, nil
}
func (m *mockHotelRepoForChat) UpdateHotel(ctx context.Context, hotel *domain.Hotel) (*domain.Hotel, error) {
	return nil, nil
}
func (m *mockHotelRepoForChat) UpdateHotelStatus(ctx context.Context, id int, status domain.HotelStatus) error {
	return nil
}
func (m *mockHotelRepoForChat) DeleteHotel(ctx context.Context, id int, ownerID string) error {
	return nil
}

// --- Helpers ---

func sampleConv() *domain.Conversation {
	ownerID := "owner-1"
	return &domain.Conversation{
		ID:            1,
		Type:          domain.ConversationTypeDirect,
		ParticipantA:  "guest-1",
		ParticipantB:  &ownerID,
		LastMessageAt: time.Now(),
		CreatedAt:     time.Now(),
	}
}

func sampleMsg() *domain.Message {
	return &domain.Message{
		ID:             10,
		ConversationID: 1,
		SenderID:       "guest-1",
		Content:        "Hello!",
		IsRead:         false,
		CreatedAt:      time.Now(),
	}
}

func makeChatSvc(repo *mockChatRepo) *service.ChatService {
	return service.NewChatService(repo, &mockHotelRepoForChat{})
}

// --- Tests: GetOrCreateConversation ---

func TestChatService_GetOrCreateConversation_CreatesNew(t *testing.T) {
	repo := &mockChatRepo{
		findDirectConversationFn: func(_ context.Context, _, _ string, _ *int) (*domain.Conversation, error) {
			return nil, domain.ErrNotFound
		},
		createConversationFn: func(_ context.Context, c *domain.Conversation) (*domain.Conversation, error) {
			c.ID = 1
			return c, nil
		},
	}
	svc := makeChatSvc(repo)

	conv, err := svc.GetOrCreateConversation(context.Background(), "guest-1", domain.CreateConversationInput{
		ParticipantID: "owner-1",
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if conv.ID != 1 {
		t.Errorf("expected id 1, got %d", conv.ID)
	}
}

func TestChatService_GetOrCreateConversation_ReturnsExisting(t *testing.T) {
	existing := sampleConv()
	repo := &mockChatRepo{
		findDirectConversationFn: func(_ context.Context, _, _ string, _ *int) (*domain.Conversation, error) {
			return existing, nil
		},
	}
	svc := makeChatSvc(repo)

	conv, err := svc.GetOrCreateConversation(context.Background(), "guest-1", domain.CreateConversationInput{
		ParticipantID: "owner-1",
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if conv.ID != existing.ID {
		t.Errorf("expected existing conv id %d, got %d", existing.ID, conv.ID)
	}
}

func TestChatService_GetOrCreateConversation_SelfConversation_ReturnsBadRequest(t *testing.T) {
	svc := makeChatSvc(&mockChatRepo{})

	_, err := svc.GetOrCreateConversation(context.Background(), "user-1", domain.CreateConversationInput{
		ParticipantID: "user-1",
	})
	if !errors.Is(err, domain.ErrBadRequest) {
		t.Errorf("expected ErrBadRequest, got %v", err)
	}
}

func TestChatService_GetOrCreateConversation_EmptyParticipant_ReturnsBadRequest(t *testing.T) {
	svc := makeChatSvc(&mockChatRepo{})

	_, err := svc.GetOrCreateConversation(context.Background(), "user-1", domain.CreateConversationInput{
		ParticipantID: "",
	})
	if !errors.Is(err, domain.ErrBadRequest) {
		t.Errorf("expected ErrBadRequest, got %v", err)
	}
}

// --- Tests: SendMessage ---

func TestChatService_SendMessage_Success(t *testing.T) {
	repo := &mockChatRepo{
		getConversationByIDFn: func(_ context.Context, id int64) (*domain.Conversation, error) {
			return sampleConv(), nil
		},
		createMessageFn: func(_ context.Context, msg *domain.Message) (*domain.Message, error) {
			msg.ID = 10
			msg.IsRead = false
			msg.CreatedAt = time.Now()
			return msg, nil
		},
	}
	svc := makeChatSvc(repo)

	msg, err := svc.SendMessage(context.Background(), "guest-1", domain.SendMessageInput{
		ConversationID: 1,
		Content:        "Hello!",
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if msg.Content != "Hello!" {
		t.Errorf("expected content 'Hello!', got %q", msg.Content)
	}
}

func TestChatService_SendMessage_NotParticipant_ReturnsForbidden(t *testing.T) {
	repo := &mockChatRepo{
		getConversationByIDFn: func(_ context.Context, id int64) (*domain.Conversation, error) {
			return sampleConv(), nil // participants: guest-1, owner-1
		},
	}
	svc := makeChatSvc(repo)

	_, err := svc.SendMessage(context.Background(), "stranger-99", domain.SendMessageInput{
		ConversationID: 1,
		Content:        "Hello!",
	})
	if !errors.Is(err, domain.ErrForbidden) {
		t.Errorf("expected ErrForbidden, got %v", err)
	}
}

func TestChatService_SendMessage_EmptyContent_ReturnsBadRequest(t *testing.T) {
	svc := makeChatSvc(&mockChatRepo{})

	_, err := svc.SendMessage(context.Background(), "guest-1", domain.SendMessageInput{
		ConversationID: 1,
		Content:        "   ", // whitespace only
	})
	if !errors.Is(err, domain.ErrBadRequest) {
		t.Errorf("expected ErrBadRequest, got %v", err)
	}
}

func TestChatService_SendMessage_ContentTooLong_ReturnsBadRequest(t *testing.T) {
	svc := makeChatSvc(&mockChatRepo{})

	_, err := svc.SendMessage(context.Background(), "guest-1", domain.SendMessageInput{
		ConversationID: 1,
		Content:        strings.Repeat("a", 2001),
	})
	if !errors.Is(err, domain.ErrBadRequest) {
		t.Errorf("expected ErrBadRequest, got %v", err)
	}
}

func TestChatService_SendMessage_ConversationNotFound_ReturnsNotFound(t *testing.T) {
	repo := &mockChatRepo{
		getConversationByIDFn: func(_ context.Context, id int64) (*domain.Conversation, error) {
			return nil, domain.ErrNotFound
		},
	}
	svc := makeChatSvc(repo)

	_, err := svc.SendMessage(context.Background(), "guest-1", domain.SendMessageInput{
		ConversationID: 999,
		Content:        "Hello",
	})
	if !errors.Is(err, domain.ErrNotFound) {
		t.Errorf("expected ErrNotFound, got %v", err)
	}
}

// --- Tests: ListConversations ---

func TestChatService_ListConversations_Paginated(t *testing.T) {
	convs := []*domain.Conversation{sampleConv()}
	repo := &mockChatRepo{
		listConversationsByUserFn: func(_ context.Context, userID string, page, limit int) ([]*domain.Conversation, int, error) {
			if userID != "guest-1" {
				t.Errorf("unexpected userID %q", userID)
			}
			return convs, 1, nil
		},
	}
	svc := makeChatSvc(repo)

	result, total, err := svc.ListConversations(context.Background(), "guest-1", 1, 20)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if total != 1 {
		t.Errorf("expected total 1, got %d", total)
	}
	if len(result) != 1 {
		t.Errorf("expected 1 conversation, got %d", len(result))
	}
}

// --- Tests: ListMessages ---

func TestChatService_ListMessages_CursorPagination(t *testing.T) {
	msgs := []*domain.Message{sampleMsg()}
	beforeID := int64(99)
	repo := &mockChatRepo{
		getConversationByIDFn: func(_ context.Context, id int64) (*domain.Conversation, error) {
			return sampleConv(), nil
		},
		listMessagesByConversationFn: func(_ context.Context, convID int64, bID *int64, limit int) ([]*domain.Message, error) {
			if bID == nil || *bID != 99 {
				t.Errorf("expected beforeID 99, got %v", bID)
			}
			return msgs, nil
		},
	}
	svc := makeChatSvc(repo)

	result, err := svc.ListMessages(context.Background(), 1, "guest-1", &beforeID, 50)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(result) != 1 {
		t.Errorf("expected 1 message, got %d", len(result))
	}
}

func TestChatService_ListMessages_NotParticipant_ReturnsForbidden(t *testing.T) {
	repo := &mockChatRepo{
		getConversationByIDFn: func(_ context.Context, id int64) (*domain.Conversation, error) {
			return sampleConv(), nil
		},
	}
	svc := makeChatSvc(repo)

	_, err := svc.ListMessages(context.Background(), 1, "stranger", nil, 50)
	if !errors.Is(err, domain.ErrForbidden) {
		t.Errorf("expected ErrForbidden, got %v", err)
	}
}

// --- Tests: MarkConversationRead ---

func TestChatService_MarkConversationRead_Success(t *testing.T) {
	marked := false
	repo := &mockChatRepo{
		getConversationByIDFn: func(_ context.Context, id int64) (*domain.Conversation, error) {
			return sampleConv(), nil
		},
		markMessagesReadFn: func(_ context.Context, convID int64, userID string) error {
			marked = true
			return nil
		},
	}
	svc := makeChatSvc(repo)

	if err := svc.MarkConversationRead(context.Background(), 1, "guest-1"); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !marked {
		t.Error("expected MarkMessagesRead to be called")
	}
}

func TestChatService_MarkConversationRead_NotParticipant_ReturnsForbidden(t *testing.T) {
	repo := &mockChatRepo{
		getConversationByIDFn: func(_ context.Context, id int64) (*domain.Conversation, error) {
			return sampleConv(), nil
		},
	}
	svc := makeChatSvc(repo)

	err := svc.MarkConversationRead(context.Background(), 1, "stranger")
	if !errors.Is(err, domain.ErrForbidden) {
		t.Errorf("expected ErrForbidden, got %v", err)
	}
}

// --- Tests: GetTotalUnreadCount ---

func TestChatService_GetTotalUnreadCount(t *testing.T) {
	repo := &mockChatRepo{
		getTotalUnreadCountFn: func(_ context.Context, userID string) (int, error) {
			return 7, nil
		},
	}
	svc := makeChatSvc(repo)

	count, err := svc.GetTotalUnreadCount(context.Background(), "guest-1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if count != 7 {
		t.Errorf("expected 7, got %d", count)
	}
}

// --- Tests: GetConversationByID ---

func TestChatService_GetConversationByID_Success(t *testing.T) {
	repo := &mockChatRepo{
		getConversationByIDFn: func(_ context.Context, id int64) (*domain.Conversation, error) {
			return sampleConv(), nil
		},
	}
	svc := makeChatSvc(repo)

	conv, err := svc.GetConversationByID(context.Background(), 1, "guest-1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if conv.ID != 1 {
		t.Errorf("expected id 1, got %d", conv.ID)
	}
}

func TestChatService_GetConversationByID_NotParticipant_ReturnsForbidden(t *testing.T) {
	repo := &mockChatRepo{
		getConversationByIDFn: func(_ context.Context, id int64) (*domain.Conversation, error) {
			return sampleConv(), nil
		},
	}
	svc := makeChatSvc(repo)

	_, err := svc.GetConversationByID(context.Background(), 1, "stranger")
	if !errors.Is(err, domain.ErrForbidden) {
		t.Errorf("expected ErrForbidden, got %v", err)
	}
}
