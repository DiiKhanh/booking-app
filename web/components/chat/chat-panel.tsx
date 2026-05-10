"use client";

import { useState, useRef, useEffect } from "react";
import { ActivityIcon, Loader2, Plus, X, User } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ConversationList } from "./conversation-list";
import { MessageBubble } from "./message-bubble";
import { ChatInput } from "./chat-input";
import { chatService } from "@/services/chat.service";
import { useChatStore } from "@/stores/chat.store";
import { useAuthStore } from "@/stores/auth.store";
import type { Conversation, Message } from "@/types/chat.types";

export function ChatPanel() {
  const userId = useAuthStore((s) => s.user?.id ?? "");
  const isTyping = useChatStore((s) => s.isTyping);
  const queryClient = useQueryClient();

  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [showNewChat, setShowNewChat] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Conversations list — polled every 30 s, read directly (no Zustand copy).
  const { data: conversations = [], isLoading: listLoading } = useQuery({
    queryKey: ["chat", "conversations"],
    queryFn: () => chatService.listConversations().then((r) => r.data ?? []),
    refetchInterval: 30_000,
  });

  const sortedConversations = [...conversations].sort(
    (a, b) =>
      new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime(),
  );

  // Contacts — fetched once with a 5-min stale time.
  const { data: contacts = [], isLoading: loadingContacts } = useQuery({
    queryKey: ["chat", "contacts"],
    queryFn: () => chatService.getContacts().then((r) => r.data ?? []),
    staleTime: 5 * 60 * 1000,
  });

  // Messages for the selected conversation.
  const { data: messages = [], isLoading: loadingMsgs } = useQuery({
    queryKey: ["chat", "messages", selectedConv?.id],
    queryFn: () =>
      chatService.getMessages(selectedConv!.id).then((r) => r.data ?? []),
    enabled: !!selectedConv,
  });

  // Display chronologically (oldest at top, newest at bottom).
  const displayMessages = [...messages].reverse();

  // Send a message.
  const sendMutation = useMutation({
    mutationFn: (content: string) =>
      chatService.sendMessage(selectedConv!.id, { content }),
    onSuccess: (res) => {
      if (!res.data || !selectedConv) return;
      const msg = res.data;
      queryClient.setQueryData<Message[]>(
        ["chat", "messages", selectedConv.id],
        (prev) => [msg, ...(prev ?? [])],
      );
      queryClient.setQueryData<Conversation[]>(
        ["chat", "conversations"],
        (prev) =>
          prev?.map((c) =>
            c.id === selectedConv.id
              ? { ...c, lastMessage: msg, lastMessageAt: msg.createdAt }
              : c,
          ),
      );
    },
  });

  // Get-or-create a conversation with a contact.
  const startConvMutation = useMutation({
    mutationFn: (contactId: string) =>
      chatService.getOrCreateConversation({ participantB: contactId }),
    onSuccess: async (res) => {
      if (!res.data) return;
      const conv = res.data;
      queryClient.setQueryData<Conversation[]>(
        ["chat", "conversations"],
        (prev) => {
          if (!prev) return [conv];
          const exists = prev.some((c) => c.id === conv.id);
          return exists
            ? prev.map((c) => (c.id === conv.id ? conv : c))
            : [conv, ...prev];
        },
      );
      setShowNewChat(false);
      await handleSelectConv(conv);
    },
  });

  const handleSelectConv = async (conv: Conversation) => {
    setSelectedConv(conv);
    setHasMore(true);
    // Fire-and-forget — optimistically clear the badge in the cache.
    chatService.markRead(conv.id).catch(() => {});
    queryClient.setQueryData<Conversation[]>(
      ["chat", "conversations"],
      (prev) =>
        prev?.map((c) => (c.id === conv.id ? { ...c, unreadCount: 0 } : c)),
    );
  };

  const handleSend = (content: string) => {
    if (!selectedConv) return;
    sendMutation.mutate(content);
  };

  const handleLoadMore = async () => {
    if (!selectedConv || loadingMore || !hasMore || messages.length === 0) return;
    setLoadingMore(true);
    try {
      const oldest = messages[messages.length - 1];
      const res = await chatService.getMessages(selectedConv.id, oldest.id);
      if (!res.data?.length) {
        setHasMore(false);
      } else {
        queryClient.setQueryData<Message[]>(
          ["chat", "messages", selectedConv.id],
          (prev) => [...(prev ?? []), ...res.data!],
        );
        setHasMore(res.data.length >= 50);
      }
    } finally {
      setLoadingMore(false);
    }
  };

  // Scroll to bottom on new messages in selected conversation.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [displayMessages.length]);

  const typingInConv = selectedConv ? (isTyping[selectedConv.id] ?? false) : false;

  return (
    <div className="flex h-full border border-border rounded-xl overflow-hidden bg-background">
      {/* Sidebar */}
      <div className="w-80 shrink-0 border-r border-border flex flex-col relative overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">
            Conversations
          </h2>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 cursor-pointer"
            onClick={() => setShowNewChat(true)}
            title="Start new conversation"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        {/* New Chat overlay */}
        {showNewChat && (
          <div className="absolute inset-0 z-10 bg-background flex flex-col border-r border-border">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">New Conversation</h2>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 cursor-pointer"
                onClick={() => setShowNewChat(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {loadingContacts ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : contacts.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-12 px-4">
                  No contacts available
                </p>
              ) : (
                <div className="divide-y divide-border">
                  {contacts.map((contact) => (
                    <button
                      key={contact.id}
                      type="button"
                      disabled={startConvMutation.isPending}
                      onClick={() => startConvMutation.mutate(contact.id)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-accent/50 transition-colors text-left cursor-pointer disabled:opacity-50"
                    >
                      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <User className="w-4 h-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{contact.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{contact.email}</p>
                      </div>
                      {startConvMutation.isPending && (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground ml-auto shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex-1 min-h-0 overflow-y-auto">
          {listLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <ConversationList
              conversations={sortedConversations}
              selectedId={selectedConv?.id}
              currentUserId={userId}
              contacts={contacts}
              onSelect={handleSelectConv}
            />
          )}
        </div>
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
                    : (() => {
                        const otherId =
                          selectedConv.participantA === userId
                            ? selectedConv.participantB
                            : selectedConv.participantA;
                        const contact = contacts.find((c) => c.id === otherId);
                        return contact
                          ? contact.name
                          : `User ${(otherId ?? "").slice(0, 8)}…`;
                      })()}
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
              <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-4 py-2">
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
              </div>
            )}

            {/* Input */}
            <ChatInput onSend={handleSend} disabled={sendMutation.isPending} />
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
