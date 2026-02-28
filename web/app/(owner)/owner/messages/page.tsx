"use client";

import { useEffect } from "react";
import { ChatPanel } from "@/components/chat/chat-panel";
import { useRealtimeConnection } from "@/hooks/use-realtime";

export default function OwnerMessagesPage() {
  useRealtimeConnection();

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <div className="mb-4">
        <h1 className="text-2xl font-bold tracking-tight">Messages</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Respond to guest inquiries and booking questions
        </p>
      </div>

      <div className="flex-1 min-h-0">
        <ChatPanel />
      </div>
    </div>
  );
}
