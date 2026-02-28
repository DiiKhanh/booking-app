"use client";

import { useState, useMemo } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  getDay,
  isToday,
  isPast,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { InventoryDay, InventoryStatus } from "@/types/hotel.types";

const STATUS_CONFIG: Record<
  InventoryStatus,
  { label: string; bg: string; text: string; border: string }
> = {
  available: {
    label: "Available",
    bg: "bg-emerald-50 dark:bg-emerald-950/30",
    text: "text-emerald-700 dark:text-emerald-400",
    border: "border-emerald-200 dark:border-emerald-800",
  },
  limited: {
    label: "Limited",
    bg: "bg-amber-50 dark:bg-amber-950/30",
    text: "text-amber-700 dark:text-amber-400",
    border: "border-amber-200 dark:border-amber-800",
  },
  sold_out: {
    label: "Sold Out",
    bg: "bg-red-50 dark:bg-red-950/30",
    text: "text-red-700 dark:text-red-400",
    border: "border-red-200 dark:border-red-800",
  },
  blocked: {
    label: "Blocked",
    bg: "bg-muted",
    text: "text-muted-foreground",
    border: "border-border",
  },
};

function getStatusFromInventory(day: InventoryDay): InventoryStatus {
  if (day.status) return day.status;
  if (day.available === 0) return "sold_out";
  if (day.available / day.total < 0.3) return "limited";
  return "available";
}

// Generate mock inventory for the month
function generateMockInventory(
  month: Date,
  roomId: string
): Map<string, InventoryDay> {
  const map = new Map<string, InventoryDay>();
  const days = eachDayOfInterval({
    start: startOfMonth(month),
    end: endOfMonth(month),
  });

  days.forEach((day) => {
    const dateStr = format(day, "yyyy-MM-dd");
    const rand = Math.random();
    const total = 5;
    const available = rand < 0.1 ? 0 : rand < 0.3 ? 1 : Math.floor(rand * total);
    map.set(dateStr, {
      date: dateStr,
      roomId,
      available,
      total,
      price: 100 + Math.floor(Math.random() * 50),
      status: rand < 0.05 ? "blocked" : undefined as never,
    });
  });

  return map;
}

interface InventoryCalendarProps {
  roomId: string;
  inventory?: Map<string, InventoryDay>;
  onDayClick?: (day: InventoryDay, date: Date) => void;
  selectedDates?: string[];
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function InventoryCalendar({
  roomId,
  inventory: externalInventory,
  onDayClick,
  selectedDates = [],
}: InventoryCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const inventory = useMemo(
    () => externalInventory ?? generateMockInventory(currentMonth, roomId),
    [externalInventory, currentMonth, roomId]
  );

  const days = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  // Padding for first row
  const startPadding = getDay(startOfMonth(currentMonth));

  const totalAvailable = Array.from(inventory.values()).reduce(
    (acc, d) => acc + (d.available || 0),
    0
  );
  const soldOutDays = Array.from(inventory.values()).filter(
    (d) => getStatusFromInventory(d) === "sold_out"
  ).length;

  return (
    <TooltipProvider>
      <div className="space-y-4">
        {/* Month navigator */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCurrentMonth((m) => subMonths(m, 1))}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div className="text-center">
            <h3 className="font-semibold text-lg">
              {format(currentMonth, "MMMM yyyy")}
            </h3>
            <p className="text-xs text-muted-foreground">
              {days.length} days • {soldOutDays} sold out • {totalAvailable} total available
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCurrentMonth((m) => addMonths(m, 1))}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 flex-wrap text-xs">
          {(Object.entries(STATUS_CONFIG) as [InventoryStatus, typeof STATUS_CONFIG[InventoryStatus]][]).map(
            ([status, cfg]) => (
              <div key={status} className="flex items-center gap-1.5">
                <div
                  className={`w-3 h-3 rounded-sm border ${cfg.bg} ${cfg.border}`}
                />
                <span className="text-muted-foreground">{cfg.label}</span>
              </div>
            )
          )}
        </div>

        {/* Calendar grid */}
        <div className="border border-border rounded-xl overflow-hidden">
          {/* Weekday headers */}
          <div className="grid grid-cols-7 bg-muted/50">
            {WEEKDAYS.map((d) => (
              <div
                key={d}
                className="py-2 text-center text-xs font-medium text-muted-foreground"
              >
                {d}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 border-t border-border">
            {/* Start padding */}
            {Array.from({ length: startPadding }).map((_, i) => (
              <div key={`pad-${i}`} className="border-r border-b border-border bg-muted/20 h-20" />
            ))}

            {days.map((day) => {
              const dateStr = format(day, "yyyy-MM-dd");
              const inv = inventory.get(dateStr);
              const status = inv ? getStatusFromInventory(inv) : "available";
              const cfg = STATUS_CONFIG[status];
              const isSelected = selectedDates.includes(dateStr);
              const isPastDay = isPast(day) && !isToday(day);

              return (
                <Tooltip key={dateStr}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => inv && onDayClick?.(inv, day)}
                      disabled={isPastDay}
                      className={`
                        border-r border-b border-border h-20 p-1.5 text-left transition-all
                        flex flex-col justify-between group
                        ${isPastDay ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}
                        ${isSelected ? "ring-2 ring-primary ring-inset" : ""}
                        ${!isPastDay ? `${cfg.bg} hover:brightness-95` : "bg-muted/10"}
                      `}
                    >
                      <span
                        className={`
                          text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full
                          ${isToday(day) ? "bg-primary text-primary-foreground" : cfg.text}
                        `}
                      >
                        {format(day, "d")}
                      </span>

                      {inv && !isPastDay && (
                        <div className="space-y-0.5">
                          <p className={`text-xs font-semibold ${cfg.text}`}>
                            {inv.available}/{inv.total}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            ${inv.price}
                          </p>
                        </div>
                      )}
                    </button>
                  </TooltipTrigger>
                  {inv && (
                    <TooltipContent side="top" className="text-xs">
                      <p className="font-semibold">{format(day, "MMMM d, yyyy")}</p>
                      <p>Available: {inv.available} / {inv.total}</p>
                      <p>Price: ${inv.price}/night</p>
                      <p>Status: {cfg.label}</p>
                    </TooltipContent>
                  )}
                </Tooltip>
              );
            })}
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
