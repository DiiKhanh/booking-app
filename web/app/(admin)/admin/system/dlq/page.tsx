"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  AlertTriangle,
  RefreshCw,
  RotateCcw,
  Trash2,
  Search,
  Filter,
  ChevronRight,
  Clock,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { systemService, type DLQMessage } from "@/services/system.service";

const MOCK_DLQ: DLQMessage[] = [
  { id: "dlq-1", queue: "payment.events", routingKey: "payment.initiated", payload: '{"bookingId":"B-4821","amount":660,"currency":"USD","userId":"U-1024"}', error: "PaymentGateway: Connection timeout after 30000ms", retryCount: 3, failedAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(), originalTimestamp: new Date(Date.now() - 3 * 3600 * 1000).toISOString() },
  { id: "dlq-2", queue: "notification.events", routingKey: "notification.new", payload: '{"userId":"U-0821","type":"booking_confirmed","bookingId":"B-4102"}', error: "NotificationService: SMTP connection refused", retryCount: 5, failedAt: new Date(Date.now() - 4 * 3600 * 1000).toISOString(), originalTimestamp: new Date(Date.now() - 5 * 3600 * 1000).toISOString() },
  { id: "dlq-3", queue: "payment.events", routingKey: "payment.succeeded", payload: '{"bookingId":"B-3904","amount":1280,"userId":"U-2048"}', error: "SagaOrchestrator: Booking not found for update", retryCount: 2, failedAt: new Date(Date.now() - 6 * 3600 * 1000).toISOString(), originalTimestamp: new Date(Date.now() - 7 * 3600 * 1000).toISOString() },
  { id: "dlq-4", queue: "booking.notifications", routingKey: "booking_status_updated", payload: '{"userId":"U-1832","bookingId":"B-4511","status":"confirmed"}', error: "WebSocketHub: User not connected", retryCount: 1, failedAt: new Date(Date.now() - 8 * 3600 * 1000).toISOString(), originalTimestamp: new Date(Date.now() - 8.5 * 3600 * 1000).toISOString() },
  { id: "dlq-5", queue: "payment.events", routingKey: "payment.failed", payload: '{"bookingId":"B-4388","reason":"insufficient_funds","userId":"U-0984"}', error: "CompensatingService: Failed to release inventory lock", retryCount: 4, failedAt: new Date(Date.now() - 12 * 3600 * 1000).toISOString(), originalTimestamp: new Date(Date.now() - 13 * 3600 * 1000).toISOString() },
];

const QUEUE_COLORS: Record<string, string> = {
  "payment.events": "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400",
  "notification.events": "bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400",
  "booking.notifications": "bg-purple-100 text-purple-700 dark:bg-purple-950/30 dark:text-purple-400",
};

const RETRY_COLOR = (count: number) =>
  count >= 5 ? "text-red-600 dark:text-red-400" :
  count >= 3 ? "text-amber-600 dark:text-amber-400" :
  "text-muted-foreground";

