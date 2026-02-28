"use client";

import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Search,
  RefreshCw,
  ChevronRight,
  AlertTriangle,
  AlertCircle,
  Info,
  Bug,
  Filter,
  Download,
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
import { cn } from "@/lib/utils";
import { systemService, type EventLog } from "@/services/system.service";

type LogLevel = "info" | "warn" | "error" | "debug";

const MOCK_LOGS: EventLog[] = Array.from({ length: 30 }, (_, i) => {
  const levels: LogLevel[] = ["info", "info", "info", "warn", "error", "debug", "info", "warn"];
  const services = ["api", "payment", "booking", "notification", "worker", "auth", "search"];
  const messages = [
    "Payment processed successfully for booking #B-4821",
    "Booking created: room R-102 for user U-2841",
    "JWT token refreshed for user U-1024",
    "RabbitMQ queue depth elevated: 1,234 messages",
    "Payment timeout for booking #B-4102 after 30s",
    "Redis cache miss for key hotel:details:h-1024",
    "Health check passed: all services nominal",
    "Elasticsearch index refresh completed",
    "WebSocket client disconnected: user U-0821",
    "Rate limit exceeded for IP 103.21.244.0",
    "Database connection pool at 85% capacity",
    "Outbox processor: 42 events dispatched",
  ];
  const level = levels[i % levels.length];
  return {
    id: `log-${i}`,
    level,
    service: services[i % services.length],
    message: messages[i % messages.length],
    timestamp: new Date(Date.now() - i * 45 * 1000).toISOString(),
    metadata: level === "error" ? { stack: "Error: timeout\n  at PaymentService.process\n  at SagaOrchestrator.handleCheckout" } : undefined,
  };
});

const LEVEL_CONFIG: Record<LogLevel, { icon: React.ElementType; className: string; dotColor: string }> = {
  info: { icon: Info, className: "text-blue-600 bg-blue-50 dark:bg-blue-950/30 dark:text-blue-400", dotColor: "bg-blue-500" },
  warn: { icon: AlertTriangle, className: "text-amber-600 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400", dotColor: "bg-amber-500" },
  error: { icon: AlertCircle, className: "text-red-600 bg-red-50 dark:bg-red-950/30 dark:text-red-400", dotColor: "bg-red-500" },
  debug: { icon: Bug, className: "text-muted-foreground bg-muted", dotColor: "bg-muted-foreground" },
};

const SERVICE_COLORS: Record<string, string> = {
  api: "bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400",
  payment: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400",
  booking: "bg-purple-100 text-purple-700 dark:bg-purple-950/30 dark:text-purple-400",
  notification: "bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400",
  worker: "bg-orange-100 text-orange-700 dark:bg-orange-950/30 dark:text-orange-400",
  auth: "bg-slate-100 text-slate-700 dark:bg-slate-950/30 dark:text-slate-400",
  search: "bg-cyan-100 text-cyan-700 dark:bg-cyan-950/30 dark:text-cyan-400",
};

