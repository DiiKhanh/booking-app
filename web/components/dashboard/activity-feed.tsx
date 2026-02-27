"use client";

import { CalendarCheck, Edit3, Star, LogIn, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Activity {
  id: string;
  type: "booking" | "edit" | "review" | "checkin" | "revenue";
  title: string;
  subtitle: string;
  time: string;
  badge?: { label: string; variant: "default" | "secondary" | "destructive" };
}

const activities: Activity[] = [
  {
    id: "1",
    type: "booking",
    title: "New booking #4821",
    subtitle: "Grand Suite — 3 nights",
    time: "2 min ago",
    badge: { label: "New", variant: "default" },
  },
  {
    id: "2",
    type: "checkin",
    title: "Check-in: John Doe",
    subtitle: "Room 204 — 2 nights",
    time: "15 min ago",
  },
  {
    id: "3",
    type: "review",
    title: "New 5-star review",
    subtitle: "\"Amazing stay, highly recommended!\"",
    time: "1 hr ago",
    badge: { label: "⭐ 5.0", variant: "secondary" },
  },
  {
    id: "4",
    type: "edit",
    title: "Room 301 updated",
    subtitle: "Price changed to $189/night",
    time: "2 hr ago",
  },
  {
    id: "5",
    type: "revenue",
    title: "Payout processed",
    subtitle: "$4,280.00 transferred",
    time: "Yesterday",
    badge: { label: "Paid", variant: "secondary" },
  },
  {
    id: "6",
    type: "booking",
    title: "Booking #4818 cancelled",
    subtitle: "Deluxe Room — refund issued",
    time: "Yesterday",
    badge: { label: "Cancelled", variant: "destructive" },
  },
];

const iconMap = {
  booking: CalendarCheck,
  edit: Edit3,
  review: Star,
  checkin: LogIn,
  revenue: TrendingUp,
};

const iconColor = {
  booking: "bg-primary/10 text-primary",
  edit: "bg-muted text-muted-foreground",
  review: "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",
  checkin: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400",
  revenue: "bg-chart-2/10 text-emerald-500",
};

export function ActivityFeed() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold font-heading">
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[300px]">
          <div className="px-6 pb-4 space-y-0 divide-y divide-border/50">
            {activities.map((activity, i) => {
              const Icon = iconMap[activity.type];
              return (
                <div
                  key={activity.id}
                  className={cn(
                    "flex items-start gap-3 py-3",
                    "hover:bg-muted/30 -mx-2 px-2 rounded-md transition-colors duration-150 cursor-default"
                  )}
                  style={{ animationDelay: `${i * 50}ms` }}
                >
                  <div
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg mt-0.5",
                      iconColor[activity.type]
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <p className="text-sm font-medium text-foreground leading-tight truncate">
                      {activity.title}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {activity.subtitle}
                    </p>
                  </div>
                  <div className="shrink-0 flex flex-col items-end gap-1">
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                      {activity.time}
                    </span>
                    {activity.badge && (
                      <Badge
                        variant={activity.badge.variant}
                        className="text-[10px] h-4 px-1.5"
                      >
                        {activity.badge.label}
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
