"use client";

import { useState, useRef, type KeyboardEvent } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface ChatInputProps {
  readonly onSend: (content: string) => void;
  readonly disabled?: boolean;
  readonly placeholder?: string;
}

const MAX_LENGTH = 2000;

export function ChatInput({
  onSend,
  disabled,
  placeholder = "Type a message…",
}: ChatInputProps) {
  const [value, setValue] = useState("");
  const ref = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue("");
    ref.current?.focus();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex items-end gap-2 p-3 border-t border-border bg-background">
      <Textarea
        ref={ref}
        value={value}
        onChange={(e) => setValue(e.target.value.slice(0, MAX_LENGTH))}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        rows={1}
        className="resize-none min-h-[40px] max-h-32 flex-1 text-sm"
      />
      <Button
        size="icon"
        onClick={handleSend}
        disabled={disabled || !value.trim()}
        className="shrink-0 h-10 w-10"
      >
        <Send className="w-4 h-4" />
      </Button>
    </div>
  );
}
