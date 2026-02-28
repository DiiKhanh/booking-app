package handler

import (
	tokenpkg "booking-app/internal/infrastructure/jwt"
	"encoding/json"
	"net/http"
	"sync"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

// WSMessage is the JSON envelope sent over the WebSocket connection.
type WSMessage struct {
	Type    string         `json:"type"`
	Payload map[string]any `json:"payload,omitempty"`
}

// Hub manages active WebSocket connections per user.
type Hub struct {
	mu      sync.RWMutex
	clients map[string]map[*websocket.Conn]struct{} // userID -> set of conns
}

// NewHub creates an empty Hub.
func NewHub() *Hub {
	return &Hub{
		clients: make(map[string]map[*websocket.Conn]struct{}),
	}
}

// Register adds a connection to the hub for the given user.
func (h *Hub) Register(userID string, conn *websocket.Conn) {
	h.mu.Lock()
	defer h.mu.Unlock()

	if h.clients[userID] == nil {
		h.clients[userID] = make(map[*websocket.Conn]struct{})
	}
	h.clients[userID][conn] = struct{}{}
}

// Unregister removes a connection from the hub. Cleans up the user entry when empty.
func (h *Hub) Unregister(userID string, conn *websocket.Conn) {
	h.mu.Lock()
	defer h.mu.Unlock()

	conns, ok := h.clients[userID]
	if !ok {
		return
	}
	delete(conns, conn)
	if len(conns) == 0 {
		delete(h.clients, userID)
	}
}

// Broadcast sends msg to all active connections for userID.
// Individual write errors are ignored so one bad connection does not stop others.
func (h *Hub) Broadcast(userID string, msg []byte) {
	h.mu.RLock()
	conns := h.clients[userID]
	h.mu.RUnlock()

	for conn := range conns {
		if conn == nil {
			continue
		}
		// Best-effort write; ignore error.
		_ = conn.WriteMessage(websocket.TextMessage, msg)
	}
}

// HasUser reports whether any connection is registered for userID.
// Exposed for testing only.
func (h *Hub) HasUser(userID string) bool {
	h.mu.RLock()
	defer h.mu.RUnlock()

	conns, ok := h.clients[userID]
	return ok && len(conns) > 0
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
}

// NewWSHandler creates a WSHandler wired to the given Hub and token manager.
func NewWSHandler(hub *Hub, tokenMgr *tokenpkg.TokenManager) *WSHandler {
	return &WSHandler{
		hub:      hub,
		tokenMgr: tokenMgr,
		upgrader: websocket.Upgrader{
			CheckOrigin: func(r *http.Request) bool {
				// Origin check is handled by the Gin CORS middleware upstream.
				return true
			},
		},
	}
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
		// Upgrade already writes an HTTP error response on failure.
		return
	}

	h.hub.Register(userID, conn)
	defer func() {
		h.hub.Unregister(userID, conn)
		conn.Close()
	}()

	// Send welcome message.
	welcome := WSMessage{
		Type:    "connected",
		Payload: map[string]any{"user_id": userID},
	}
	if raw, err := json.Marshal(welcome); err == nil {
		_ = conn.WriteMessage(websocket.TextMessage, raw)
	}

	// Read loop: keep alive until client disconnects.
	for {
		_, _, err := conn.ReadMessage()
		if err != nil {
			// Any read error (close frame, network drop) exits the loop.
			break
		}
	}
}
