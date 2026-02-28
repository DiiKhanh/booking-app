"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { format } from "date-fns";
import {
  ArrowLeft,
  CalendarDays,
  DollarSign,
  CheckSquare,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { InventoryCalendar } from "@/components/owner/inventory-calendar";
import type { InventoryDay, InventoryStatus } from "@/types/hotel.types";

const QUICK_ACTIONS = [
  {
    label: "Open All",
    description: "Set all days as available",
    icon: CheckSquare,
    action: "open",
    color: "text-emerald-600",
  },
  {
    label: "Block Selected",
    description: "Block selected dates",
    icon: Lock,
    action: "block",
    color: "text-red-600",
  },
  {
    label: "Update Price",
    description: "Change price for selected dates",
    icon: DollarSign,
    action: "price",
    color: "text-amber-600",
  },
];

export default function InventoryPage() {
  const { id: hotelId, roomId } = useParams<{ id: string; roomId: string }>();
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [editDay, setEditDay] = useState<InventoryDay | null>(null);
  const [bulkAvailable, setBulkAvailable] = useState("");
  const [bulkPrice, setBulkPrice] = useState("");
  const [bulkStatus, setBulkStatus] = useState<InventoryStatus | "">("");

  const handleDayClick = (day: InventoryDay, date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    setSelectedDates((prev) =>
      prev.includes(dateStr)
        ? prev.filter((d) => d !== dateStr)
        : [...prev, dateStr]
    );
    setEditDay(day);
  };

  const clearSelection = () => {
    setSelectedDates([]);
    setEditDay(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/owner/properties/${hotelId}/rooms`}>
            <ArrowLeft className="w-4 h-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Inventory Calendar
          </h1>
          <p className="text-muted-foreground text-sm">
            Click dates to select and update availability
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Calendar — takes 3 columns */}
        <div className="xl:col-span-3">
          <InventoryCalendar
            roomId={roomId}
            onDayClick={handleDayClick}
            selectedDates={selectedDates}
          />
        </div>

        {/* Side panel */}
        <div className="space-y-4">
          {/* Selection info */}
          {selectedDates.length > 0 ? (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">
                    {selectedDates.length} date(s) selected
                  </CardTitle>
                  <button
                    onClick={clearSelection}
                    className="text-xs text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                  >
                    Clear
                  </button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-1">
                  {selectedDates.slice(0, 6).map((d) => (
                    <Badge key={d} variant="secondary" className="text-xs">
                      {format(new Date(d), "MMM d")}
                    </Badge>
                  ))}
                  {selectedDates.length > 6 && (
                    <Badge variant="outline" className="text-xs">
                      +{selectedDates.length - 6} more
                    </Badge>
                  )}
                </div>

                <Separator />

                {/* Bulk update fields */}
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Available Rooms</Label>
                    <Input
                      type="number"
                      min={0}
                      placeholder="e.g. 5"
                      value={bulkAvailable}
                      onChange={(e) => setBulkAvailable(e.target.value)}
                      className="h-8 text-sm"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Price ($/night)</Label>
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      placeholder="e.g. 120"
                      value={bulkPrice}
                      onChange={(e) => setBulkPrice(e.target.value)}
                      className="h-8 text-sm"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Status</Label>
                    <Select
                      value={bulkStatus}
                      onValueChange={(v) =>
                        setBulkStatus(v as InventoryStatus | "")
                      }
                    >
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue placeholder="Keep current" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="available">Available</SelectItem>
                        <SelectItem value="limited">Limited</SelectItem>
                        <SelectItem value="sold_out">Sold Out</SelectItem>
                        <SelectItem value="blocked">Blocked</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button className="w-full" size="sm">
                    Apply to {selectedDates.length} date(s)
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-dashed">
              <CardContent className="py-8 text-center">
                <CalendarDays className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  Click dates on the calendar to select and edit them
                </p>
              </CardContent>
            </Card>
          )}

          {/* Quick actions */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {QUICK_ACTIONS.map((action) => {
                const Icon = action.icon;
                return (
                  <button
                    key={action.action}
                    className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted transition-colors cursor-pointer text-left"
                  >
                    <Icon className={`w-4 h-4 ${action.color}`} />
                    <div>
                      <p className="text-sm font-medium">{action.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {action.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </CardContent>
          </Card>

          {/* Legend */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Legend</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {[
                { color: "bg-emerald-100 dark:bg-emerald-950/40 border-emerald-200", label: "Available — 30%+ rooms open" },
                { color: "bg-amber-100 dark:bg-amber-950/40 border-amber-200", label: "Limited — under 30% remaining" },
                { color: "bg-red-100 dark:bg-red-950/40 border-red-200", label: "Sold Out — no availability" },
                { color: "bg-muted border-border", label: "Blocked — manually closed" },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-2 text-xs text-muted-foreground">
                  <div className={`w-3.5 h-3.5 rounded border ${item.color} shrink-0`} />
                  {item.label}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
