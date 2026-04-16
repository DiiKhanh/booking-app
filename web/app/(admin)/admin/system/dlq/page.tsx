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
  ChevronDown,
  Clock,
  Info,
  Layers,
  Hash,
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
  {
    id: "dlq-1",
    queue: "payment.events",
    routingKey: "payment.initiated",
    payload: '{"bookingId":"B-4821","amount":660,"currency":"USD","userId":"U-1024"}',
    error: "PaymentGateway: Connection timeout after 30000ms",
    retryCount: 3,
    failedAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    originalTimestamp: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
  },
  {
    id: "dlq-2",
    queue: "notification.events",
    routingKey: "notification.new",
    payload:
      '{"userId":"U-0821","type":"booking_confirmed","bookingId":"B-4102"}',
    error: "NotificationService: SMTP connection refused",
    retryCount: 5,
    failedAt: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
    originalTimestamp: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
  },
  {
    id: "dlq-3",
    queue: "payment.events",
    routingKey: "payment.succeeded",
    payload:
      '{"bookingId":"B-3904","amount":1280,"userId":"U-2048"}',
    error: "SagaOrchestrator: Booking not found for update",
    retryCount: 2,
    failedAt: new Date(Date.now() - 6 * 3600 * 1000).toISOString(),
    originalTimestamp: new Date(Date.now() - 7 * 3600 * 1000).toISOString(),
  },
  {
    id: "dlq-4",
    queue: "booking.notifications",
    routingKey: "booking_status_updated",
    payload:
      '{"userId":"U-1832","bookingId":"B-4511","status":"confirmed"}',
    error: "WebSocketHub: User not connected",
    retryCount: 1,
    failedAt: new Date(Date.now() - 8 * 3600 * 1000).toISOString(),
    originalTimestamp: new Date(Date.now() - 8.5 * 3600 * 1000).toISOString(),
  },
  {
    id: "dlq-5",
    queue: "payment.events",
    routingKey: "payment.failed",
    payload:
      '{"bookingId":"B-4388","reason":"insufficient_funds","userId":"U-0984"}',
    error: "CompensatingService: Failed to release inventory lock",
    retryCount: 4,
    failedAt: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
    originalTimestamp: new Date(Date.now() - 13 * 3600 * 1000).toISOString(),
  },
];

const QUEUE_CONFIG: Record<
  string,
  { color: string; dot: string }
> = {
  "payment.events": {
    color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400",
    dot: "bg-emerald-500",
  },
  "notification.events": {
    color: "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400",
    dot: "bg-blue-500",
  },
  "booking.notifications": {
    color: "bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400",
    dot: "bg-purple-500",
  },
};

const DEFAULT_QUEUE = {
  color: "bg-muted text-muted-foreground",
  dot: "bg-muted-foreground",
};

function retrySeverity(count: number): "critical" | "warning" | "info" {
  if (count >= 5) return "critical";
  if (count >= 3) return "warning";
  return "info";
}

