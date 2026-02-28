export type ConversationType = "direct" | "broadcast";

export interface Conversation {
  id: number;
  type: ConversationType;
  hotelId?: number;
  bookingId?: number;
  participantA: string;
  participantB?: string;
  lastMessage?: Message;
  lastMessageAt: string;
  unreadCount: number;
  createdAt: string;
}

export interface Message {
  id: number;
  conversationId: number;
  senderId: string;
  content: string;
  readAt?: string;
  createdAt: string;
}

export interface SendMessageInput {
  content: string;
}

export interface CreateConversationInput {
  participantB: string;
  hotelId?: number;
  bookingId?: number;
}

export interface BroadcastInput {
  title: string;
  content: string;
  hotelId?: number;
}
