"use client";

import { useEffect, useState } from "react";
import {
  CheckCircle,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Clock,
  Activity,
  Database,
  HardDrive,
  Layers,
  Search,
  Gauge,
  Zap,
  Globe,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

type ServiceStatus = "healthy" | "degraded" | "down";

interface ServiceHealth {
  name: string;
  status: ServiceStatus;
  latency: number;
  uptime: number;
  icon: React.ElementType;
  details: string;
  category: string;
}

const INITIAL_SERVICES: ServiceHealth[] = [
  {
    name: "PostgreSQL",
    status: "healthy",
    latency: 12,
    uptime: 99.98,
    icon: Database,
    details: "16 active connections",
    category: "Storage",
  },
  {
    name: "Redis",
    status: "healthy",
    latency: 2,
    uptime: 100,
    icon: HardDrive,
    details: "Memory: 48% used",
    category: "Cache",
  },
  {
    name: "RabbitMQ",
    status: "degraded",
    latency: 45,
    uptime: 99.2,
    icon: Layers,
    details: "Queue depth: 1,234",
    category: "Messaging",
  },
  {
    name: "Elasticsearch",
    status: "healthy",
    latency: 18,
    uptime: 99.95,
    icon: Search,
    details: "3 shards, all green",
    category: "Search",
  },
  {
    name: "API Server",
    status: "healthy",
    latency: 8,
    uptime: 99.99,
    icon: Activity,
    details: "24 req/s avg",
    category: "Application",
  },
];

const STATUS_CONFIG = {
  healthy: {
    icon: CheckCircle,
    label: "Healthy",
    dotCls: "bg-emerald-500",
    pulseCls: "bg-emerald-500/30",
    textCls: "text-emerald-600 dark:text-emerald-400",
    badgeCls:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400",
  },
  degraded: {
    icon: AlertTriangle,
    label: "Degraded",
    dotCls: "bg-amber-500",
    pulseCls: "bg-amber-500/30",
    textCls: "text-amber-600 dark:text-amber-400",
    badgeCls:
      "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400",
  },
  down: {
    icon: XCircle,
    label: "Down",
    dotCls: "bg-red-500",
    pulseCls: "bg-red-500/30",
    textCls: "text-red-600 dark:text-red-400",
    badgeCls:
      "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400",
  },
};

function StatusDot({ status }: { status: ServiceStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <div className="relative flex items-center justify-center w-3 h-3">
      {status !== "down" && (
        <span
          className={cn(
            "absolute w-full h-full rounded-full animate-ping opacity-75",
            cfg.pulseCls
          )}
        />
      )}
      <span className={cn("w-2.5 h-2.5 rounded-full relative z-10", cfg.dotCls)} />
    </div>
  );
}

export default function SystemHealthPage() {
  const [services, setServices] = useState(INITIAL_SERVICES);
  const [lastChecked, setLastChecked] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setServices((prev) =>
        prev.map((s) => ({
          ...s,
          latency: Math.max(1, s.latency + Math.floor((Math.random() - 0.5) * 5)),
        }))
      );
      setLastChecked(new Date());
      setIsRefreshing(false);
    }, 1000);
  };

  useEffect(() => {
    const interval = setInterval(refresh, 30000);
    return () => clearInterval(interval);
  }, []);

  const healthyCount = services.filter((s) => s.status === "healthy").length;
  const degradedCount = services.filter((s) => s.status === "degraded").length;
  const downCount = services.filter((s) => s.status === "down").length;
  const overallStatus: ServiceStatus =
    downCount > 0 ? "down" : degradedCount > 0 ? "degraded" : "healthy";
  const avgLatency = Math.round(
    services.reduce((s, r) => s + r.latency, 0) / services.length
  );

  const OverallCfg = STATUS_CONFIG[overallStatus];
  const OverallIcon = OverallCfg.icon;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* ── Header ──────────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold font-heading tracking-tight">
            System Health
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Real-time status of all platform services
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={refresh}
          disabled={isRefreshing}
          className="cursor-pointer"
        >
          <RefreshCw
            className={cn("w-4 h-4 mr-2", isRefreshing && "animate-spin")}
          />
          Refresh
        </Button>
      </div>

      {/* ── Overall status banner ────────────────────────────── */}
      <div
        className={cn(
          "relative overflow-hidden rounded-2xl border-2 p-5 flex items-center justify-between",
          overallStatus === "healthy" &&
            "border-emerald-200 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-950/20",
          overallStatus === "degraded" &&
            "border-amber-200 dark:border-amber-800 bg-amber-50/60 dark:bg-amber-950/20",
          overallStatus === "down" &&
            "border-red-200 dark:border-red-800 bg-red-50/60 dark:bg-red-950/20"
        )}
      >
        {/* Background glow */}
        <div
          className={cn(
            "pointer-events-none absolute -right-8 -top-8 w-40 h-40 rounded-full opacity-20",
            overallStatus === "healthy" && "bg-emerald-400",
            overallStatus === "degraded" && "bg-amber-400",
            overallStatus === "down" && "bg-red-400"
          )}
          style={{ filter: "blur(40px)" }}
        />
        <div className="relative z-10 flex items-center gap-4">
          <div
            className={cn(
              "p-3 rounded-xl",
              overallStatus === "healthy" &&
                "bg-emerald-100 dark:bg-emerald-950/40",
              overallStatus === "degraded" &&
                "bg-amber-100 dark:bg-amber-950/40",
              overallStatus === "down" && "bg-red-100 dark:bg-red-950/40"
            )}
          >
            <OverallIcon className={cn("w-6 h-6", OverallCfg.textCls)} />
          </div>
          <div>
            <p className="font-semibold text-lg leading-tight">
              {overallStatus === "healthy" && "All Systems Operational"}
              {overallStatus === "degraded" && "Partial Service Degradation"}
              {overallStatus === "down" && "Service Outage Detected"}
            </p>
            <p className="text-sm text-muted-foreground mt-0.5">
              {healthyCount} healthy · {degradedCount} degraded · {downCount}{" "}
              down
            </p>
          </div>
        </div>
        <div className="relative z-10 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="w-3.5 h-3.5" />
          Last checked {lastChecked.toLocaleTimeString()}
        </div>
      </div>

      {/* ── Metrics strip ────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          {
            label: "Avg Latency",
            value: `${avgLatency}ms`,
            icon: Gauge,
            sub: "Across all services",
            good: avgLatency < 50,
          },
          {
            label: "Requests/sec",
            value: "284",
            icon: Zap,
            sub: "Last 5 minutes",
            good: true,
          },
          {
            label: "Error Rate",
            value: "0.02%",
            icon: AlertTriangle,
            sub: "Last hour",
            good: true,
          },
          {
            label: "Connections",
            value: "1,428",
            icon: Globe,
            sub: "Active right now",
            good: true,
          },
        ].map((m) => {
          const Icon = m.icon;
          return (
            <Card key={m.label} className="border-border">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <p className="text-xs text-muted-foreground">{m.label}</p>
                  <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                </div>
                <p
                  className={cn(
                    "text-2xl font-bold leading-none",
                    m.good ? "text-foreground" : "text-amber-600"
                  )}
                >
                  {m.value}
                </p>
                <p className="text-xs text-muted-foreground mt-1.5">{m.sub}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* ── Service cards ────────────────────────────────────── */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Services
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {services.map((service) => {
            const cfg = STATUS_CONFIG[service.status];
            const ServiceIcon = service.icon;
            const latencyHigh = service.latency > 100;
            const latencyMedium = service.latency > 50;

            return (
              <Card
                key={service.name}
                className="hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 cursor-default"
              >
                <CardContent className="p-5">
                  {/* Top row */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-muted rounded-xl">
                        <ServiceIcon className="w-4 h-4 text-foreground" />
                      </div>
                      <div>
                        <p className="font-semibold leading-tight">
                          {service.name}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {service.category}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <StatusDot status={service.status} />
                      <span className={cn("text-xs font-medium", cfg.textCls)}>
                        {cfg.label}
                      </span>
                    </div>
                  </div>

                  {/* Details line */}
                  <p className="text-xs text-muted-foreground mb-4 font-mono bg-muted/50 rounded-md px-2.5 py-1.5">
                    {service.details}
                  </p>

                  {/* Latency metric */}
                  <div className="space-y-1.5 mb-3">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Latency</span>
                      <span
                        className={cn(
                          "font-medium",
                          latencyHigh
                            ? "text-red-600"
                            : latencyMedium
                              ? "text-amber-600"
                              : "text-emerald-600"
                        )}
                      >
                        {service.latency}ms
                      </span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-500",
                          latencyHigh
                            ? "bg-red-500"
                            : latencyMedium
                              ? "bg-amber-500"
                              : "bg-emerald-500"
                        )}
                        style={{ width: `${Math.min((service.latency / 200) * 100, 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Uptime metric */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Uptime</span>
                      <span className="font-medium text-foreground">
                        {service.uptime}%
                      </span>
                    </div>
                    <Progress value={service.uptime} className="h-1.5" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
