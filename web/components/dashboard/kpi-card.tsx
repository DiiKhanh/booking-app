"use client";

import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";

interface KpiCardProps {
  title: string;
  value: string;
  change?: number;
  changeLabel?: string;
  icon: React.ReactNode;
  iconColor?: string;
  loading?: boolean;
}

export function KpiCard({
  title,
  value,
  change,
  changeLabel = "vs last month",
  icon,
  iconColor = "bg-primary/10 text-primary",
  loading = false,
}: KpiCardProps) {
  const isPositive = change !== undefined && change > 0;
  const isNegative = change !== undefined && change < 0;

  if (loading) {
    return (
      <Card className="overflow-hidden">
        <CardContent className="p-5">
          <div className="space-y-3">
            <div className="h-4 w-24 bg-muted animate-pulse rounded" />
            <div className="h-8 w-32 bg-muted animate-pulse rounded" />
            <div className="h-3 w-20 bg-muted animate-pulse rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow duration-200 group">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1 min-w-0">
            <p className="text-sm text-muted-foreground font-medium truncate">
              {title}
            </p>
            <p className="text-2xl font-bold font-heading text-foreground animate-count">
              {value}
            </p>
            {change !== undefined && (
              <div className="flex items-center gap-1">
                {isPositive && (
                  <TrendingUp className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                )}
                {isNegative && (
                  <TrendingDown className="h-3.5 w-3.5 text-red-500 shrink-0" />
                )}
                {!isPositive && !isNegative && (
                  <Minus className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                )}
                <span
                  className={cn(
                    "text-xs font-semibold",
                    isPositive && "text-emerald-500",
                    isNegative && "text-red-500",
                    !isPositive && !isNegative && "text-muted-foreground"
                  )}
                >
                  {isPositive && "+"}
                  {change?.toFixed(1)}%
                </span>
                <span className="text-xs text-muted-foreground">
                  {changeLabel}
                </span>
              </div>
            )}
          </div>

          <div
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
              iconColor,
              "group-hover:scale-110 transition-transform duration-200"
            )}
          >
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
