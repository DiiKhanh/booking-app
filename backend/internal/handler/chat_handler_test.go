package handler_test

import (
	"booking-app/internal/domain"
	"booking-app/internal/handler"
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
)

// --- Mock ChatService ---

type mockChatSvc struct {
	getOrCreateConversationFn func(ctx context.Context, senderID string, input domain.CreateConversationInput) (*domain.Conversation, error)
	sendMessageFn             func(ctx context.Context, senderID string, input domain.SendMessageInput) (*domain.Message, error)
	listConversationsFn       func(ctx context.Context, userID string, page, limit int) ([]*domain.Conversation, int, error)
	listMessagesFn            func(ctx context.Context, conversationID int64, userID string, beforeID *int64, limit int) ([]*domain.Message, error)
	markConversationReadFn    func(ctx context.Context, conversationID int64, userID string) error
	getTotalUnreadCountFn     func(ctx context.Context, userID string) (int, error)
	getConversationByIDFn     func(ctx context.Context, id int64, userID string) (*domain.Conversation, error)
}

func (m *mockChatSvc) GetOrCreateConversation(ctx context.Context, senderID string, input domain.CreateConversationInput) (*domain.Conversation, error) {
	if m.getOrCreateConversationFn != nil {
		return m.getOrCreateConversationFn(ctx, senderID, input)
	}
	return nil, fmt.Errorf("not configured")
}

func (m *mockChatSvc) SendMessage(ctx context.Context, senderID string, input domain.SendMessageInput) (*domain.Message, error) {
	if m.sendMessageFn != nil {
		return m.sendMessageFn(ctx, senderID, input)
	}
	return nil, fmt.Errorf("not configured")
}

func (m *mockChatSvc) ListConversations(ctx context.Context, userID string, page, limit int) ([]*domain.Conversation, int, error) {
	if m.listConversationsFn != nil {
		return m.listConversationsFn(ctx, userID, page, limit)
	}
	return nil, 0, fmt.Errorf("not configured")
}

func (m *mockChatSvc) ListMessages(ctx context.Context, conversationID int64, userID string, beforeID *int64, limit int) ([]*domain.Message, error) {
	if m.listMessagesFn != nil {
		return m.listMessagesFn(ctx, conversationID, userID, beforeID, limit)
	}
	return nil, fmt.Errorf("not configured")
}

func (m *mockChatSvc) MarkConversationRead(ctx context.Context, conversationID int64, userID string) error {
	if m.markConversationReadFn != nil {
		return m.markConversationReadFn(ctx, conversationID, userID)
	}
	return nil
}

func (m *mockChatSvc) GetTotalUnreadCount(ctx context.Context, userID string) (int, error) {
	if m.getTotalUnreadCountFn != nil {
		return m.getTotalUnreadCountFn(ctx, userID)
	}
	return 0, fmt.Errorf("not configured")
}

func (m *mockChatSvc) GetConversationByID(ctx context.Context, id int64, userID string) (*domain.Conversation, error) {
	if m.getConversationByIDFn != nil {
		return m.getConversationByIDFn(ctx, id, userID)
	}
	return nil, fmt.Errorf("not configured")
}

// --- Test helpers ---

func setupChatRouter(svc *mockChatSvc, userID string) *gin.Engine {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	h := handler.NewChatHandler(svc, handler.NewHub())

	auth := func(c *gin.Context) {
		c.Set("userID", userID)
		c.Next()
	}

	r.POST("/api/v1/conversations", auth, h.CreateConversation)
	r.GET("/api/v1/conversations", auth, h.ListConversations)
	r.GET("/api/v1/conversations/:id/messages", auth, h.ListMessages)
	r.POST("/api/v1/conversations/:id/messages", auth, h.SendMessage)
	r.PUT("/api/v1/conversations/:id/read", auth, h.MarkRead)
	r.GET("/api/v1/chat/unread-count", auth, h.UnreadCount)
	return r
}

func sampleChatConv() *domain.Conversation {
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

func sampleChatMsg() *domain.Message {
	return &domain.Message{
		ID:             10,
		ConversationID: 1,
		SenderID:       "guest-1",
		Content:        "Hello!",
		IsRead:         false,
		CreatedAt:      time.Now(),
	}
}

// --- Tests: CreateConversation ---

func TestChatHandler_CreateConversation_Returns200(t *testing.T) {
	svc := &mockChatSvc{
		getOrCreateConversationFn: func(_ context.Context, _ string, _ domain.CreateConversationInput) (*domain.Conversation, error) {
			return sampleChatConv(), nil
		},
	}
	r := setupChatRouter(svc, "guest-1")

	body := `{"participant_id":"owner-1"}`
	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/v1/conversations", bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d — body: %s", w.Code, w.Body.String())
	}
}

func TestChatHandler_CreateConversation_MissingParticipantID_Returns400(t *testing.T) {
	svc := &mockChatSvc{}
	r := setupChatRouter(svc, "guest-1")

	body := `{}`
	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/v1/conversations", bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestChatHandler_CreateConversation_ServiceBadRequest_Returns400(t *testing.T) {
	svc := &mockChatSvc{
		getOrCreateConversationFn: func(_ context.Context, _ string, _ domain.CreateConversationInput) (*domain.Conversation, error) {
			return nil, domain.ErrBadRequest
		},
	}
	r := setupChatRouter(svc, "guest-1")

	body := `{"participant_id":"guest-1"}`
	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/v1/conversations", bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

// --- Tests: ListConversations ---

func TestChatHandler_ListConversations_Returns200(t *testing.T) {
	svc := &mockChatSvc{
		listConversationsFn: func(_ context.Context, _ string, _, _ int) ([]*domain.Conversation, int, error) {
			return []*domain.Conversation{sampleChatConv()}, 1, nil
		},
	}
	r := setupChatRouter(svc, "guest-1")

	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/conversations", nil)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d — body: %s", w.Code, w.Body.String())
	}

	var resp map[string]interface{}
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("invalid JSON: %v", err)
	}
	if resp["meta"] == nil {
		t.Error("expected meta in response")
	}
}

