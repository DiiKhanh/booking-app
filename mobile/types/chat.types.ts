export interface Conversation {
  readonly id: number;
  readonly type: "direct" | "broadcast";
  readonly hotelId: number | null;
  readonly bookingId: number | null;
  readonly participantA: string;
  readonly participantB: string | null;
  readonly lastMessage: Message | null;
  readonly unreadCount: number;
  readonly lastMessageAt: string;
  readonly createdAt: string;
}

export interface Message {
  readonly id: number;
  readonly conversationId: number;
  readonly senderId: string;
  readonly content: string;
  readonly isRead: boolean;
  readonly createdAt: string;
}

export interface SendMessageInput {
  readonly content: string;
}

export interface CreateConversationInput {
  readonly participantId: string;
  readonly hotelId?: number;
  readonly bookingId?: number;
}
