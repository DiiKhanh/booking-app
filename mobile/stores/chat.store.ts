import { create } from "zustand";
import type { Conversation, Message } from "@/types/chat.types";

interface ChatState {
  readonly conversations: readonly Conversation[];
  readonly messagesByConversation: Readonly<Record<number, readonly Message[]>>;
  readonly totalUnreadCount: number;
  readonly isTyping: Readonly<Record<number, boolean>>;
}

interface ChatActions {
  setConversations: (convs: readonly Conversation[]) => void;
  addOrUpdateConversation: (conv: Conversation) => void;
  setMessages: (conversationId: number, messages: readonly Message[]) => void;
  appendOlderMessages: (conversationId: number, messages: readonly Message[]) => void;
  prependMessage: (conversationId: number, message: Message) => void;
  markConversationRead: (conversationId: number) => void;
  setTotalUnreadCount: (count: number) => void;
  setTyping: (conversationId: number, isTyping: boolean) => void;
  updateLastMessage: (conversationId: number, message: Message) => void;
}

type ChatStore = ChatState & ChatActions;

export const useChatStore = create<ChatStore>()((set) => ({
  conversations: [],
  messagesByConversation: {},
  totalUnreadCount: 0,
  isTyping: {},

  setConversations: (convs) => set({ conversations: convs }),

  addOrUpdateConversation: (conv) =>
    set((state) => {
      const exists = state.conversations.some((c) => c.id === conv.id);
      if (exists) {
        return {
          conversations: state.conversations.map((c) => (c.id === conv.id ? conv : c)),
        };
      }
      return { conversations: [conv, ...state.conversations] };
    }),

  setMessages: (conversationId, messages) =>
    set((state) => ({
      messagesByConversation: {
        ...state.messagesByConversation,
        [conversationId]: messages,
      },
    })),

  appendOlderMessages: (conversationId, messages) =>
    set((state) => {
      const existing = state.messagesByConversation[conversationId] ?? [];
      return {
        messagesByConversation: {
          ...state.messagesByConversation,
          [conversationId]: [...existing, ...messages],
        },
      };
    }),

  prependMessage: (conversationId, message) =>
    set((state) => {
      const existing = state.messagesByConversation[conversationId] ?? [];
      return {
        messagesByConversation: {
          ...state.messagesByConversation,
          [conversationId]: [message, ...existing],
        },
        totalUnreadCount: state.totalUnreadCount + 1,
      };
    }),

  markConversationRead: (conversationId) =>
    set((state) => {
      const conv = state.conversations.find((c) => c.id === conversationId);
      const unreadReduced = conv ? conv.unreadCount : 0;
      return {
        conversations: state.conversations.map((c) =>
          c.id === conversationId ? { ...c, unreadCount: 0 } : c,
        ),
        totalUnreadCount: Math.max(0, state.totalUnreadCount - unreadReduced),
      };
    }),

  setTotalUnreadCount: (count) => set({ totalUnreadCount: count }),

  setTyping: (conversationId, isTyping) =>
    set((state) => ({
      isTyping: { ...state.isTyping, [conversationId]: isTyping },
    })),

  updateLastMessage: (conversationId, message) =>
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === conversationId
          ? { ...c, lastMessage: message, lastMessageAt: message.createdAt }
          : c,
      ),
    })),
}));
