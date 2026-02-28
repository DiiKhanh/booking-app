/**
 * useRealtimeConnection
 *
 * Manages the authenticated WebSocket connection to the booking updates endpoint.
 * - Authenticates via ?token=<jwt> query param (headers not supported in WS browsers)
 * - Routes incoming messages to the correct Zustand store
 * - Auto-reconnects with exponential backoff on disconnection
 * - Cleans up when the user logs out or the component unmounts
 *
 * Usage: call once from the guest layout root so it lives for the whole session.
 */

import { useEffect, useRef, useCallback } from "react";
import * as SecureStore from "expo-secure-store";

import { API } from "@/constants/api";
import { useAuthStore } from "@/stores/auth.store";
import { useBookingStore } from "@/stores/booking.store";
import { useNotificationStore } from "@/stores/notification.store";
import { useChatStore } from "@/stores/chat.store";
import type { BookingStatus } from "@/types";
import type { Message } from "@/types/chat.types";

// The key used to store the access token in SecureStore.
const ACCESS_TOKEN_KEY = "auth_access_token";

// Backoff config for reconnection.
const INITIAL_BACKOFF_MS = 1_000;
const MAX_BACKOFF_MS = 30_000;
const BACKOFF_MULTIPLIER = 2;

interface WSMessage {
  readonly type: string;
  readonly payload?: Record<string, unknown>;
}

interface BookingStatusPayload {
  readonly booking_id: number;
  readonly payment_id: string;
  readonly status: BookingStatus;
}

interface NotificationPayload {
  readonly id: string;
  readonly title: string;
  readonly message: string;
  readonly type: string;
  readonly data?: Record<string, unknown>;
  readonly created_at: string;
}

interface ChatMessagePayload {
  readonly id: number;
  readonly conversation_id: number;
  readonly sender_id: string;
  readonly content: string;
  readonly created_at: string;
}

interface ChatTypingPayload {
  readonly conversation_id: number;
  readonly user_id: string;
}

export function useRealtimeConnection() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const setSagaStatus = useBookingStore((s) => s.setSagaStatus);
  const currentBookingId = useBookingStore((s) => s.currentBookingId);
  const addNotification = useNotificationStore((s) => s.addNotification);
  const prependMessage = useChatStore((s) => s.prependMessage);
  const updateLastMessage = useChatStore((s) => s.updateLastMessage);
  const setTyping = useChatStore((s) => s.setTyping);

  const wsRef = useRef<WebSocket | null>(null);
  const backoffRef = useRef(INITIAL_BACKOFF_MS);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  const handleMessage = useCallback(
    (raw: string) => {
      let msg: WSMessage;
      try {
        msg = JSON.parse(raw) as WSMessage;
      } catch {
        return; // ignore malformed
      }

      switch (msg.type) {
        case "booking_status_updated": {
          const p = msg.payload as BookingStatusPayload | undefined;
          if (!p) break;
          // Only update store if this message is for the current booking.
          if (currentBookingId && String(p.booking_id) === currentBookingId) {
            setSagaStatus(p.status);
          }
          break;
        }

        case "notification.new": {
          const p = msg.payload as NotificationPayload | undefined;
          if (!p) break;
          addNotification({
            id: p.id ?? String(Date.now()),
            title: p.title ?? "New notification",
            body: p.message ?? "",
            type: p.type ?? "info",
            read: false,
            createdAt: p.created_at ?? new Date().toISOString(),
            data: p.data,
          });
          break;
        }

        case "chat.message": {
          const p = msg.payload as ChatMessagePayload | undefined;
          if (!p) break;
          const newMsg: Message = {
            id: p.id,
            conversationId: p.conversation_id,
            senderId: p.sender_id,
            content: p.content,
            isRead: false,
            createdAt: p.created_at,
          };
          prependMessage(p.conversation_id, newMsg);
          updateLastMessage(p.conversation_id, newMsg);
          break;
        }

        case "chat.typing": {
          const p = msg.payload as ChatTypingPayload | undefined;
          if (!p) break;
          setTyping(p.conversation_id, true);
          // Auto-clear typing indicator after 3 seconds.
          setTimeout(() => setTyping(p.conversation_id, false), 3000);
          break;
        }

        // "connected" is a welcome message — no action needed.
        default:
          break;
      }
    },
    [
      currentBookingId,
      setSagaStatus,
      addNotification,
      prependMessage,
      updateLastMessage,
      setTyping,
    ],
  );

  const connect = useCallback(async () => {
    if (!mountedRef.current || !isAuthenticated) return;

    // Retrieve stored JWT — cannot use headers in WebSocket.
    const token = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
    if (!token) return;

    const url = `${API.WS_URL}/api/v1${API.WS.BOOKINGS}?token=${encodeURIComponent(token)}`;

    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      backoffRef.current = INITIAL_BACKOFF_MS; // reset on success
    };

    ws.onmessage = (event) => {
      handleMessage(event.data as string);
    };

    ws.onerror = () => {
      ws.close();
    };

    ws.onclose = () => {
      if (!mountedRef.current) return;
      // Schedule reconnect with exponential backoff.
      reconnectTimerRef.current = setTimeout(() => {
        if (mountedRef.current && isAuthenticated) {
          void connect();
        }
      }, backoffRef.current);

      backoffRef.current = Math.min(
        backoffRef.current * BACKOFF_MULTIPLIER,
        MAX_BACKOFF_MS,
      );
    };
  }, [isAuthenticated, handleMessage]);

  const disconnect = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.onclose = null; // prevent reconnect loop on intentional close
      wsRef.current.close();
      wsRef.current = null;
    }
    backoffRef.current = INITIAL_BACKOFF_MS;
  }, []);

  useEffect(() => {
    mountedRef.current = true;

    if (isAuthenticated) {
      void connect();
    }

    return () => {
      mountedRef.current = false;
      disconnect();
    };
  }, [isAuthenticated, connect, disconnect]);
}
