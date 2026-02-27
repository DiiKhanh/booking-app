"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

interface CounterProps {
  label: string;
  value: number;
  unit?: string;
  icon: React.ReactNode;
  iconColor?: string;
  trend?: number;
  pulse?: boolean;
}

function useAnimatedCount(target: number, duration = 800) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const start = performance.now();
    const step = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration]);
  return count;
}

export function RealtimeCounter({
  label,
  value,
  unit,
  icon,
  iconColor = "bg-primary/10 text-primary",
  trend,
  pulse,
}: CounterProps) {
  const displayed = useAnimatedCount(value);

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow duration-200 group">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1 min-w-0">
            <p className="text-sm text-muted-foreground font-medium">{label}</p>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold font-heading text-foreground tabular-nums">
                {displayed.toLocaleString()}
              </span>
              {unit && (
                <span className="text-sm text-muted-foreground">{unit}</span>
              )}
            </div>
            {trend !== undefined && (
              <p
                className={cn(
                  "text-xs font-medium",
                  trend >= 0 ? "text-emerald-500" : "text-red-500"
                )}
              >
                {trend >= 0 ? "+" : ""}
                {trend}% from yesterday
              </p>
            )}
          </div>
          <div className={cn("relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", iconColor)}>
            {icon}
            {pulse && (
              <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500">
                <span className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-75" />
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
