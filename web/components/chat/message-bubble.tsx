"use client";

import { cn } from "@/lib/utils";
import type { Message } from "@/types/chat.types";

interface MessageBubbleProps {
  readonly message: Message;
  readonly isMine: boolean;
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function MessageBubble({ message, isMine }: MessageBubbleProps) {
  return (
    <div className={cn("flex mb-2", isMine ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[70%] rounded-2xl px-4 py-2.5 text-sm",
          isMine
            ? "bg-primary text-primary-foreground rounded-br-sm"
            : "bg-muted text-foreground rounded-bl-sm",
        )}
      >
        <p className="break-words whitespace-pre-wrap leading-relaxed">
          {message.content}
        </p>
        <p
          className={cn(
            "text-[10px] mt-1 text-right",
            isMine ? "text-primary-foreground/60" : "text-muted-foreground",
          )}
        >
          {formatTime(message.createdAt)}
        </p>
      </div>
    </div>
  );
}