const SEVERITY_STYLE = {
  critical: {
    border: "border-l-red-500",
    iconBg: "bg-red-50 dark:bg-red-950/30",
    iconColor: "text-red-600",
    retryColor: "text-red-600 dark:text-red-400 font-semibold",
    badge: "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400",
  },
  warning: {
    border: "border-l-amber-500",
    iconBg: "bg-amber-50 dark:bg-amber-950/30",
    iconColor: "text-amber-600",
    retryColor: "text-amber-600 dark:text-amber-400 font-medium",
    badge: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400",
  },
  info: {
    border: "border-l-muted-foreground/30",
    iconBg: "bg-muted",
    iconColor: "text-muted-foreground",
    retryColor: "text-muted-foreground",
    badge: "bg-muted text-muted-foreground",
  },
};

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

  const criticalCount = messages.filter((m) => m.retryCount >= 5).length;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* ── Header ──────────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold font-heading tracking-tight">
            Dead Letter Queue
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Failed messages requiring manual intervention
          </p>
        </div>
        <div className="flex items-center gap-2">
          {criticalCount > 0 && (
            <Badge className="bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400 gap-1.5">
              <AlertTriangle className="h-3 w-3" />
              {criticalCount} critical
            </Badge>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="cursor-pointer"
          >
            <RefreshCw
              className={cn("h-4 w-4 mr-1.5", isFetching && "animate-spin")}
            />
            Refresh
          </Button>
        </div>
      </div>

      {/* ── Summary cards ───────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          {
            label: "Total Messages",
            value: messages.length,
            icon: Layers,
            color: "text-amber-600",
            bg: "bg-amber-50 dark:bg-amber-950/30",
          },
          {
            label: "Queues Affected",
            value: queues.length,
            icon: Hash,
            color: "text-blue-600",
            bg: "bg-blue-50 dark:bg-blue-950/30",
          },
          {
            label: "Critical (≥5 retries)",
            value: criticalCount,
            icon: AlertTriangle,
            color: "text-red-600",
            bg: "bg-red-50 dark:bg-red-950/30",
          },
          {
            label: "Oldest Message",
            value: "13h ago",
            icon: Clock,
            color: "text-purple-600",
            bg: "bg-purple-50 dark:bg-purple-950/30",
          },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="border-border">
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`p-2.5 rounded-xl shrink-0 ${stat.bg}`}>
                  <Icon className={`w-4 h-4 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground leading-tight">
                    {stat.label}
                  </p>
                  <p className="font-bold text-xl leading-tight mt-0.5">
                    {stat.value}
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* ── Info banner ─────────────────────────────────────── */}
      <div className="flex items-start gap-3 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50/60 dark:bg-amber-950/10 px-4 py-3">
        <Info className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
        <p className="text-sm text-amber-800 dark:text-amber-300/80">
          <span className="font-semibold">DLQ Overview —</span> Messages are
          moved here after exhausting all retry attempts. Review, fix the
          underlying issue, then replay or delete.
        </p>
      </div>

      {/* ── Filters ─────────────────────────────────────────── */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-52">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search routing key, error…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 font-mono text-sm bg-background"
          />
        </div>
        <Select value={queueFilter} onValueChange={setQueueFilter}>
          <SelectTrigger className="w-48 cursor-pointer">
            <SelectValue placeholder="All queues" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Queues</SelectItem>
            {queues.map((q) => {
              const qcfg = QUEUE_CONFIG[q] ?? DEFAULT_QUEUE;
              return (
                <SelectItem key={q} value={q}>
                  <div className="flex items-center gap-2">
                    <span className={cn("w-1.5 h-1.5 rounded-full", qcfg.dot)} />
                    <span className="font-mono text-xs">{q}</span>
                  </div>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
        <p className="text-sm text-muted-foreground">
          {filtered.length} message{filtered.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* ── Message list ────────────────────────────────────── */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-16 flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
              <AlertTriangle className="h-6 w-6 text-muted-foreground/40" />
            </div>
            <p className="font-semibold">No messages found</p>
            <p className="text-sm text-muted-foreground mt-1">
              {messages.length === 0
                ? "Dead letter queue is empty — all messages processed successfully!"
                : "No messages match your current filters"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2.5">
          {filtered.map((msg) => {
            const isExpanded = expandedId === msg.id;
            const severity = retrySeverity(msg.retryCount);
            const sty = SEVERITY_STYLE[severity];
            const qcfg = QUEUE_CONFIG[msg.queue] ?? DEFAULT_QUEUE;

            return (
              <Card
                key={msg.id}
                className={cn(
                  "overflow-hidden transition-all duration-200 hover:shadow-md border-l-4",
                  sty.border
                )}
              >
                <CardContent className="p-4">
                  {/* Main row */}
                  <div
                    className="flex items-start gap-3 cursor-pointer"
                    onClick={() => setExpandedId(isExpanded ? null : msg.id)}
                  >
                    {/* Severity icon */}
                    <div
                      className={cn(
                        "p-2 rounded-lg shrink-0 mt-0.5",
                        sty.iconBg
                      )}
                    >
                      <AlertTriangle
                        className={cn("h-4 w-4", sty.iconColor)}
                      />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 space-y-1.5">
                      {/* Tags row */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full",
                            qcfg.color
                          )}
                        >
                          <span className={cn("w-1.5 h-1.5 rounded-full", qcfg.dot)} />
                          {msg.queue}
                        </span>
                        <span className="text-xs font-mono bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                          {msg.routingKey}
                        </span>
                        <Badge
                          className={cn("text-xs h-5 ml-auto shrink-0", sty.badge)}
                        >
                          <RotateCcw className="h-2.5 w-2.5 mr-1" />
                          {msg.retryCount}{" "}
                          {msg.retryCount === 1 ? "retry" : "retries"}
                        </Badge>
                      </div>

                      {/* Error */}
                      <p className="text-sm font-mono text-destructive truncate">
                        {msg.error}
                      </p>

                      {/* Timestamps */}
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Failed{" "}
                          {format(new Date(msg.failedAt), "MMM d, HH:mm")}
                        </span>
                        <span>
                          Origin:{" "}
                          {format(
                            new Date(msg.originalTimestamp),
                            "MMM d, HH:mm"
                          )}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div
                      className="flex items-center gap-1 shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs cursor-pointer"
                        onClick={() => replayMutation.mutate(msg.id)}
                        disabled={replayMutation.isPending}
                        title="Replay message"
                      >
                        <RotateCcw className="h-3 w-3 mr-1.5" />
                        Replay
                      </Button>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                            title="Delete message"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              Delete DLQ Message?
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              This permanently removes the message from the
                              queue. This action cannot be undone.
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

                      <ChevronDown
                        className={cn(
                          "h-4 w-4 text-muted-foreground transition-transform duration-200 shrink-0",
                          isExpanded && "rotate-180"
                        )}
                      />
                    </div>
                  </div>

                  {/* Expanded payload */}
                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-border">
                      <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
                        Message Payload
                      </p>
                      <pre className="text-xs font-mono bg-muted/60 border border-border rounded-lg p-3.5 overflow-auto whitespace-pre text-foreground max-h-48">
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
