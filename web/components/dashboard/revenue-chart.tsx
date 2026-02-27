"use client";

import { useState } from "react";
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const weekData = [
  { name: "Mon", revenue: 4200, bookings: 18 },
  { name: "Tue", revenue: 5800, bookings: 24 },
  { name: "Wed", revenue: 3900, bookings: 16 },
  { name: "Thu", revenue: 7100, bookings: 30 },
  { name: "Fri", revenue: 9400, bookings: 42 },
  { name: "Sat", revenue: 12800, bookings: 56 },
  { name: "Sun", revenue: 11200, bookings: 48 },
];

const monthData = [
  { name: "W1", revenue: 28000, bookings: 124 },
  { name: "W2", revenue: 35000, bookings: 148 },
  { name: "W3", revenue: 31000, bookings: 132 },
  { name: "W4", revenue: 42000, bookings: 186 },
];

const yearData = [
  { name: "Jan", revenue: 98000, bookings: 420 },
  { name: "Feb", revenue: 87000, bookings: 380 },
  { name: "Mar", revenue: 112000, bookings: 495 },
  { name: "Apr", revenue: 125000, bookings: 540 },
  { name: "May", revenue: 148000, bookings: 628 },
  { name: "Jun", revenue: 165000, bookings: 712 },
  { name: "Jul", revenue: 182000, bookings: 790 },
  { name: "Aug", revenue: 195000, bookings: 845 },
  { name: "Sep", revenue: 158000, bookings: 685 },
  { name: "Oct", revenue: 142000, bookings: 614 },
  { name: "Nov", revenue: 128000, bookings: 558 },
  { name: "Dec", revenue: 176000, bookings: 762 },
];

type Period = "week" | "month" | "year";

const periodData: Record<Period, typeof weekData> = {
  week: weekData,
  month: monthData,
  year: yearData,
};

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-popover p-3 shadow-lg text-xs space-y-1.5">
      <p className="font-semibold text-foreground">{label}</p>
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-1.5">
            <div
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-muted-foreground capitalize">{entry.name}</span>
          </div>
          <span className="font-semibold text-foreground">
            {entry.name === "revenue"
              ? `$${entry.value.toLocaleString()}`
              : entry.value}
          </span>
        </div>
      ))}
    </div>
  );
}

export function RevenueChart() {
  const [period, setPeriod] = useState<Period>("week");
  const data = periodData[period];

  return (
    <Card className="col-span-2">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-base font-semibold font-heading">
          Revenue & Bookings
        </CardTitle>
        <div className="flex items-center gap-1 rounded-lg border border-border p-0.5">
          {(["week", "month", "year"] as Period[]).map((p) => (
            <Button
              key={p}
              variant="ghost"
              size="sm"
              onClick={() => setPeriod(p)}
              className={cn(
                "h-7 px-2.5 text-xs capitalize cursor-pointer transition-colors duration-150",
                period === p &&
                  "bg-background shadow-sm text-foreground font-medium"
              )}
            >
              {p}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={280}>
          <ComposedChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              yAxisId="revenue"
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
            />
            <YAxis
              yAxisId="bookings"
              orientation="right"
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar
              yAxisId="bookings"
              dataKey="bookings"
              fill="hsl(var(--chart-1) / 0.15)"
              stroke="hsl(var(--chart-1) / 0.3)"
              radius={[4, 4, 0, 0]}
              maxBarSize={32}
            />
            <Line
              yAxisId="revenue"
              type="monotone"
              dataKey="revenue"
              stroke="hsl(var(--chart-1))"
              strokeWidth={2.5}
              dot={{ fill: "hsl(var(--chart-1))", r: 3, strokeWidth: 0 }}
              activeDot={{ r: 5, fill: "hsl(var(--chart-1))" }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
