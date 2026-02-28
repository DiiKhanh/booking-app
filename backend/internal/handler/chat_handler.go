package handler

import (
	"booking-app/internal/domain"
	"booking-app/internal/dto/request"
	"booking-app/internal/dto/response"
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
)

// ChatHandlerServiceInterface defines what the chat handler needs from the service layer.
type ChatHandlerServiceInterface interface {
	GetOrCreateConversation(ctx context.Context, senderID string, input domain.CreateConversationInput) (*domain.Conversation, error)
	SendMessage(ctx context.Context, senderID string, input domain.SendMessageInput) (*domain.Message, error)
	ListConversations(ctx context.Context, userID string, page, limit int) ([]*domain.Conversation, int, error)
	ListMessages(ctx context.Context, conversationID int64, userID string, beforeID *int64, limit int) ([]*domain.Message, error)
	MarkConversationRead(ctx context.Context, conversationID int64, userID string) error
	GetTotalUnreadCount(ctx context.Context, userID string) (int, error)
	GetConversationByID(ctx context.Context, id int64, userID string) (*domain.Conversation, error)
}

// ChatHandler handles HTTP requests for chat endpoints.
type ChatHandler struct {
	svc ChatHandlerServiceInterface
	hub *Hub
}

// NewChatHandler creates a new ChatHandler wired to the given service and Hub.
func NewChatHandler(svc ChatHandlerServiceInterface, hub *Hub) *ChatHandler {
	return &ChatHandler{svc: svc, hub: hub}
}

// CreateConversation handles POST /api/v1/conversations.
// Gets an existing conversation or creates a new one between two participants.
func (h *ChatHandler) CreateConversation(c *gin.Context) {
	userID := getUserIDFromContext(c)

	var req request.CreateConversationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, response.Fail(err.Error()))
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	conv, err := h.svc.GetOrCreateConversation(ctx, userID, domain.CreateConversationInput{
		HotelID:       req.HotelID,
		BookingID:     req.BookingID,
		ParticipantID: req.ParticipantID,
	})
	if err != nil {
		handleChatError(c, err)
		return
	}

	c.JSON(http.StatusOK, response.OK(response.NewConversationResponse(conv)))
}

// ListConversations handles GET /api/v1/conversations.
func (h *ChatHandler) ListConversations(c *gin.Context) {
	userID := getUserIDFromContext(c)
	page := queryIntDefault(c, "page", 1)
	limit := queryIntDefault(c, "limit", 20)

	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	convs, total, err := h.svc.ListConversations(ctx, userID, page, limit)
	if err != nil {
		handleChatError(c, err)
		return
	}

	out := make([]*response.ConversationResponse, len(convs))
	for i, conv := range convs {
		out[i] = response.NewConversationResponse(conv)
	}

	pages := calculatePages(total, limit)
	c.JSON(http.StatusOK, response.OKList(out, response.Meta{Total: total, Page: page, Limit: limit, Pages: pages}))
}

// ListMessages handles GET /api/v1/conversations/:id/messages.
// Supports cursor-based pagination via the ?before_id query parameter.
func (h *ChatHandler) ListMessages(c *gin.Context) {
	userID := getUserIDFromContext(c)

	convID, err := parseInt64Param(c, "id")
	if err != nil {
		c.JSON(http.StatusBadRequest, response.Fail("invalid conversation id"))
		return
	}

	limit := queryIntDefault(c, "limit", 50)
	var beforeID *int64
	if raw := c.Query("before_id"); raw != "" {
		parsed, err := strconv.ParseInt(raw, 10, 64)
		if err != nil {
			c.JSON(http.StatusBadRequest, response.Fail("invalid before_id"))
			return
		}
		beforeID = &parsed
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	msgs, err := h.svc.ListMessages(ctx, convID, userID, beforeID, limit)
	if err != nil {
		handleChatError(c, err)
		return
	}

	c.JSON(http.StatusOK, response.OK(response.NewMessageListResponse(msgs)))
}

// SendMessage handles POST /api/v1/conversations/:id/messages.
// Persists the message and broadcasts it to the other participant via WebSocket.
func (h *ChatHandler) SendMessage(c *gin.Context) {
	userID := getUserIDFromContext(c)

	convID, err := parseInt64Param(c, "id")
	if err != nil {
		c.JSON(http.StatusBadRequest, response.Fail("invalid conversation id"))
		return
	}

	var req request.SendMessageRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, response.Fail(err.Error()))
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	msg, err := h.svc.SendMessage(ctx, userID, domain.SendMessageInput{
		ConversationID: convID,
		Content:        req.Content,
	})
	if err != nil {
		handleChatError(c, err)
		return
	}

	// Broadcast to the other participant asynchronously.
	go h.broadcastNewMessage(msg, userID)

	c.JSON(http.StatusCreated, response.OK(response.NewMessageResponse(msg)))
}

