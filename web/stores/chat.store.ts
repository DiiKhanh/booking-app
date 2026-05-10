import { create } from "zustand";

interface ChatState {
  isTyping: Record<number, boolean>;
  setTyping: (conversationId: number, value: boolean) => void;
}

export const useChatStore = create<ChatState>()((set) => ({
  isTyping: {},

  setTyping: (conversationId, value) =>
    set((s) => ({ isTyping: { ...s.isTyping, [conversationId]: value } })),
}));