func TestChatHandler_ListConversations_ServiceError_Returns500(t *testing.T) {
	svc := &mockChatSvc{
		listConversationsFn: func(_ context.Context, _ string, _, _ int) ([]*domain.Conversation, int, error) {
			return nil, 0, errors.New("db error")
		},
	}
	r := setupChatRouter(svc, "guest-1")

	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/conversations", nil)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusInternalServerError {
		t.Errorf("expected 500, got %d", w.Code)
	}
}

// --- Tests: ListMessages ---

func TestChatHandler_ListMessages_Returns200(t *testing.T) {
	svc := &mockChatSvc{
		listMessagesFn: func(_ context.Context, convID int64, userID string, beforeID *int64, limit int) ([]*domain.Message, error) {
			return []*domain.Message{sampleChatMsg()}, nil
		},
	}
	r := setupChatRouter(svc, "guest-1")

	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/conversations/1/messages", nil)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d — body: %s", w.Code, w.Body.String())
	}
}

func TestChatHandler_ListMessages_InvalidID_Returns400(t *testing.T) {
	svc := &mockChatSvc{}
	r := setupChatRouter(svc, "guest-1")

	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/conversations/abc/messages", nil)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestChatHandler_ListMessages_Forbidden_Returns403(t *testing.T) {
	svc := &mockChatSvc{
		listMessagesFn: func(_ context.Context, _ int64, _ string, _ *int64, _ int) ([]*domain.Message, error) {
			return nil, domain.ErrForbidden
		},
	}
	r := setupChatRouter(svc, "stranger")

	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/conversations/1/messages", nil)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusForbidden {
		t.Errorf("expected 403, got %d", w.Code)
	}
}

// --- Tests: SendMessage ---

func TestChatHandler_SendMessage_Returns201(t *testing.T) {
	svc := &mockChatSvc{
		sendMessageFn: func(_ context.Context, _ string, _ domain.SendMessageInput) (*domain.Message, error) {
			return sampleChatMsg(), nil
		},
		getConversationByIDFn: func(_ context.Context, _ int64, _ string) (*domain.Conversation, error) {
			return sampleChatConv(), nil
		},
	}
	r := setupChatRouter(svc, "guest-1")

	body := `{"content":"Hello!"}`
	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/v1/conversations/1/messages", bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w, req)

	if w.Code != http.StatusCreated {
		t.Errorf("expected 201, got %d — body: %s", w.Code, w.Body.String())
	}
}

func TestChatHandler_SendMessage_MissingContent_Returns400(t *testing.T) {
	svc := &mockChatSvc{}
	r := setupChatRouter(svc, "guest-1")

	body := `{}`
	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/v1/conversations/1/messages", bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

// --- Tests: MarkRead ---

func TestChatHandler_MarkRead_Returns200(t *testing.T) {
	svc := &mockChatSvc{
		markConversationReadFn: func(_ context.Context, _ int64, _ string) error {
			return nil
		},
	}
	r := setupChatRouter(svc, "guest-1")

	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPut, "/api/v1/conversations/1/read", nil)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d — body: %s", w.Code, w.Body.String())
	}
}

func TestChatHandler_MarkRead_Forbidden_Returns403(t *testing.T) {
	svc := &mockChatSvc{
		markConversationReadFn: func(_ context.Context, _ int64, _ string) error {
			return domain.ErrForbidden
		},
	}
	r := setupChatRouter(svc, "stranger")

	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPut, "/api/v1/conversations/1/read", nil)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusForbidden {
		t.Errorf("expected 403, got %d", w.Code)
	}
}

// --- Tests: UnreadCount ---

func TestChatHandler_UnreadCount_Returns200(t *testing.T) {
	svc := &mockChatSvc{
		getTotalUnreadCountFn: func(_ context.Context, _ string) (int, error) {
			return 5, nil
		},
	}
	r := setupChatRouter(svc, "guest-1")

	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/chat/unread-count", nil)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d — body: %s", w.Code, w.Body.String())
	}

	var resp map[string]interface{}
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("invalid JSON: %v", err)
	}
	data, ok := resp["data"].(map[string]interface{})
	if !ok {
		t.Fatalf("expected data object, got %T", resp["data"])
	}
	count, ok := data["count"].(float64)
	if !ok {
		t.Fatalf("expected count number, got %T", data["count"])
	}
	if count != 5 {
		t.Errorf("expected 5, got %v", count)
	}
}

func TestChatHandler_UnreadCount_ServiceError_Returns500(t *testing.T) {
	svc := &mockChatSvc{
		getTotalUnreadCountFn: func(_ context.Context, _ string) (int, error) {
			return 0, errors.New("db error")
		},
	}
	r := setupChatRouter(svc, "guest-1")

	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/chat/unread-count", nil)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusInternalServerError {
		t.Errorf("expected 500, got %d", w.Code)
	}
}
