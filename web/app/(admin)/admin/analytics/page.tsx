"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  Users,
  DollarSign,
  TrendingUp,
  Building2,
  Globe,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { analyticsService } from "@/services/analytics.service";

type Period = "7d" | "30d" | "90d" | "year";

const PERIOD_BUTTONS: { value: Period; label: string }[] = [
  { value: "7d", label: "7D" },
  { value: "30d", label: "30D" },
  { value: "90d", label: "90D" },
  { value: "year", label: "Year" },
];

const GROWTH_DATA = [
  { month: "Jan", users: 8400, hotels: 1820, revenue: 142000, bookings: 580 },
  { month: "Feb", users: 9200, hotels: 1950, revenue: 158000, bookings: 640 },
  { month: "Mar", users: 10800, hotels: 2080, revenue: 174000, bookings: 720 },
  { month: "Apr", users: 12100, hotels: 2190, revenue: 192000, bookings: 800 },
  { month: "May", users: 13800, hotels: 2280, revenue: 218000, bookings: 890 },
  { month: "Jun", users: 15600, hotels: 2350, revenue: 248000, bookings: 980 },
  { month: "Jul", users: 18200, hotels: 2400, revenue: 286000, bookings: 1140 },
  { month: "Aug", users: 21400, hotels: 2401, revenue: 320000, bookings: 1280 },
];

const GEO_DATA = [
  { name: "Ho Chi Minh City", bookings: 3840, pct: 38, color: "hsl(var(--chart-1))" },
  { name: "Hanoi", bookings: 2540, pct: 25, color: "hsl(var(--chart-2))" },
  { name: "Da Nang", bookings: 1820, pct: 18, color: "hsl(var(--chart-3))" },
  { name: "Nha Trang", bookings: 1020, pct: 10, color: "hsl(var(--chart-4))" },
  { name: "Other", bookings: 920, pct: 9, color: "hsl(var(--chart-5))" },
];

const CATEGORY_DATA = [
  { type: "5-Star Luxury", count: 320, revenue: 128000 },
  { type: "4-Star Business", count: 580, revenue: 87000 },
  { type: "3-Star Standard", count: 840, revenue: 63000 },
  { type: "Boutique", count: 240, revenue: 48000 },
  { type: "Budget", count: 420, revenue: 21000 },
];

