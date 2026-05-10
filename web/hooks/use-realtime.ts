"use client";

import { useEffect, useRef, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/auth.store";
import { useChatStore } from "@/stores/chat.store";
import { apiClient } from "@/services/api";
import type { Conversation, Message } from "@/types/chat.types";

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
  const setTyping = useChatStore((s) => s.setTyping);
  const queryClient = useQueryClient();

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const backoffRef = useRef(MIN_BACKOFF);
  const mountedRef = useRef(true);
  // Incremented on every cleanup — any in-flight connect() that captures an
  // older generation aborts after its async ticket fetch resolves. This prevents
  // React StrictMode's mount→unmount→remount cycle from producing two live
  // WebSocket connections that both handle the same incoming messages.
  const genRef = useRef(0);
  // connectRef allows the reconnect callback to call the latest connect version
  // without triggering the react-hooks/immutability ESLint rule.
  const connectRef = useRef<(() => Promise<void>) | null>(null);

  const connect = useCallback(async () => {
    if (!mountedRef.current || !isAuthenticated) return;

    // Capture generation at the start of this connect attempt.
    const myGen = genRef.current;

    // Fetch a one-time ticket from the server (avoids JWT in WS URL).
    let ticket: string;
    try {
      const res = await apiClient.post<TicketResponse>("/ws/ticket");
      // Bail if cleanup ran (and incremented genRef) while we were awaiting.
      if (genRef.current !== myGen) return;
      ticket = res.data?.data?.ticket;
      if (!ticket) return;
    } catch {
      if (genRef.current !== myGen) return;
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

          // Prepend to messages cache — skip if the message is already present
          // (guards against WS echo duplicating a message added by sendMutation).
          queryClient.setQueryData<Message[]>(
            ["chat", "messages", p.conversation_id],
            (prev) => {
              if (prev?.some((m) => m.id === p.id)) return prev;
              return [msg, ...(prev ?? [])];
            },
          );

          // Update the last message preview in the conversations list cache.
          queryClient.setQueryData<Conversation[]>(
            ["chat", "conversations"],
            (prev) =>
              prev?.map((c) =>
                c.id === p.conversation_id
                  ? { ...c, lastMessage: msg, lastMessageAt: msg.createdAt }
                  : c,
              ),
          );
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
  }, [isAuthenticated, queryClient, setTyping]);

  useEffect(() => {
    mountedRef.current = true;
    // Sync ref so reconnect callbacks always call the latest version.
    connectRef.current = connect;
    if (isAuthenticated) void connect();

    return () => {
      mountedRef.current = false;
      // Invalidate any in-flight connect() that is awaiting its ticket fetch.
      genRef.current++;
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, [isAuthenticated, connect]);
}
