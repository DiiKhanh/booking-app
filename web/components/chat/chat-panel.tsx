"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { ActivityIcon, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ConversationList } from "./conversation-list";
import { MessageBubble } from "./message-bubble";
import { ChatInput } from "./chat-input";
import { chatService } from "@/services/chat.service";
import { useChatStore } from "@/stores/chat.store";
import { useAuthStore } from "@/stores/auth.store";
import type { Conversation } from "@/types/chat.types";

export function ChatPanel() {
  const userId = useAuthStore((s) => s.user?.id ?? "");

  const conversations = useChatStore((s) => s.conversations);
  const setConversations = useChatStore((s) => s.setConversations);
  const messagesByConversation = useChatStore((s) => s.messagesByConversation);
  const setMessages = useChatStore((s) => s.setMessages);
  const appendOlder = useChatStore((s) => s.appendOlderMessages);
  const prependMessage = useChatStore((s) => s.prependMessage);
  const updateLastMessage = useChatStore((s) => s.updateLastMessage);
  const markRead = useChatStore((s) => s.markConversationRead);
  const isTyping = useChatStore((s) => s.isTyping);

  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [sending, setSending] = useState(false);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Load conversation list
  const { data, isLoading: listLoading } = useQuery({
    queryKey: ["chat", "conversations"],
    queryFn: () => chatService.listConversations(),
    refetchInterval: 30_000,
  });

  useEffect(() => {
    if (data?.data) setConversations(data.data);
  }, [data, setConversations]);

  const sortedConversations = [...conversations].sort(
    (a, b) =>
      new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime(),
  );

  // Load messages when conversation selected
  const handleSelectConv = useCallback(
    async (conv: Conversation) => {
      setSelectedConv(conv);
      setHasMore(true);
      setLoadingMsgs(true);
      try {
        const res = await chatService.getMessages(conv.id);
        if (res.data) {
          setMessages(conv.id, res.data);
          setHasMore(res.data.length >= 50);
        }
        await chatService.markRead(conv.id).catch(() => {});
        markRead(conv.id);
      } finally {
        setLoadingMsgs(false);
      }
    },
    [setMessages, markRead],
  );

  const handleSend = async (content: string) => {
    if (!selectedConv) return;
    setSending(true);
    try {
      const res = await chatService.sendMessage(selectedConv.id, { content });
      if (res.data) {
        prependMessage(selectedConv.id, res.data);
        updateLastMessage(selectedConv.id, res.data);
      }
    } finally {
      setSending(false);
    }
  };

  const handleLoadMore = async () => {
    if (!selectedConv || loadingMore || !hasMore) return;
    const msgs = messagesByConversation[selectedConv.id] ?? [];
    if (msgs.length === 0) return;
    setLoadingMore(true);
    try {
      const oldest = msgs[msgs.length - 1];
      const res = await chatService.getMessages(selectedConv.id, oldest.id);
      if (!res.data || res.data.length === 0) {
        setHasMore(false);
      } else {
        appendOlder(selectedConv.id, res.data);
        setHasMore(res.data.length >= 50);
      }
    } finally {
      setLoadingMore(false);
    }
  };

  // Scroll to bottom on new messages in selected conv
  const convMessages = selectedConv
    ? (messagesByConversation[selectedConv.id] ?? [])
    : [];

  // Display chronologically (oldest at top, newest at bottom)
  const displayMessages = [...convMessages].reverse();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [displayMessages.length]);

  const typingInConv = selectedConv ? (isTyping[selectedConv.id] ?? false) : false;

  return (
    <div className="flex h-full border border-border rounded-xl overflow-hidden bg-background">
      {/* Sidebar */}
      <div className="w-80 shrink-0 border-r border-border flex flex-col">
        <div className="px-4 py-3 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">
            Conversations
          </h2>
        </div>
        {listLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <ConversationList
            conversations={sortedConversations}
            selectedId={selectedConv?.id}
            currentUserId={userId}
            onSelect={handleSelectConv}
          />
        )}
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {selectedConv ? (
          <>
            {/* Header */}
            <div className="px-4 py-3 border-b border-border flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                <ActivityIcon className="w-4 h-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-semibold">
                  {selectedConv.type === "broadcast"
                    ? "Broadcast"
                    : selectedConv.participantA === userId
                      ? `User ${(selectedConv.participantB ?? "").slice(0, 8)}…`
                      : `User ${selectedConv.participantA.slice(0, 8)}…`}
                </p>
                {typingInConv && (
                  <p className="text-xs text-muted-foreground">typing…</p>
                )}
              </div>
            </div>

            {/* Messages */}
            {loadingMsgs ? (
              <div className="flex-1 flex items-center justify-center">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <ScrollArea className="flex-1 px-4 py-2">
                {hasMore && (
                  <div className="flex justify-center mb-2">
                    <button
                      type="button"
                      onClick={handleLoadMore}
                      disabled={loadingMore}
                      className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-50 transition-colors"
                    >
                      {loadingMore ? "Loading…" : "Load earlier messages"}
                    </button>
                  </div>
                )}
                {displayMessages.map((msg) => (
                  <MessageBubble
                    key={msg.id}
                    message={msg}
                    isMine={msg.senderId === userId}
                  />
                ))}
                <div ref={bottomRef} />
              </ScrollArea>
            )}

            {/* Input */}
            <ChatInput onSend={handleSend} disabled={sending} />
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-3">
            <ActivityIcon className="w-12 h-12 opacity-20" />
            <p className="text-sm">Select a conversation to start chatting</p>
          </div>
        )}
      </div>
    </div>
  );
}
