import { apiClient } from "./api";
import { API } from "@/constants/api";
import type {
  Conversation,
  Message,
  CreateConversationInput,
  SendMessageInput,
} from "@/types/chat.types";
import type { ApiResponse } from "@/types";

interface PaginatedConversations {
  readonly data: readonly Conversation[];
  readonly meta: { readonly total: number; readonly page: number; readonly limit: number };
}

// Maps API snake_case fields to camelCase Conversation.
function mapConversation(raw: Record<string, unknown>): Conversation {
  return {
    id: raw.id as number,
    type: raw.type as "direct" | "broadcast",
    hotelId: (raw.hotel_id as number) ?? null,
    bookingId: (raw.booking_id as number) ?? null,
    participantA: raw.participant_a as string,
    participantB: (raw.participant_b as string) ?? null,
    lastMessage: raw.last_message
      ? mapMessage(raw.last_message as Record<string, unknown>)
      : null,
    unreadCount: (raw.unread_count as number) ?? 0,
    lastMessageAt: raw.last_message_at as string,
    createdAt: raw.created_at as string,
  };
}

// Maps API snake_case fields to camelCase Message.
function mapMessage(raw: Record<string, unknown>): Message {
  return {
    id: raw.id as number,
    conversationId: raw.conversation_id as number,
    senderId: raw.sender_id as string,
    content: raw.content as string,
    isRead: raw.is_read as boolean,
    createdAt: raw.created_at as string,
  };
}

export const chatService = {
  async getOrCreateConversation(input: CreateConversationInput): Promise<Conversation> {
    const body: Record<string, unknown> = { participant_id: input.participantId };
    if (input.hotelId != null) body.hotel_id = input.hotelId;
    if (input.bookingId != null) body.booking_id = input.bookingId;

    const res = await apiClient.post<ApiResponse<Record<string, unknown>>>(
      API.CHAT.CONVERSATIONS,
      body,
    );
    return mapConversation(res.data.data!);
  },

  async listConversations(page = 1, limit = 20): Promise<PaginatedConversations> {
    const res = await apiClient.get<
      ApiResponse<readonly Record<string, unknown>[]> & { meta?: { total: number; page: number; limit: number } }
    >(API.CHAT.CONVERSATIONS, { params: { page, limit } });
    return {
      data: (res.data.data ?? []).map(mapConversation),
      meta: res.data.meta ?? { total: 0, page, limit },
    };
  },

  async getMessages(conversationId: number, beforeId?: number, limit = 50): Promise<readonly Message[]> {
    const params: Record<string, unknown> = { limit };
    if (beforeId != null) params.before_id = beforeId;

    const res = await apiClient.get<ApiResponse<readonly Record<string, unknown>[]>>(
      API.CHAT.MESSAGES(conversationId),
      { params },
    );
    return (res.data.data ?? []).map(mapMessage);
  },

  async sendMessage(conversationId: number, content: string): Promise<Message> {
    const res = await apiClient.post<ApiResponse<Record<string, unknown>>>(
      API.CHAT.MESSAGES(conversationId),
      { content },
    );
    return mapMessage(res.data.data!);
  },

  async markRead(conversationId: number): Promise<void> {
    await apiClient.put(API.CHAT.READ(conversationId));
  },

  async getUnreadCount(): Promise<number> {
    const res = await apiClient.get<ApiResponse<{ count: number }>>(API.CHAT.UNREAD_COUNT);
    return res.data.data?.count ?? 0;
  },
};