export default function EventLogsPage() {
  const [search, setSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState<LogLevel | "all">("all");
  const [serviceFilter, setServiceFilter] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["event-logs", levelFilter, serviceFilter],
    queryFn: () =>
      systemService.getLogs({
        level: levelFilter === "all" ? undefined : levelFilter,
        service: serviceFilter === "all" ? undefined : serviceFilter,
        limit: 50,
      }),
    placeholderData: {
      success: true,
      data: MOCK_LOGS,
      error: null,
      meta: { total: MOCK_LOGS.length, page: 1, limit: 50, totalPages: 1 },
    },
    refetchInterval: autoRefresh ? 10000 : false,
  });

  const logs = data?.data ?? MOCK_LOGS;

  const filtered = logs.filter((log) => {
    const matchLevel = levelFilter === "all" || log.level === levelFilter;
    const matchService = serviceFilter === "all" || log.service === serviceFilter;
    const matchSearch =
      !search ||
      log.message.toLowerCase().includes(search.toLowerCase()) ||
      log.service.toLowerCase().includes(search.toLowerCase());
    return matchLevel && matchService && matchSearch;
  });

  const services = [...new Set(MOCK_LOGS.map((l) => l.service))];

  const levelCounts = {
    error: logs.filter((l) => l.level === "error").length,
    warn: logs.filter((l) => l.level === "warn").length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Event Logs</h1>
          <p className="text-muted-foreground mt-1">
            Real-time system event stream
          </p>
        </div>
        <div className="flex items-center gap-2">
          {levelCounts.error > 0 && (
            <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
              <AlertCircle className="h-3 w-3 mr-1" />
              {levelCounts.error} errors
            </Badge>
          )}
          {levelCounts.warn > 0 && (
            <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
              <AlertTriangle className="h-3 w-3 mr-1" />
              {levelCounts.warn} warnings
            </Badge>
          )}
          <Button
            variant={autoRefresh ? "default" : "outline"}
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className="cursor-pointer"
          >
            <RefreshCw className={cn("h-4 w-4 mr-1.5", isFetching && "animate-spin")} />
            {autoRefresh ? "Live" : "Paused"}
          </Button>
          <Button variant="outline" size="sm" className="cursor-pointer">
            <Download className="h-4 w-4 mr-1.5" />
            Export
          </Button>
        </div>
      </div>

      {/* Level summary chips */}
      <div className="flex items-center gap-2 flex-wrap">
        {(["all", "info", "warn", "error", "debug"] as const).map((lvl) => {
          const count = lvl === "all" ? logs.length : logs.filter((l) => l.level === lvl).length;
          return (
            <button
              key={lvl}
              onClick={() => setLevelFilter(lvl)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors cursor-pointer border",
                levelFilter === lvl
                  ? "bg-foreground text-background border-foreground"
                  : "bg-background hover:bg-muted border-border"
              )}
            >
              {lvl !== "all" && <span className={`w-1.5 h-1.5 rounded-full ${LEVEL_CONFIG[lvl as LogLevel].dotColor}`} />}
              <span className="capitalize">{lvl}</span>
              <span className="opacity-60">({count})</span>
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-52">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search log messages..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 font-mono text-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <Select value={serviceFilter} onValueChange={setServiceFilter}>
            <SelectTrigger className="w-36 cursor-pointer">
              <SelectValue placeholder="All services" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Services</SelectItem>
              {services.map((s) => (
                <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <p className="text-sm text-muted-foreground">
          {filtered.length} entries
        </p>
      </div>

      {/* Log viewer */}
      {isLoading ? (
        <div className="space-y-1.5">
          {Array.from({ length: 12 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)}
        </div>
      ) : (
        <div className="border border-border rounded-xl overflow-hidden">
          {/* Terminal header */}
          <div className="flex items-center gap-2 px-4 py-2.5 bg-muted/40 border-b border-border">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-400" />
              <div className="w-3 h-3 rounded-full bg-amber-400" />
              <div className="w-3 h-3 rounded-full bg-emerald-400" />
            </div>
            <span className="text-xs font-mono text-muted-foreground ml-2">
              system.log — {filtered.length} lines
            </span>
            {autoRefresh && (
              <div className="ml-auto flex items-center gap-1.5 text-xs text-emerald-600">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live
              </div>
            )}
          </div>

          <div className="divide-y divide-border/50 max-h-[600px] overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                <Info className="h-8 w-8 mx-auto mb-2 opacity-40" />
                <p>No log entries match your filters</p>
              </div>
            ) : (
              filtered.map((log) => {
                const cfg = LEVEL_CONFIG[log.level];
                const LevelIcon = cfg.icon;
                const isExpanded = expandedId === log.id;

                return (
                  <div
                    key={log.id}
                    className={cn(
                      "group cursor-pointer transition-colors hover:bg-muted/20",
                      isExpanded && "bg-muted/30"
                    )}
                    onClick={() => setExpandedId(isExpanded ? null : log.id)}
                  >
                    <div className="flex items-center gap-3 px-4 py-2.5">
                      {/* Level indicator */}
                      <div className={cn("flex items-center justify-center w-5 h-5 rounded shrink-0", cfg.className)}>
                        <LevelIcon className="h-3 w-3" />
                      </div>

                      {/* Timestamp */}
                      <span className="font-mono text-xs text-muted-foreground shrink-0 w-32">
                        {format(new Date(log.timestamp), "HH:mm:ss.SSS")}
                      </span>

                      {/* Service badge */}
                      <span className={cn("rounded px-1.5 py-0.5 text-xs font-medium font-mono shrink-0", SERVICE_COLORS[log.service] ?? "bg-muted text-muted-foreground")}>
                        {log.service}
                      </span>

                      {/* Message */}
                      <span className="text-sm font-mono flex-1 truncate">{log.message}</span>

                      {/* Expand icon */}
                      {log.metadata && (
                        <ChevronRight className={cn("h-4 w-4 text-muted-foreground shrink-0 transition-transform", isExpanded && "rotate-90")} />
                      )}
                    </div>

                    {/* Expanded metadata */}
                    {isExpanded && log.metadata && (
                      <div className="px-4 pb-3">
                        <Card>
                          <CardContent className="p-3">
                            <pre className="text-xs font-mono text-muted-foreground whitespace-pre-wrap break-all">
                              {JSON.stringify(log.metadata, null, 2)}
                            </pre>
                          </CardContent>
                        </Card>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  );
}
