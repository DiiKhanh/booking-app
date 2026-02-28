"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Megaphone, CheckCircle2, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { chatService } from "@/services/chat.service";

interface FormState {
  title: string;
  content: string;
  hotelId: string;
}

const INITIAL_FORM: FormState = { title: "", content: "", hotelId: "" };

export default function AdminBroadcastPage() {
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [success, setSuccess] = useState(false);

  const mutation = useMutation({
    mutationFn: () =>
      chatService.broadcast({
        title: form.title,
        content: form.content,
        hotelId: form.hotelId ? Number(form.hotelId) : undefined,
      }),
    onSuccess: () => {
      setForm(INITIAL_FORM);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 4_000);
    },
  });

  const canSubmit = form.title.trim().length > 0 && form.content.trim().length > 0;

  const handleChange =
    (field: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }));

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Broadcast Message</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Send a platform-wide announcement to all connected users
        </p>
      </div>

      {success && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20 dark:border-emerald-800 px-4 py-3 text-emerald-700 dark:text-emerald-400 text-sm">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          Broadcast sent successfully.
        </div>
      )}

      {mutation.isError && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-800 px-4 py-3 text-red-700 dark:text-red-400 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          Failed to send broadcast. Please try again.
        </div>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Megaphone className="w-4 h-4" />
            Compose Announcement
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={form.title}
              onChange={handleChange("title")}
              placeholder="e.g. Scheduled maintenance on March 5th"
              maxLength={200}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="content">Message</Label>
            <Textarea
              id="content"
              value={form.content}
              onChange={handleChange("content")}
              placeholder="Write your announcement here…"
              rows={5}
              maxLength={2000}
            />
            <p className="text-xs text-muted-foreground text-right">
              {form.content.length}/2000
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="hotelId">Hotel ID (optional)</Label>
            <Input
              id="hotelId"
              value={form.hotelId}
              onChange={handleChange("hotelId")}
              placeholder="Leave empty to broadcast to all users"
              type="number"
              min={1}
            />
            <p className="text-xs text-muted-foreground">
              Target a specific hotel's guests, or leave empty for a global broadcast.
            </p>
          </div>

          <Button
            onClick={() => mutation.mutate()}
            disabled={!canSubmit || mutation.isPending}
            className="w-full"
          >
            <Megaphone className="w-4 h-4 mr-2" />
            {mutation.isPending ? "Sending…" : "Send Broadcast"}
          </Button>
        </CardContent>
      </Card>

      <Card className="border-dashed">
        <CardContent className="p-4">
          <h3 className="text-sm font-semibold mb-2">How broadcasts work</h3>
          <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
            <li>Message is delivered in real-time to all connected users via WebSocket</li>
            <li>Persisted as a broadcast conversation in the database</li>
            <li>Users who are offline will see it next time they open Messages</li>
            <li>Target a hotel ID to reach only guests with bookings at that property</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