const KPI_ITEMS = [
  { label: "Total Revenue", value: "$2.48M", trend: "+18.2%", positive: true, icon: DollarSign, color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950/30" },
  { label: "Active Users", value: "21,400", trend: "+24.4%", positive: true, icon: Users, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950/30" },
  { label: "Listed Hotels", value: "2,401", trend: "+8.1%", positive: true, icon: Building2, color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-950/30" },
  { label: "Avg Daily Rate", value: "$165", trend: "-2.3%", positive: false, icon: TrendingUp, color: "text-purple-600", bg: "bg-purple-50 dark:bg-purple-950/30" },
];

export default function AdminAnalyticsPage() {
  const [period, setPeriod] = useState<Period>("30d");

  const { isLoading } = useQuery({
    queryKey: ["admin-analytics"],
    queryFn: () => analyticsService.getAdminAnalytics(),
    placeholderData: {
      success: true,
      data: { activeUsers: 21400, activeUsersTrend: 24.4, totalHotels: 2401, pendingHotels: 12, todayTransactions: 1284, todayRevenue: 248000, systemLoad: 23 },
      error: null,
    },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Platform Analytics</h1>
          <p className="text-muted-foreground mt-1">
            Platform-wide metrics and growth trends
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
      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {KPI_ITEMS.map((kpi) => {
            const Icon = kpi.icon;
            return (
              <Card key={kpi.label}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className={`p-2 rounded-lg ${kpi.bg}`}>
                      <Icon className={`h-4 w-4 ${kpi.color}`} />
                    </div>
                    <div className={`flex items-center gap-0.5 text-xs font-medium ${kpi.positive ? "text-emerald-600" : "text-red-500"}`}>
                      {kpi.positive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                      {kpi.trend}
                    </div>
                  </div>
                  <p className="text-2xl font-bold font-heading">{kpi.value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{kpi.label}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Growth chart */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Platform Growth</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={320}>
            <AreaChart data={GROWTH_DATA}>
              <defs>
                <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis yAxisId="left" tick={{ fontSize: 12 }} tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}K` : v} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} tickFormatter={(v) => `$${(v/1000).toFixed(0)}K`} />
              <Tooltip
                formatter={(value, name) => {
                  if (name === "Revenue") return [`$${Number(value).toLocaleString()}`, name];
                  return [Number(value).toLocaleString(), name];
                }}
              />
              <Legend />
              <Area yAxisId="left" type="monotone" dataKey="users" stroke="hsl(var(--chart-1))" fill="url(#colorUsers)" strokeWidth={2} name="Users" />
              <Area yAxisId="right" type="monotone" dataKey="revenue" stroke="hsl(var(--chart-2))" fill="url(#colorRevenue)" strokeWidth={2} name="Revenue" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Two charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Bookings by month */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Monthly Bookings</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={GROWTH_DATA}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="bookings" fill="hsl(var(--chart-3))" radius={[4, 4, 0, 0]} name="Bookings" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Geographic distribution */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Globe className="h-4 w-4 text-primary" />
              Bookings by City
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="50%" height={200}>
                <PieChart>
                  <Pie
                    data={GEO_DATA}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="bookings"
                  >
                    {GEO_DATA.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => [Number(v).toLocaleString(), "Bookings"]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2">
                {GEO_DATA.map((item) => (
                  <div key={item.name} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-medium truncate">{item.name}</span>
                      <span className="text-muted-foreground shrink-0 ml-2">{item.pct}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${item.pct}%`, backgroundColor: item.color }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Hotel categories + ADR trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Revenue by Hotel Category</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {CATEGORY_DATA.map((item) => (
                <div key={item.type} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{item.type}</span>
                    <div className="flex items-center gap-2 text-muted-foreground text-xs">
                      <span>{item.count} bookings</span>
                      <span className="font-semibold text-foreground">${item.revenue.toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-500"
                      style={{ width: `${(item.revenue / Math.max(...CATEGORY_DATA.map(d => d.revenue))) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Average Daily Rate Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={GROWTH_DATA.map((d, i) => ({ ...d, adr: 145 + i * 3 + Math.sin(i) * 8 }))}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${v}`} />
                <Tooltip formatter={(v) => [`$${v}`, "ADR"]} />
                <Line type="monotone" dataKey="adr" stroke="hsl(var(--chart-4))" strokeWidth={2.5} dot={false} name="ADR" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top performers */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Top Performing Hotels</CardTitle>
            <Badge variant="secondary">This Month</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { rank: 1, name: "Grand Palace Hotel", city: "HCMC", revenue: 48200, bookings: 248, occupancy: 92 },
              { rank: 2, name: "Sunrise Beach Resort", city: "Da Nang", revenue: 36800, bookings: 196, occupancy: 87 },
              { rank: 3, name: "InterContinental Hanoi", city: "Hanoi", revenue: 32400, bookings: 168, occupancy: 84 },
              { rank: 4, name: "Vinpearl Nha Trang", city: "Nha Trang", revenue: 28600, bookings: 152, occupancy: 78 },
              { rank: 5, name: "Mountain View Lodge", city: "Da Lat", revenue: 18200, bookings: 124, occupancy: 74 },
            ].map((hotel) => (
              <div key={hotel.rank} className="flex items-center gap-4">
                <span className={`w-7 h-7 flex items-center justify-center rounded-full text-xs font-bold shrink-0 ${
                  hotel.rank === 1 ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" :
                  hotel.rank === 2 ? "bg-slate-100 text-slate-600 dark:bg-slate-900/30 dark:text-slate-400" :
                  hotel.rank === 3 ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" :
                  "bg-muted text-muted-foreground"
                }`}>
                  {hotel.rank}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{hotel.name}</p>
                  <p className="text-xs text-muted-foreground">{hotel.city} · {hotel.bookings} bookings · {hotel.occupancy}% occ.</p>
                </div>
                <span className="text-sm font-semibold font-heading shrink-0">
                  ${hotel.revenue.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
