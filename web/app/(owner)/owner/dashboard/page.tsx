"use client";

import { BedDouble, CalendarCheck, DollarSign, TrendingUp } from "lucide-react";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { RevenueChart } from "@/components/dashboard/revenue-chart";
import { ActivityFeed } from "@/components/dashboard/activity-feed";

export default function OwnerDashboardPage() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page heading */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold font-heading text-foreground">
          Good morning, Nguyen Van A 👋
        </h1>
        <p className="text-sm text-muted-foreground">
          Here&apos;s what&apos;s happening with your properties today.
        </p>
      </div>

      {/* KPI Cards */}
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

      {/* Charts + Activity grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Revenue chart takes 2/3 */}
        <div className="lg:col-span-2">
          <RevenueChart />
        </div>
        {/* Activity feed 1/3 */}
        <ActivityFeed />
      </div>
    </div>
  );
}
