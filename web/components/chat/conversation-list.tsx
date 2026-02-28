"use client";

import { MessageSquare, Megaphone } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Conversation } from "@/types/chat.types";

interface ConversationListProps {
  readonly conversations: Conversation[];
  readonly selectedId?: number;
  readonly currentUserId: string;
  readonly onSelect: (conv: Conversation) => void;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d`;
  return new Date(dateStr).toLocaleDateString([], {
    month: "short",
    day: "numeric",
  });
}

export function ConversationList({
  conversations,
  selectedId,
  currentUserId,
  onSelect,
}: ConversationListProps) {
  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-6 py-12 text-muted-foreground">
        <MessageSquare className="w-10 h-10 mb-3 opacity-30" />
        <p className="text-sm font-medium">No conversations yet</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-border overflow-y-auto h-full">
      {conversations.map((conv) => {
        const otherId =
          conv.participantA === currentUserId
            ? conv.participantB
            : conv.participantA;
        const displayName =
          conv.type === "broadcast"
            ? "Broadcast"
            : otherId
              ? `User ${otherId.slice(0, 8)}…`
              : "Unknown";
        const hasUnread = conv.unreadCount > 0;
        const isSelected = conv.id === selectedId;

        return (
          <button
            key={conv.id}
            type="button"
            onClick={() => onSelect(conv)}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/50",
              isSelected && "bg-accent",
              hasUnread && !isSelected && "bg-blue-50/60 dark:bg-blue-950/20",
            )}
          >
            {/* Avatar */}
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0">
              {conv.type === "broadcast" ? (
                <Megaphone className="w-4 h-4 text-muted-foreground" />
              ) : (
                <MessageSquare className="w-4 h-4 text-muted-foreground" />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1">
                <span
                  className={cn(
                    "text-sm truncate",
                    hasUnread ? "font-semibold text-foreground" : "text-foreground/80",
                  )}
                >
                  {displayName}
                </span>
                <span className="text-xs text-muted-foreground shrink-0">
                  {timeAgo(conv.lastMessageAt)}
                </span>
              </div>
              <p
                className={cn(
                  "text-xs truncate mt-0.5",
                  hasUnread ? "text-foreground/70 font-medium" : "text-muted-foreground",
                )}
              >
                {conv.lastMessage?.content ?? "No messages yet"}
              </p>
            </div>

            {/* Badge */}
            {hasUnread ? (
              <div className="shrink-0 min-w-5 h-5 rounded-full bg-primary flex items-center justify-center px-1.5">
                <span className="text-[10px] font-bold text-primary-foreground">
                  {conv.unreadCount > 99 ? "99+" : conv.unreadCount}
                </span>
              </div>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
