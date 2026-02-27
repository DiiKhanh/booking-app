"use client";

import { Users, Building2, CreditCard, Activity } from "lucide-react";
import { RealtimeCounter } from "@/components/admin/realtime-counter";
import { SystemHealth } from "@/components/admin/system-health";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { RevenueChart } from "@/components/dashboard/revenue-chart";

export default function AdminDashboardPage() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page heading */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold font-heading text-foreground">
          Platform Overview
        </h1>
        <p className="text-sm text-muted-foreground">
          Real-time system metrics and platform health.
        </p>
      </div>

      {/* Live counters */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <RealtimeCounter
          label="Active Users"
          value={2847}
          icon={<Users className="h-5 w-5" />}
          iconColor="bg-primary/10 text-primary"
          trend={14.2}
          pulse
        />
        <RealtimeCounter
          label="Total Hotels"
          value={2401}
          icon={<Building2 className="h-5 w-5" />}
          iconColor="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
          trend={3.8}
        />
        <RealtimeCounter
          label="Today's Transactions"
          value={1284}
          unit="txns"
          icon={<CreditCard className="h-5 w-5" />}
          iconColor="bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400"
          trend={8.4}
          pulse
        />
        <RealtimeCounter
          label="System Load"
          value={23}
          unit="%"
          icon={<Activity className="h-5 w-5" />}
          iconColor="bg-chart-5/10 text-purple-500"
          trend={-5.1}
        />
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Revenue chart 2/3 */}
        <div className="lg:col-span-2">
          <RevenueChart />
        </div>
        {/* System health 1/3 */}
        <SystemHealth />
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ActivityFeed />
        {/* Pending hotels card */}
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold font-heading">
              Pending Approvals
            </h3>
            <span className="rounded-full bg-destructive/10 text-destructive text-xs font-bold px-2 py-0.5">
              12 pending
            </span>
          </div>
          <div className="space-y-3">
            {[
              {
                name: "Grand Palace Hotel",
                city: "Ho Chi Minh City",
                rooms: 45,
                time: "2h ago",
              },
              {
                name: "Sunrise Beach Resort",
                city: "Da Nang",
                rooms: 62,
                time: "4h ago",
              },
              {
                name: "Mountain View Inn",
                city: "Da Lat",
                rooms: 28,
                time: "6h ago",
              },
            ].map((hotel) => (
              <div
                key={hotel.name}
                className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border/50 hover:border-primary/30 transition-colors duration-150 cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary text-xs font-bold">
                    {hotel.name[0]}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {hotel.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {hotel.city} · {hotel.rooms} rooms
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-muted-foreground">
                    {hotel.time}
                  </span>
                  <button className="rounded-md bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 px-2 py-1 text-xs font-medium hover:bg-emerald-200 dark:hover:bg-emerald-800 transition-colors cursor-pointer">
                    Review
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
