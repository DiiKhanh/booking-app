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
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

type ServiceStatus = "healthy" | "degraded" | "down";

interface ServiceHealth {
  name: string;
  status: ServiceStatus;
  latency: number;
  uptime: number;
  icon: React.ElementType;
  details: string;
}

const INITIAL_SERVICES: ServiceHealth[] = [
  { name: "PostgreSQL", status: "healthy", latency: 12, uptime: 99.98, icon: Database, details: "16 active connections" },
  { name: "Redis", status: "healthy", latency: 2, uptime: 100, icon: HardDrive, details: "Memory: 48% used" },
  { name: "RabbitMQ", status: "degraded", latency: 45, uptime: 99.2, icon: Layers, details: "Queue depth: 1,234" },
  { name: "Elasticsearch", status: "healthy", latency: 18, uptime: 99.95, icon: Search, details: "3 shards, all green" },
  { name: "API Server", status: "healthy", latency: 8, uptime: 99.99, icon: Activity, details: "24 req/s avg" },
];

const STATUS_CONFIG: Record<
  ServiceStatus,
  { icon: React.ElementType; text: string; badge: "default" | "secondary" | "destructive"; color: string }
> = {
  healthy: { icon: CheckCircle, text: "Healthy", badge: "default", color: "text-emerald-500" },
  degraded: { icon: AlertTriangle, text: "Degraded", badge: "secondary", color: "text-amber-500" },
  down: { icon: XCircle, text: "Down", badge: "destructive", color: "text-red-500" },
};

export default function SystemHealthPage() {
  const [services, setServices] = useState(INITIAL_SERVICES);
  const [lastChecked, setLastChecked] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      // Simulate updated metrics
      setServices((prev) =>
        prev.map((s) => ({
          ...s,
          latency: s.latency + Math.floor((Math.random() - 0.5) * 5),
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

  const OverallIcon = STATUS_CONFIG[overallStatus].icon;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">System Health</h1>
          <p className="text-muted-foreground mt-1">
            Real-time status of all platform services
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={refresh}
          disabled={isRefreshing}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Overall status banner */}
      <Card className={`border-2 ${
        overallStatus === "healthy"
          ? "border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/20"
          : overallStatus === "degraded"
            ? "border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20"
            : "border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20"
      }`}>
        <CardContent className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <OverallIcon className={`w-6 h-6 ${STATUS_CONFIG[overallStatus].color}`} />
            <div>
              <p className="font-semibold">
                {overallStatus === "healthy"
                  ? "All Systems Operational"
                  : overallStatus === "degraded"
                    ? "Partial Degradation"
                    : "Service Outage"}
              </p>
              <p className="text-sm text-muted-foreground">
                {healthyCount} healthy · {degradedCount} degraded · {downCount} down
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="w-3.5 h-3.5" />
            Last checked: {lastChecked.toLocaleTimeString()}
          </div>
        </CardContent>
      </Card>

      {/* Service cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {services.map((service) => {
          const cfg = STATUS_CONFIG[service.status];
          const StatusIcon = cfg.icon;
          const ServiceIcon = service.icon;
          const latencyWarning = service.latency > 100;

          return (
            <Card key={service.name} className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-muted rounded-lg">
                      <ServiceIcon className="w-4 h-4 text-foreground" />
                    </div>
                    <div>
                      <p className="font-semibold">{service.name}</p>
                      <p className="text-xs text-muted-foreground">{service.details}</p>
                    </div>
                  </div>
                  <Badge variant={cfg.badge} className="flex items-center gap-1">
                    <StatusIcon className="w-3 h-3" />
                    {cfg.text}
                  </Badge>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Latency</span>
                    <span className={latencyWarning ? "text-amber-600 font-medium" : ""}>
                      {service.latency}ms
                    </span>
                  </div>
                  <Progress
                    value={Math.min(service.latency / 2, 100)}
                    className="h-1.5"
                  />

                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Uptime</span>
                    <span className="text-emerald-600 font-medium">
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

      {/* Metrics overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Avg Response Time", value: `${Math.round(services.reduce((s, r) => s + r.latency, 0) / services.length)}ms`, desc: "Across all services" },
          { label: "Requests/sec", value: "284", desc: "Last 5 minutes" },
          { label: "Error Rate", value: "0.02%", desc: "Last hour" },
          { label: "Active Connections", value: "1,428", desc: "Real-time" },
        ].map((m) => (
          <Card key={m.label}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{m.label}</p>
              <p className="text-xl font-bold mt-0.5">{m.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{m.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
