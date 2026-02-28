import { apiClient } from "./api";
import type { ApiResponse, PaginatedResponse } from "@/types/api.types";
import type {
  Conversation,
  Message,
  CreateConversationInput,
  SendMessageInput,
  BroadcastInput,
} from "@/types/chat.types";

function mapConversation(raw: Record<string, unknown>): Conversation {
  return {
    id: raw.id as number,
    type: raw.type as Conversation["type"],
    hotelId: raw.hotel_id as number | undefined,
    bookingId: raw.booking_id as number | undefined,
    participantA: raw.participant_a as string,
    participantB: raw.participant_b as string | undefined,
    lastMessage: raw.last_message
      ? mapMessage(raw.last_message as Record<string, unknown>)
      : undefined,
    lastMessageAt: raw.last_message_at as string,
    unreadCount: (raw.unread_count as number) ?? 0,
    createdAt: raw.created_at as string,
  };
}

function mapMessage(raw: Record<string, unknown>): Message {
  return {
    id: raw.id as number,
    conversationId: raw.conversation_id as number,
    senderId: raw.sender_id as string,
    content: raw.content as string,
    readAt: raw.read_at as string | undefined,
    createdAt: raw.created_at as string,
  };
}

export const chatService = {
  getOrCreateConversation: (input: CreateConversationInput) =>
    apiClient
      .post<ApiResponse<Record<string, unknown>>>("/conversations", {
        participant_b: input.participantB,
        hotel_id: input.hotelId,
        booking_id: input.bookingId,
      })
      .then((r) => ({
        ...r.data,
        data: r.data.data ? mapConversation(r.data.data) : null,
      })),

  listConversations: () =>
    apiClient
      .get<ApiResponse<Record<string, unknown>[]>>("/conversations")
      .then((r) => ({
        ...r.data,
        data: r.data.data?.map(mapConversation) ?? [],
      })),

  getMessages: (conversationId: number, beforeId?: number) =>
    apiClient
      .get<ApiResponse<Record<string, unknown>[]>>(
        `/conversations/${conversationId}/messages`,
        { params: beforeId ? { before_id: beforeId } : {} },
      )
      .then((r) => ({
        ...r.data,
        data: r.data.data?.map(mapMessage) ?? [],
      })),

  sendMessage: (conversationId: number, input: SendMessageInput) =>
    apiClient
      .post<ApiResponse<Record<string, unknown>>>(
        `/conversations/${conversationId}/messages`,
        { content: input.content },
      )
      .then((r) => ({
        ...r.data,
        data: r.data.data ? mapMessage(r.data.data) : null,
      })),

  markRead: (conversationId: number) =>
    apiClient
      .put<ApiResponse<null>>(`/conversations/${conversationId}/read`)
      .then((r) => r.data),

  getUnreadCount: () =>
    apiClient
      .get<ApiResponse<{ total: number }>>("/chat/unread-count")
      .then((r) => r.data),

  broadcast: (input: BroadcastInput) =>
    apiClient
      .post<ApiResponse<Record<string, unknown>>>("/admin/broadcast", {
        title: input.title,
        content: input.content,
        hotel_id: input.hotelId,
      })
      .then((r) => ({
        ...r.data,
        data: r.data.data ? mapConversation(r.data.data) : null,
      })),
};
