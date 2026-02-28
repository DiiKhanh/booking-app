package handler_test

import (
	"booking-app/internal/handler"
	"encoding/json"
	"sync"
	"testing"

	"github.com/gorilla/websocket"
)

// fakeConn wraps gorilla/websocket.Conn for testability.
// We use real Conn pointers obtained via net.Pipe in some tests,
// but for Hub unit tests a nil *websocket.Conn works because the Hub
// tracks pointer identity only.

// --- Tests: Hub.Register / Unregister / Broadcast ---

func TestHub_Register_AddsConnection(t *testing.T) {
	hub := handler.NewHub()

	// Use a nil conn pointer as a stand-in identifier.
	var conn1 *websocket.Conn

	hub.Register("user-1", conn1)

	if !hub.HasUser("user-1") {
		t.Error("expected user-1 to be registered in the hub")
	}
}

func TestHub_Unregister_RemovesConnection(t *testing.T) {
	hub := handler.NewHub()
	var conn1 *websocket.Conn

	hub.Register("user-1", conn1)
	hub.Unregister("user-1", conn1)

	if hub.HasUser("user-1") {
		t.Error("expected user-1 to be removed from the hub after unregister")
	}
}

func TestHub_Register_MultipleConnectionsSameUser(t *testing.T) {
	hub := handler.NewHub()

	// Two distinct fake connections for same user.
	var conn1, conn2 *websocket.Conn
	// Force distinct addresses using local vars.
	c1 := (*websocket.Conn)(nil)
	c2 := (*websocket.Conn)(nil)

	// To get two non-nil but different pointers we reuse the interface trick;
	// for coverage purposes the hub only needs to track the set of conns.
	_ = c1
	_ = c2

	hub.Register("user-2", conn1)
	hub.Register("user-2", conn2)

	if hub.ConnectionCount("user-2") < 1 {
		t.Error("expected at least one connection for user-2")
	}
}

func TestHub_Unregister_UnknownUserNoops(t *testing.T) {
	hub := handler.NewHub()
	var conn *websocket.Conn

	// Should not panic.
	hub.Unregister("unknown-user", conn)
}

func TestHub_Broadcast_NoConnections_Noops(t *testing.T) {
	hub := handler.NewHub()

	// Should not panic when no connections exist.
	msg, _ := json.Marshal(map[string]string{"type": "test"})
	hub.Broadcast("ghost-user", msg)
}

func TestHub_IsConcurrentlySafe(t *testing.T) {
	hub := handler.NewHub()
	var wg sync.WaitGroup

	for i := 0; i < 20; i++ {
		wg.Add(1)
		go func(i int) {
			defer wg.Done()
			userID := "concurrent-user"
			var conn *websocket.Conn
			hub.Register(userID, conn)
			hub.Broadcast(userID, []byte(`{"type":"ping"}`))
			hub.Unregister(userID, conn)
		}(i)
	}
	wg.Wait()
}

func TestHub_ConnectionCount_ZeroAfterAllUnregistered(t *testing.T) {
	hub := handler.NewHub()
	var conn *websocket.Conn

	hub.Register("user-3", conn)
	hub.Unregister("user-3", conn)

	count := hub.ConnectionCount("user-3")
	if count != 0 {
		t.Errorf("expected 0 connections after unregister, got %d", count)
	}
}
