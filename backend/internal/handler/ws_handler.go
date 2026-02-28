package handler

import (
	"booking-app/internal/domain"
	tokenpkg "booking-app/internal/infrastructure/jwt"
	"context"
	"encoding/json"
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

// WSMessage is the JSON envelope sent over the WebSocket connection.
type WSMessage struct {
	Type    string         `json:"type"`
	Payload map[string]any `json:"payload,omitempty"`
}

// connEntry pairs a WebSocket connection with a per-connection write mutex.
// gorilla/websocket is not concurrent-safe for writes; the mutex serialises them.
type connEntry struct {
	conn *websocket.Conn
	mu   sync.Mutex
}

// write acquires the write mutex and sends a raw text frame.
// Returns nil without writing if the underlying connection is nil (test stand-ins).
func (e *connEntry) write(data []byte) error {
	if e.conn == nil {
		return nil
	}
	e.mu.Lock()
	defer e.mu.Unlock()
	return e.conn.WriteMessage(websocket.TextMessage, data)
}

// Hub manages active WebSocket connections per user.
type Hub struct {
	mu      sync.RWMutex
	clients map[string]map[*connEntry]struct{} // userID -> set of entries
}

// NewHub creates an empty Hub.
func NewHub() *Hub {
	return &Hub{
		clients: make(map[string]map[*connEntry]struct{}),
	}
}

// register adds a connection entry to the hub for the given user.
func (h *Hub) register(userID string, entry *connEntry) {
	h.mu.Lock()
	defer h.mu.Unlock()

	if h.clients[userID] == nil {
		h.clients[userID] = make(map[*connEntry]struct{})
	}
	h.clients[userID][entry] = struct{}{}
}

// unregister removes a connection entry from the hub.
func (h *Hub) unregister(userID string, entry *connEntry) {
	h.mu.Lock()
	defer h.mu.Unlock()

	entries, ok := h.clients[userID]
	if !ok {
		return
	}
	delete(entries, entry)
	if len(entries) == 0 {
		delete(h.clients, userID)
	}
}

// Register adds a raw WebSocket connection (kept for backward-compat with existing tests).
func (h *Hub) Register(userID string, conn *websocket.Conn) {
	h.register(userID, &connEntry{conn: conn})
}

// Unregister removes a raw WebSocket connection (kept for backward-compat with existing tests).
func (h *Hub) Unregister(userID string, conn *websocket.Conn) {
	h.mu.Lock()
	defer h.mu.Unlock()

	entries, ok := h.clients[userID]
	if !ok {
		return
	}
	for e := range entries {
		if e.conn == conn {
			delete(entries, e)
			break
		}
	}
	if len(entries) == 0 {
		delete(h.clients, userID)
	}
}

// Broadcast sends msg to all active connections for userID.
// Individual write errors are ignored so one bad connection does not stop others.
func (h *Hub) Broadcast(userID string, msg []byte) {
	h.mu.RLock()
	entries := h.clients[userID]
	h.mu.RUnlock()

	for e := range entries {
		_ = e.write(msg)
	}
}

// BroadcastAll sends msg to every currently connected user.
func (h *Hub) BroadcastAll(msg []byte) {
	h.mu.RLock()
	all := make([]*connEntry, 0)
	for _, entries := range h.clients {
		for e := range entries {
			all = append(all, e)
		}
	}
	h.mu.RUnlock()

	for _, e := range all {
		_ = e.write(msg)
	}
}

// HasUser reports whether any connection is registered for userID.
// Exposed for testing only.
func (h *Hub) HasUser(userID string) bool {
	h.mu.RLock()
	defer h.mu.RUnlock()

	entries, ok := h.clients[userID]
	return ok && len(entries) > 0
}

// ConnectionCount returns the number of active connections for userID.
// Exposed for testing only.
func (h *Hub) ConnectionCount(userID string) int {
	h.mu.RLock()
	defer h.mu.RUnlock()

	return len(h.clients[userID])
}

// --- WebSocket HTTP Handler ---

// WSHandler upgrades HTTP connections to WebSocket and manages their lifecycle.
type WSHandler struct {
	hub      *Hub
	upgrader websocket.Upgrader
	tokenMgr *tokenpkg.TokenManager
	chatSvc  ChatHandlerServiceInterface // optional; enables inbound chat message routing
}

// WSOption configures a WSHandler.
type WSOption func(*WSHandler)

// WithChatService wires a ChatService for inbound WS message routing.
func WithChatService(svc ChatHandlerServiceInterface) WSOption {
	return func(h *WSHandler) { h.chatSvc = svc }
}

// NewWSHandler creates a WSHandler wired to the given Hub and token manager.
func NewWSHandler(hub *Hub, tokenMgr *tokenpkg.TokenManager, opts ...WSOption) *WSHandler {
	h := &WSHandler{
		hub:      hub,
		tokenMgr: tokenMgr,
		upgrader: websocket.Upgrader{
			CheckOrigin: func(r *http.Request) bool {
				// Origin check is handled by the Gin CORS middleware upstream.
				return true
			},
		},
	}
	for _, o := range opts {
		o(h)
	}
	return h
}

// ServeWS handles GET /api/v1/ws/bookings.
// Auth: ?token=<jwt> query parameter (WebSocket clients cannot set custom headers easily).
func (h *WSHandler) ServeWS(c *gin.Context) {
	tokenStr := c.Query("token")
	if tokenStr == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "missing token"})
		return
	}

	claims, err := h.tokenMgr.ValidateAccessToken(tokenStr)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid token"})
		return
	}

	userID := claims.UserID

	conn, err := h.upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		return
	}

	entry := &connEntry{conn: conn}
	h.hub.register(userID, entry)
	defer func() {
		h.hub.unregister(userID, entry)
		conn.Close()
	}()

	// Send welcome message via the safe write method.
	welcome := WSMessage{
		Type:    "connected",
		Payload: map[string]any{"user_id": userID},
	}
	if raw, err := json.Marshal(welcome); err == nil {
		_ = entry.write(raw)
	}

	// Read loop: route inbound messages and keep the connection alive.
	for {
		_, data, err := conn.ReadMessage()
		if err != nil {
			break
		}
		if h.chatSvc != nil {
			h.routeInbound(userID, entry, data)
		}
	}
}

