import { create } from "zustand";
import type { Conversation, Message } from "@/types/chat.types";

interface ChatState {
  conversations: Conversation[];
  messagesByConversation: Record<number, Message[]>;
  totalUnreadCount: number;
  isTyping: Record<number, boolean>;

  // Actions
  setConversations: (convs: Conversation[]) => void;
  addOrUpdateConversation: (conv: Conversation) => void;
  setMessages: (conversationId: number, msgs: Message[]) => void;
  prependMessage: (conversationId: number, msg: Message) => void;
  appendOlderMessages: (conversationId: number, msgs: Message[]) => void;
  markConversationRead: (conversationId: number) => void;
  setTotalUnreadCount: (count: number) => void;
  setTyping: (conversationId: number, value: boolean) => void;
  updateLastMessage: (conversationId: number, msg: Message) => void;
}

export const useChatStore = create<ChatState>()((set) => ({
  conversations: [],
  messagesByConversation: {},
  totalUnreadCount: 0,
  isTyping: {},

  setConversations: (convs) =>
    set(() => ({ conversations: convs })),

  addOrUpdateConversation: (conv) =>
    set((s) => {
      const exists = s.conversations.some((c) => c.id === conv.id);
      const updated = exists
        ? s.conversations.map((c) => (c.id === conv.id ? conv : c))
        : [conv, ...s.conversations];
      return { conversations: updated };
    }),

  setMessages: (conversationId, msgs) =>
    set((s) => ({
      messagesByConversation: {
        ...s.messagesByConversation,
        [conversationId]: msgs,
      },
    })),

  prependMessage: (conversationId, msg) =>
    set((s) => {
      const current = s.messagesByConversation[conversationId] ?? [];
      return {
        messagesByConversation: {
          ...s.messagesByConversation,
          [conversationId]: [msg, ...current],
        },
      };
    }),

  appendOlderMessages: (conversationId, msgs) =>
    set((s) => {
      const current = s.messagesByConversation[conversationId] ?? [];
      return {
        messagesByConversation: {
          ...s.messagesByConversation,
          [conversationId]: [...current, ...msgs],
        },
      };
    }),

  markConversationRead: (conversationId) =>
    set((s) => ({
      conversations: s.conversations.map((c) =>
        c.id === conversationId ? { ...c, unreadCount: 0 } : c,
      ),
    })),

  setTotalUnreadCount: (count) =>
    set(() => ({ totalUnreadCount: count })),

  setTyping: (conversationId, value) =>
    set((s) => ({
      isTyping: { ...s.isTyping, [conversationId]: value },
    })),

  updateLastMessage: (conversationId, msg) =>
    set((s) => ({
      conversations: s.conversations.map((c) =>
        c.id === conversationId
          ? { ...c, lastMessage: msg, lastMessageAt: msg.createdAt }
          : c,
      ),
    })),
}));
