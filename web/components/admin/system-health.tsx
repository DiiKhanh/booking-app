"use client";

import { Database, Cpu, Layers, Search, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

type ServiceStatus = "healthy" | "degraded" | "down";

interface Service {
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  status: ServiceStatus;
  latency: number;
  uptime: number;
}

const services: Service[] = [
  { name: "PostgreSQL", icon: Database, status: "healthy", latency: 4, uptime: 99.98 },
  { name: "Redis", icon: Cpu, status: "healthy", latency: 1, uptime: 99.99 },
  { name: "RabbitMQ", icon: Layers, status: "degraded", latency: 48, uptime: 98.4 },
  { name: "Elasticsearch", icon: Search, status: "healthy", latency: 12, uptime: 99.92 },
];

const statusConfig: Record<ServiceStatus, {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  color: string;
  bg: string;
}> = {
  healthy: {
    icon: CheckCircle2,
    label: "Healthy",
    color: "text-emerald-500",
    bg: "bg-emerald-100 dark:bg-emerald-900/30",
  },
  degraded: {
    icon: AlertTriangle,
    label: "Degraded",
    color: "text-amber-500",
    bg: "bg-amber-100 dark:bg-amber-900/30",
  },
  down: {
    icon: XCircle,
    label: "Down",
    color: "text-red-500",
    bg: "bg-red-100 dark:bg-red-900/30",
  },
};

export function SystemHealth() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold font-heading">
            System Health
          </CardTitle>
          <Badge variant="secondary" className="text-xs">
            Live
            <span className="ml-1.5 h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {services.map((service) => {
          const config = statusConfig[service.status];
          const StatusIcon = config.icon;
          const ServiceIcon = service.icon;

          return (
            <div
              key={service.name}
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg border border-border/50 transition-colors duration-150",
                service.status === "healthy" && "hover:border-emerald-200 dark:hover:border-emerald-800",
                service.status === "degraded" && "hover:border-amber-200 dark:hover:border-amber-800 border-amber-200 dark:border-amber-800/50",
                service.status === "down" && "hover:border-red-200 dark:hover:border-red-800 border-red-200"
              )}
            >
              <div
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-md",
                  config.bg
                )}
              >
                <ServiceIcon className={cn("h-4 w-4", config.color)} />
              </div>

              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">
                    {service.name}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <StatusIcon className={cn("h-3.5 w-3.5", config.color)} />
                    <span className={cn("text-xs font-medium", config.color)}>
                      {config.label}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{service.latency}ms</span>
                  <span>{service.uptime}% uptime</span>
                </div>
                <Progress
                  value={service.uptime}
                  className={cn(
                    "h-1",
                    service.status === "healthy" && "[&>div]:bg-emerald-500",
                    service.status === "degraded" && "[&>div]:bg-amber-500",
                    service.status === "down" && "[&>div]:bg-red-500"
                  )}
                />
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