// routeInbound parses an inbound WS frame and dispatches by type.
func (h *WSHandler) routeInbound(userID string, entry *connEntry, data []byte) {
	var msg WSMessage
	if err := json.Unmarshal(data, &msg); err != nil {
		return
	}

	switch msg.Type {
	case "chat.send":
		h.handleChatSend(userID, entry, msg.Payload)
	case "chat.typing":
		h.handleChatTyping(userID, msg.Payload)
	case "chat.read":
		h.handleChatRead(userID, msg.Payload)
	}
}

// handleChatSend processes a {type:"chat.send", payload:{conversation_id, content}} frame.
func (h *WSHandler) handleChatSend(userID string, entry *connEntry, payload map[string]any) {
	convIDFloat, ok := payload["conversation_id"].(float64)
	if !ok {
		return
	}
	content, ok := payload["content"].(string)
	if !ok || content == "" {
		return
	}
	convID := int64(convIDFloat)

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	msg, err := h.chatSvc.SendMessage(ctx, userID, domain.SendMessageInput{
		ConversationID: convID,
		Content:        content,
	})
	if err != nil {
		h.sendWSError(entry, "chat.send.error", err.Error())
		return
	}

	// Build the outbound frame once and reuse it.
	ack := WSMessage{
		Type: "chat.message",
		Payload: map[string]any{
			"id":              msg.ID,
			"conversation_id": msg.ConversationID,
			"sender_id":       msg.SenderID,
			"content":         msg.Content,
			"created_at":      msg.CreatedAt,
		},
	}
	raw, err := json.Marshal(ack)
	if err != nil {
		return
	}

	// Echo back to the sender's connection.
	_ = entry.write(raw)

	// Forward to the other participant(s).
	h.broadcastToOthers(convID, userID, raw)
}

// handleChatTyping forwards a typing indicator to the other participant.
func (h *WSHandler) handleChatTyping(senderID string, payload map[string]any) {
	convIDFloat, ok := payload["conversation_id"].(float64)
	if !ok {
		return
	}
	convID := int64(convIDFloat)

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	conv, err := h.chatSvc.GetConversationByID(ctx, convID, senderID)
	if err != nil {
		return
	}

	wsMsg := WSMessage{
		Type:    "chat.typing",
		Payload: map[string]any{"conversation_id": convID, "user_id": senderID},
	}
	raw, err := json.Marshal(wsMsg)
	if err != nil {
		return
	}
	h.broadcastConvOthers(conv, senderID, raw)
}

// handleChatRead marks a conversation as read and notifies the other participant.
func (h *WSHandler) handleChatRead(userID string, payload map[string]any) {
	convIDFloat, ok := payload["conversation_id"].(float64)
	if !ok {
		return
	}
	convID := int64(convIDFloat)

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := h.chatSvc.MarkConversationRead(ctx, convID, userID); err != nil {
		return
	}

	conv, err := h.chatSvc.GetConversationByID(ctx, convID, userID)
	if err != nil {
		return
	}

	wsMsg := WSMessage{
		Type:    "chat.read",
		Payload: map[string]any{"conversation_id": convID, "user_id": userID},
	}
	raw, err := json.Marshal(wsMsg)
	if err != nil {
		return
	}
	h.broadcastConvOthers(conv, userID, raw)
}

// broadcastToOthers fetches the conversation and broadcasts raw to non-sender participants.
func (h *WSHandler) broadcastToOthers(convID int64, senderID string, raw []byte) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	conv, err := h.chatSvc.GetConversationByID(ctx, convID, senderID)
	if err != nil {
		return
	}
	h.broadcastConvOthers(conv, senderID, raw)
}

// broadcastConvOthers sends raw to every participant of conv except senderID.
func (h *WSHandler) broadcastConvOthers(conv *domain.Conversation, senderID string, raw []byte) {
	if conv.ParticipantA != senderID {
		h.hub.Broadcast(conv.ParticipantA, raw)
	}
	if conv.ParticipantB != nil && *conv.ParticipantB != senderID {
		h.hub.Broadcast(*conv.ParticipantB, raw)
	}
}

// sendWSError sends an error frame back to the requesting connection.
func (h *WSHandler) sendWSError(entry *connEntry, msgType, errMsg string) {
	frame := WSMessage{
		Type:    msgType,
		Payload: map[string]any{"error": errMsg},
	}
	if raw, err := json.Marshal(frame); err == nil {
		_ = entry.write(raw)
	}
}
