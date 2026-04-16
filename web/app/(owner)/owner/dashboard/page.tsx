"use client";

import {
  BedDouble,
  CalendarCheck,
  DollarSign,
  TrendingUp,
  Building2,
  ChevronRight,
} from "lucide-react";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { RevenueChart } from "@/components/dashboard/revenue-chart";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { Badge } from "@/components/ui/badge";

const QUICK_ACTIONS = [
  { label: "Add Property", icon: Building2, href: "/owner/properties/new", accent: false },
  { label: "Reservations", icon: CalendarCheck, href: "/owner/reservations", accent: false },
  { label: "Manage Rooms", icon: BedDouble, href: "/owner/properties", accent: false },
  { label: "View Analytics", icon: TrendingUp, href: "/owner/analytics", accent: true },
] as const;

export default function OwnerDashboardPage() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* ── Hero Banner ──────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary/95 to-primary/80 p-6 md:p-8 text-white shadow-lg">
        {/* Coral accent glow */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_80%_50%,oklch(0.64_0.22_27_/_0.4),transparent_65%)]" />
        {/* Decorative circles */}
        <div className="pointer-events-none absolute -right-12 -top-12 w-56 h-56 rounded-full border border-white/10" />
        <div className="pointer-events-none absolute -right-4 top-16 w-28 h-28 rounded-full border border-white/10" />

        <div className="relative z-10 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge className="bg-white/15 text-white border-white/20 hover:bg-white/20 text-xs">
                3 Properties Active
              </Badge>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold font-heading leading-tight mt-2">
              Good morning, Nguyen Van A 👋
            </h1>
            <p className="text-white/60 text-sm">
              Here&apos;s your portfolio overview for today.
            </p>
          </div>

          {/* Quick stats strip */}
          <div className="flex items-stretch gap-1 bg-white/10 rounded-xl p-1 backdrop-blur-sm border border-white/15">
            {[
              { value: "$4,280", label: "Revenue Today", up: true },
              { value: "78.4%", label: "Avg Occupancy", up: true },
              { value: "18", label: "New Bookings", up: false },
            ].map((stat, i) => (
              <div key={stat.label} className="flex items-stretch">
                {i > 0 && <div className="w-px bg-white/20 mx-1" />}
                <div className="px-4 py-2 text-center min-w-24">
                  <p className="text-xl font-bold leading-none">{stat.value}</p>
                  <p className="text-[11px] text-white/55 mt-1 leading-tight">{stat.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── KPI Cards ────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Total Rooms"
          value="124"
          change={2.4}
          icon={<BedDouble className="h-5 w-5" />}
          iconColor="bg-primary/10 text-primary"
        />
        <KpiCard
          title="Occupancy Rate"
          value="78.4%"
          change={5.2}
          icon={<TrendingUp className="h-5 w-5" />}
          iconColor="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
        />
        <KpiCard
          title="Revenue Today"
          value="$4,280"
          change={12.8}
          icon={<DollarSign className="h-5 w-5" />}
          iconColor="bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400"
        />
        <KpiCard
          title="New Bookings"
          value="18"
          change={-3.2}
          icon={<CalendarCheck className="h-5 w-5" />}
          iconColor="bg-accent/10 text-accent"
        />
      </div>

      {/* ── Charts + Activity ────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <RevenueChart />
        </div>
        <ActivityFeed />
      </div>

      {/* ── Quick Actions ────────────────────────────────────── */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Quick Actions
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {QUICK_ACTIONS.map((action) => {
            const Icon = action.icon;
            return (
              <a
                key={action.label}
                href={action.href}
                className={`group flex items-center gap-3 px-4 py-3 rounded-xl border transition-all duration-200 hover:shadow-sm hover:-translate-y-0.5 cursor-pointer ${
                  action.accent
                    ? "border-accent/25 bg-accent/5 hover:bg-accent/10 hover:border-accent/40"
                    : "border-border bg-card hover:bg-muted/50 hover:border-border/80"
                }`}
              >
                <div
                  className={`p-1.5 rounded-lg shrink-0 transition-transform duration-200 group-hover:scale-110 ${
                    action.accent
                      ? "bg-accent/15 text-accent"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <span className="text-sm font-medium leading-tight">{action.label}</span>
                <ChevronRight className="w-3.5 h-3.5 ml-auto text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity duration-150 shrink-0" />
              </a>
            );
          })}
        </div>
      </div>
    </div>
  );
}
