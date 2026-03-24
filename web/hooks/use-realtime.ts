"use client";

import { useEffect, useRef, useCallback } from "react";
import { useAuthStore } from "@/stores/auth.store";
import { useChatStore } from "@/stores/chat.store";
import { apiClient } from "@/services/api";
import type { Message } from "@/types/chat.types";

const WS_URL =
  process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:8080/api/v1/ws/bookings";

const MIN_BACKOFF = 1_000;
const MAX_BACKOFF = 30_000;

interface WsMessage {
  type: string;
  payload: unknown;
}

interface ChatMessagePayload {
  conversation_id: number;
  id: number;
  sender_id: string;
  content: string;
  created_at: string;
  read_at?: string;
}

interface ChatTypingPayload {
  conversation_id: number;
  user_id: string;
}

interface TicketResponse {
  data: { ticket: string };
}

export function useRealtimeConnection() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const prependMessage = useChatStore((s) => s.prependMessage);
  const updateLastMessage = useChatStore((s) => s.updateLastMessage);
  const setTyping = useChatStore((s) => s.setTyping);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const backoffRef = useRef(MIN_BACKOFF);
  const mountedRef = useRef(true);
  // connectRef allows the reconnect callback to call the latest connect version
  // without triggering the react-hooks/immutability ESLint rule.
  const connectRef = useRef<(() => Promise<void>) | null>(null);

  const connect = useCallback(async () => {
    if (!mountedRef.current || !isAuthenticated) return;

    // Fetch a one-time ticket from the server (avoids JWT in WS URL).
    let ticket: string;
    try {
      const res = await apiClient.post<TicketResponse>("/ws/ticket");
      ticket = res.data?.data?.ticket;
      if (!ticket) return;
    } catch {
      // Schedule retry on ticket fetch failure.
      reconnectTimer.current = setTimeout(() => {
        if (mountedRef.current && isAuthenticated) void connectRef.current?.();
      }, backoffRef.current);
      backoffRef.current = Math.min(backoffRef.current * 2, MAX_BACKOFF);
      return;
    }

    const ws = new WebSocket(`${WS_URL}?ticket=${ticket}`);
    wsRef.current = ws;

    ws.onopen = () => {
      backoffRef.current = MIN_BACKOFF;
    };

    ws.onmessage = (event: MessageEvent<string>) => {
      let parsed: WsMessage;
      try {
        parsed = JSON.parse(event.data) as WsMessage;
      } catch {
        return;
      }

      switch (parsed.type) {
        case "chat.message": {
          const p = parsed.payload as ChatMessagePayload;
          const msg: Message = {
            id: p.id,
            conversationId: p.conversation_id,
            senderId: p.sender_id,
            content: p.content,
            readAt: p.read_at,
            createdAt: p.created_at,
          };
          prependMessage(p.conversation_id, msg);
          updateLastMessage(p.conversation_id, msg);
          break;
        }
        case "chat.typing": {
          const p = parsed.payload as ChatTypingPayload;
          setTyping(p.conversation_id, true);
          setTimeout(() => setTyping(p.conversation_id, false), 3_000);
          break;
        }
        default:
          break;
      }
    };

    ws.onclose = () => {
      if (!mountedRef.current) return;
      const delay = backoffRef.current;
      backoffRef.current = Math.min(backoffRef.current * 2, MAX_BACKOFF);
      reconnectTimer.current = setTimeout(() => {
        if (mountedRef.current && isAuthenticated) void connectRef.current?.();
      }, delay);
    };

    ws.onerror = () => {
      ws.close();
    };
  }, [isAuthenticated, prependMessage, updateLastMessage, setTyping]);

  useEffect(() => {
    mountedRef.current = true;
    // Sync ref so reconnect callbacks always call the latest version.
    connectRef.current = connect;
    if (isAuthenticated) void connect();

    return () => {
      mountedRef.current = false;
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, [isAuthenticated, connect]);
}