export default function DLQPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [queueFilter, setQueueFilter] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["dlq-messages"],
    queryFn: () => systemService.getDLQ(),
    placeholderData: {
      success: true,
      data: MOCK_DLQ,
      error: null,
      meta: { total: MOCK_DLQ.length, page: 1, limit: 50, totalPages: 1 },
    },
  });

  const replayMutation = useMutation({
    mutationFn: (id: string) => systemService.replayDLQMessage(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["dlq-messages"] });
      toast.success(`Message ${id} queued for replay`);
    },
    onError: () => toast.error("Failed to replay message"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => systemService.deleteDLQMessage(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dlq-messages"] });
      toast.success("Message deleted from DLQ");
    },
    onError: () => toast.error("Failed to delete message"),
  });

  const messages = data?.data ?? MOCK_DLQ;
  const queues = [...new Set(messages.map((m) => m.queue))];

  const filtered = messages.filter((m) => {
    const matchQueue = queueFilter === "all" || m.queue === queueFilter;
    const matchSearch =
      !search ||
      m.routingKey.toLowerCase().includes(search.toLowerCase()) ||
      m.error.toLowerCase().includes(search.toLowerCase()) ||
      m.queue.toLowerCase().includes(search.toLowerCase());
    return matchQueue && matchSearch;
  });

  const highRetryCount = messages.filter((m) => m.retryCount >= 5).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dead Letter Queue</h1>
          <p className="text-muted-foreground mt-1">
            Failed messages requiring manual intervention
          </p>
        </div>
        <div className="flex items-center gap-2">
          {highRetryCount > 0 && (
            <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
              <AlertTriangle className="h-3 w-3 mr-1" />
              {highRetryCount} high retry
            </Badge>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="cursor-pointer"
          >
            <RefreshCw className={cn("h-4 w-4 mr-1.5", isFetching && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Messages", value: messages.length, icon: AlertTriangle, color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-950/30" },
          { label: "Queues Affected", value: queues.length, icon: Filter, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950/30" },
          { label: "High Retry (≥5)", value: highRetryCount, icon: RotateCcw, color: "text-red-600", bg: "bg-red-50 dark:bg-red-950/30" },
          { label: "Oldest Message", value: "13h ago", icon: Clock, color: "text-purple-600", bg: "bg-purple-50 dark:bg-purple-950/30" },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`p-2 rounded-lg ${stat.bg}`}>
                  <Icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                  <p className="font-bold text-lg">{stat.value}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Info banner */}
      <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/10">
        <CardContent className="p-4 flex items-start gap-3">
          <Info className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-amber-800 dark:text-amber-400">Dead Letter Queue Overview</p>
            <p className="text-amber-700/80 dark:text-amber-400/70 text-xs mt-0.5">
              Messages are moved here after exhausting all retry attempts. Review each message, fix the underlying issue, then replay or delete.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-52">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by routing key, error..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 font-mono text-sm"
          />
        </div>
        <Select value={queueFilter} onValueChange={setQueueFilter}>
          <SelectTrigger className="w-48 cursor-pointer">
            <SelectValue placeholder="All queues" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Queues</SelectItem>
            {queues.map((q) => (
              <SelectItem key={q} value={q} className="font-mono text-xs">{q}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-sm text-muted-foreground">{filtered.length} messages</p>
      </div>

      {/* DLQ message list */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <AlertTriangle className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
            <p className="font-semibold">No messages found</p>
            <p className="text-sm text-muted-foreground mt-1">
              {messages.length === 0 ? "Dead letter queue is empty — all messages processed successfully!" : "No messages match your filters"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((msg) => {
            const isExpanded = expandedId === msg.id;
            const queueColor = QUEUE_COLORS[msg.queue] ?? "bg-muted text-muted-foreground";

            return (
              <Card
                key={msg.id}
                className={cn(
                  "transition-shadow hover:shadow-md cursor-pointer",
                  msg.retryCount >= 5 && "border-red-200 dark:border-red-800"
                )}
              >
                <CardContent className="p-4">
                  <div
                    className="flex items-start gap-3"
                    onClick={() => setExpandedId(isExpanded ? null : msg.id)}
                  >
                    {/* Alert icon */}
                    <div className={cn("p-2 rounded-lg shrink-0 mt-0.5", msg.retryCount >= 5 ? "bg-red-50 dark:bg-red-950/30" : "bg-amber-50 dark:bg-amber-950/30")}>
                      <AlertTriangle className={cn("h-4 w-4", msg.retryCount >= 5 ? "text-red-600" : "text-amber-600")} />
                    </div>

                    {/* Main content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={cn("rounded px-2 py-0.5 text-xs font-mono font-medium", queueColor)}>
                          {msg.queue}
                        </span>
                        <span className="text-xs font-mono text-muted-foreground bg-muted rounded px-2 py-0.5">
                          {msg.routingKey}
                        </span>
                        <span className={cn("text-xs font-medium ml-auto", RETRY_COLOR(msg.retryCount))}>
                          {msg.retryCount} retries
                        </span>
                      </div>
                      <p className="text-sm font-medium text-red-600 dark:text-red-400 truncate">
                        {msg.error}
                      </p>
                      <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                        <span>Failed {format(new Date(msg.failedAt), "MMM d, HH:mm")}</span>
                        <span>Original: {format(new Date(msg.originalTimestamp), "MMM d, HH:mm")}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs cursor-pointer"
                        onClick={() => replayMutation.mutate(msg.id)}
                        disabled={replayMutation.isPending}
                        title="Replay message"
                      >
                        <RotateCcw className="h-3.5 w-3.5 mr-1" />
                        Replay
                      </Button>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive cursor-pointer"
                            title="Delete message"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete DLQ Message?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently remove the message. This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteMutation.mutate(msg.id)}
                              className="bg-destructive hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>

                      <ChevronRight className={cn("h-4 w-4 text-muted-foreground transition-transform", isExpanded && "rotate-90")} />
                    </div>
                  </div>

                  {/* Expanded payload */}
                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-border">
                      <p className="text-xs font-medium text-muted-foreground mb-2">Message Payload</p>
                      <pre className="text-xs font-mono bg-muted/50 rounded-lg p-3 overflow-auto whitespace-pre-wrap break-all text-foreground">
                        {JSON.stringify(JSON.parse(msg.payload), null, 2)}
                      </pre>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
