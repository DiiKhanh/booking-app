"use client";

import { useRealtimeConnection } from "@/hooks/use-realtime";
import { ChatPanel } from "@/components/chat/chat-panel";

export default function AdminMessagesPage() {
  useRealtimeConnection();

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <div className="mb-4">
        <h1 className="text-2xl font-bold tracking-tight">Support Messages</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Monitor and respond to all platform conversations
        </p>
      </div>

      <div className="flex-1 min-h-0">
        <ChatPanel />
      </div>
    </div>
  );
}
