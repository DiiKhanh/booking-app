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
  AreaChart,
  Area,
} from "recharts";
import { TrendingUp, TrendingDown, BarChart3, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type Period = "7d" | "30d" | "90d" | "year";

const REVENUE_DATA: Record<Period, { label: string; revenue: number; bookings: number }[]> = {
  "7d": [
    { label: "Mon", revenue: 1200, bookings: 4 },
    { label: "Tue", revenue: 1890, bookings: 6 },
    { label: "Wed", revenue: 980, bookings: 3 },
    { label: "Thu", revenue: 2100, bookings: 7 },
    { label: "Fri", revenue: 3200, bookings: 10 },
    { label: "Sat", revenue: 4100, bookings: 13 },
    { label: "Sun", revenue: 3500, bookings: 11 },
  ],
  "30d": Array.from({ length: 30 }, (_, i) => ({
    label: `Day ${i + 1}`,
    revenue: 800 + Math.random() * 3000,
    bookings: 2 + Math.floor(Math.random() * 12),
  })),
  "90d": Array.from({ length: 12 }, (_, i) => ({
    label: `Week ${i + 1}`,
    revenue: 8000 + Math.random() * 20000,
    bookings: 20 + Math.floor(Math.random() * 80),
  })),
  year: [
    { label: "Jan", revenue: 42000, bookings: 180 },
    { label: "Feb", revenue: 38000, bookings: 162 },
    { label: "Mar", revenue: 51000, bookings: 220 },
    { label: "Apr", revenue: 58000, bookings: 248 },
    { label: "May", revenue: 64000, bookings: 272 },
    { label: "Jun", revenue: 72000, bookings: 310 },
    { label: "Jul", revenue: 89000, bookings: 382 },
    { label: "Aug", revenue: 94000, bookings: 404 },
    { label: "Sep", revenue: 76000, bookings: 324 },
    { label: "Oct", revenue: 68000, bookings: 290 },
    { label: "Nov", revenue: 55000, bookings: 236 },
    { label: "Dec", revenue: 82000, bookings: 352 },
  ],
};

const OCCUPANCY_DATA = Array.from({ length: 30 }, (_, i) => ({
  date: `Mar ${i + 1}`,
  "Grand Palace": 60 + Math.random() * 35,
  "Sunrise Beach": 55 + Math.random() * 40,
  "Mountain View": 20 + Math.random() * 45,
}));

const PERIOD_BUTTONS: { value: Period; label: string }[] = [
  { value: "7d", label: "7D" },
  { value: "30d", label: "30D" },
  { value: "90d", label: "90D" },
  { value: "year", label: "Year" },
];

const KPI_ITEMS = [
  {
    label: "Total Revenue",
    value: "$245,800",
    trend: "+18.2%",
    positive: true,
    icon: TrendingUp,
  },
  {
    label: "Avg Occupancy",
    value: "72%",
    trend: "+5.4%",
    positive: true,
    icon: BarChart3,
  },
  {
    label: "Bookings",
    value: "1,248",
    trend: "+12.1%",
    positive: true,
    icon: Calendar,
  },
  {
    label: "Avg Daily Rate",
    value: "$165",
    trend: "-2.3%",
    positive: false,
    icon: TrendingDown,
  },
];

export default function AnalyticsPage() {
  const [period, setPeriod] = useState<Period>("30d");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground mt-1">
            Performance metrics across all your properties
          </p>
        </div>
        <div className="flex items-center gap-1 border border-border rounded-lg p-1">
          {PERIOD_BUTTONS.map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors cursor-pointer ${
                period === p.value
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {KPI_ITEMS.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Card key={kpi.label}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-muted-foreground">{kpi.label}</p>
                  <Icon className="w-4 h-4 text-muted-foreground" />
                </div>
                <p className="text-2xl font-bold">{kpi.value}</p>
                <Badge
                  variant={kpi.positive ? "default" : "destructive"}
                  className="mt-2 text-xs"
                >
                  {kpi.trend} vs last period
                </Badge>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Revenue chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Revenue & Bookings</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={320}>
            <ComposedChart data={REVENUE_DATA[period]}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
              />
              <YAxis
                yAxisId="revenue"
                orientation="left"
                tick={{ fontSize: 12 }}
                tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
              />
              <YAxis
                yAxisId="bookings"
                orientation="right"
                tick={{ fontSize: 12 }}
              />
              <Tooltip
                formatter={(value, name) =>
                  name === "revenue"
                    ? [`$${Number(value).toLocaleString()}`, "Revenue"]
                    : [value, "Bookings"]
                }
              />
              <Legend />
              <Bar
                yAxisId="bookings"
                dataKey="bookings"
                fill="hsl(var(--chart-2))"
                radius={[4, 4, 0, 0]}
                opacity={0.8}
                name="Bookings"
              />
              <Line
                yAxisId="revenue"
                type="monotone"
                dataKey="revenue"
                stroke="hsl(var(--chart-1))"
                strokeWidth={2}
                dot={false}
                name="Revenue"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Occupancy by property */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Occupancy Rate by Property (%)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={OCCUPANCY_DATA}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11 }}
                interval={4}
              />
              <YAxis
                tick={{ fontSize: 12 }}
                tickFormatter={(v) => `${v}%`}
                domain={[0, 100]}
              />
              <Tooltip formatter={(v) => [`${Number(v).toFixed(1)}%`]} />
              <Legend />
              <Area
                type="monotone"
                dataKey="Grand Palace"
                stroke="hsl(var(--chart-1))"
                fill="hsl(var(--chart-1))"
                fillOpacity={0.15}
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="Sunrise Beach"
                stroke="hsl(var(--chart-2))"
                fill="hsl(var(--chart-2))"
                fillOpacity={0.15}
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="Mountain View"
                stroke="hsl(var(--chart-3))"
                fill="hsl(var(--chart-3))"
                fillOpacity={0.15}
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Room type revenue breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Revenue by Room Type</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { type: "Suite", pct: 42, revenue: 103236, color: "bg-chart-1" },
                { type: "Deluxe", pct: 31, revenue: 76198, color: "bg-chart-2" },
                { type: "Standard", pct: 20, revenue: 49160, color: "bg-chart-3" },
                { type: "Penthouse", pct: 7, revenue: 17206, color: "bg-chart-4" },
              ].map((item) => (
                <div key={item.type} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{item.type}</span>
                    <span className="text-muted-foreground">
                      ${item.revenue.toLocaleString()} ({item.pct}%)
                    </span>
                  </div>
                  <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full"
                      style={{ width: `${item.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top Performing Months</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { month: "August 2026", revenue: 94000, change: "+18%" },
                { month: "July 2026", revenue: 89000, change: "+12%" },
                { month: "December 2025", revenue: 82000, change: "+22%" },
                { month: "June 2026", revenue: 72000, change: "+8%" },
              ].map((item) => (
                <div key={item.month} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{item.month}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">
                      ${item.revenue.toLocaleString()}
                    </span>
                    <Badge variant="default" className="text-xs">
                      {item.change}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