// MarkRead handles PUT /api/v1/conversations/:id/read.
func (h *ChatHandler) MarkRead(c *gin.Context) {
	userID := getUserIDFromContext(c)

	convID, err := parseInt64Param(c, "id")
	if err != nil {
		c.JSON(http.StatusBadRequest, response.Fail("invalid conversation id"))
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	if err := h.svc.MarkConversationRead(ctx, convID, userID); err != nil {
		handleChatError(c, err)
		return
	}

	c.JSON(http.StatusOK, response.OK(gin.H{"marked_read": true}))
}

// UnreadCount handles GET /api/v1/chat/unread-count.
func (h *ChatHandler) UnreadCount(c *gin.Context) {
	userID := getUserIDFromContext(c)

	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	count, err := h.svc.GetTotalUnreadCount(ctx, userID)
	if err != nil {
		handleChatError(c, err)
		return
	}

	c.JSON(http.StatusOK, response.OK(response.UnreadCountResponse{Count: count}))
}

// BroadcastAnnouncement handles POST /api/v1/admin/broadcast.
// Sends a platform-wide announcement to all connected WebSocket clients.
func (h *ChatHandler) BroadcastAnnouncement(c *gin.Context) {
	var req request.BroadcastAnnouncementRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, response.Fail(err.Error()))
		return
	}

	wsMsg := WSMessage{
		Type: "chat.announcement",
		Payload: map[string]any{
			"content":    req.Content,
			"created_at": time.Now(),
		},
	}
	raw, err := json.Marshal(wsMsg)
	if err != nil {
		c.JSON(http.StatusInternalServerError, response.Fail("internal server error"))
		return
	}

	h.hub.BroadcastAll(raw)

	c.JSON(http.StatusOK, response.OK(gin.H{"broadcast": true}))
}

// broadcastNewMessage sends a chat.message WS event to the other participant(s).
func (h *ChatHandler) broadcastNewMessage(msg *domain.Message, senderID string) {
	wsMsg := WSMessage{
		Type: "chat.message",
		Payload: map[string]any{
			"id":              msg.ID,
			"conversation_id": msg.ConversationID,
			"sender_id":       msg.SenderID,
			"content":         msg.Content,
			"created_at":      msg.CreatedAt,
		},
	}
	raw, err := json.Marshal(wsMsg)
	if err != nil {
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	conv, err := h.svc.GetConversationByID(ctx, msg.ConversationID, senderID)
	if err != nil {
		return
	}

	if conv.ParticipantA != senderID {
		h.hub.Broadcast(conv.ParticipantA, raw)
	}
	if conv.ParticipantB != nil && *conv.ParticipantB != senderID {
		h.hub.Broadcast(*conv.ParticipantB, raw)
	}
}

// handleChatError maps domain errors to HTTP status codes for chat endpoints.
func handleChatError(c *gin.Context, err error) {
	switch {
	case errors.Is(err, domain.ErrNotFound):
		c.JSON(http.StatusNotFound, response.Fail(err.Error()))
	case errors.Is(err, domain.ErrForbidden):
		c.JSON(http.StatusForbidden, response.Fail(err.Error()))
	case errors.Is(err, domain.ErrBadRequest):
		c.JSON(http.StatusBadRequest, response.Fail(err.Error()))
	default:
		c.JSON(http.StatusInternalServerError, response.Fail("internal server error"))
	}
}

// parseInt64Param parses a URL path parameter as int64.
func parseInt64Param(c *gin.Context, name string) (int64, error) {
	return strconv.ParseInt(c.Param(name), 10, 64)
}
