"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Clock,
  CheckCircle,
  XCircle,
  MapPin,
  Building2,
  Star,
  Bed,
  User,
  Eye,
  AlertCircle,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { adminService } from "@/services/admin.service";
import type { Hotel } from "@/types/hotel.types";
import Link from "next/link";
import { cn } from "@/lib/utils";

// Mock data
const MOCK_PENDING: Hotel[] = [
  {
    id: "h1",
    name: "Grand Palace Hotel",
    description: "A magnificent 5-star hotel in the heart of Ho Chi Minh City.",
    address: "123 Nguyen Hue Blvd",
    city: "Ho Chi Minh City",
    country: "Vietnam",
    starRating: 5,
    status: "pending",
    ownerId: "owner-1",
    photos: [],
    amenities: ["WiFi", "Pool", "Spa", "Gym", "Restaurant", "Bar", "Parking"],
    totalRooms: 120,
    availableRooms: 120,
    averagePrice: 180,
    occupancyRate: 0,
    totalRevenue: 0,
    rating: 0,
    reviewCount: 0,
    createdAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
  },
  {
    id: "h2",
    name: "Sunrise Beach Resort",
    description: "Beautiful beachfront resort with stunning ocean views.",
    address: "456 Beach Rd",
    city: "Da Nang",
    country: "Vietnam",
    starRating: 4,
    status: "pending",
    ownerId: "owner-2",
    photos: [],
    amenities: ["Beach", "Pool", "Restaurant", "Bar"],
    totalRooms: 85,
    availableRooms: 85,
    averagePrice: 135,
    occupancyRate: 0,
    totalRevenue: 0,
    rating: 0,
    reviewCount: 0,
    createdAt: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
  },
  {
    id: "h3",
    name: "Mountain View Lodge",
    description: "Cozy boutique hotel with panoramic mountain views.",
    address: "789 Highland Ave",
    city: "Da Lat",
    country: "Vietnam",
    starRating: 3,
    status: "pending",
    ownerId: "owner-3",
    photos: [],
    amenities: ["WiFi", "Restaurant", "Bar", "Hiking Trails"],
    totalRooms: 32,
    availableRooms: 32,
    averagePrice: 75,
    occupancyRate: 0,
    totalRevenue: 0,
    rating: 0,
    reviewCount: 0,
    createdAt: new Date(Date.now() - 27 * 3600 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 27 * 3600 * 1000).toISOString(),
  },
];

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return "< 1h ago";
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function urgencyLevel(dateStr: string): "high" | "medium" | "low" {
  const h = (Date.now() - new Date(dateStr).getTime()) / 3600000;
  if (h >= 24) return "high";
  if (h >= 8) return "medium";
  return "low";
}

const URGENCY_CONFIG = {
  high: {
    label: "Overdue",
    cls: "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400",
    bar: "bg-red-500",
    border: "border-l-red-500",
  },
  medium: {
    label: "Waiting",
    cls: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400",
    bar: "bg-amber-500",
    border: "border-l-amber-500",
  },
  low: {
    label: "New",
    cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400",
    bar: "bg-emerald-500",
    border: "border-l-emerald-500",
  },
};

export default function AdminHotelsPage() {
  const queryClient = useQueryClient();
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["pending-hotels"],
    queryFn: () => adminService.getPendingHotels(),
    placeholderData: {
      success: true,
      data: MOCK_PENDING,
      error: null,
      meta: { total: MOCK_PENDING.length, page: 1, limit: 20, totalPages: 1 },
    },
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => adminService.approveHotel(id),
    onMutate: (id) => setApprovingId(id),
    onSettled: () => {
      setApprovingId(null);
      queryClient.invalidateQueries({ queryKey: ["pending-hotels"] });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (id: string) =>
      adminService.rejectHotel(id, "Does not meet quality standards"),
    onMutate: (id) => setRejectingId(id),
    onSettled: () => {
      setRejectingId(null);
      queryClient.invalidateQueries({ queryKey: ["pending-hotels"] });
    },
  });

  const hotels = data?.data ?? MOCK_PENDING;
  const overdueCount = hotels.filter((h) => urgencyLevel(h.createdAt) === "high").length;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* ── Header ──────────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold font-heading tracking-tight">
            Hotel Approvals
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Review and approve hotel registration requests
          </p>
        </div>
        {overdueCount > 0 && (
          <Badge className="bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400 border-red-200 dark:border-red-800 gap-1.5">
            <AlertCircle className="w-3.5 h-3.5" />
            {overdueCount} overdue
          </Badge>
        )}
      </div>

      {/* ── Summary cards ───────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-4">
        {[
          {
            label: "Pending Review",
            value: hotels.length,
            icon: Clock,
            color: "text-amber-600",
            bg: "bg-amber-50 dark:bg-amber-950/30",
          },
          {
            label: "Approved Today",
            value: 4,
            icon: CheckCircle,
            color: "text-emerald-600",
            bg: "bg-emerald-50 dark:bg-emerald-950/30",
          },
          {
            label: "Rejected Today",
            value: 1,
            icon: XCircle,
            color: "text-red-600",
            bg: "bg-red-50 dark:bg-red-950/30",
          },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="border-border">
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`p-2.5 rounded-xl ${stat.bg}`}>
                  <Icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                  <p className="font-bold text-xl leading-tight">{stat.value}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* ── Queue header ─────────────────────────────────────── */}
      <div className="flex items-center gap-2">
        <h2 className="font-semibold">Pending Review</h2>
        <Badge variant="secondary" className="rounded-full">
          {hotels.length}
        </Badge>
        <span className="text-xs text-muted-foreground ml-auto">
          Sorted by submission time
        </span>
      </div>

      {/* ── Hotel list ──────────────────────────────────────── */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      ) : hotels.length === 0 ? (
        <Card>
          <CardContent className="py-20 flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-full bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center mb-4">
              <CheckCircle className="w-7 h-7 text-emerald-500" />
            </div>
            <h3 className="font-semibold text-lg mb-1">All caught up!</h3>
            <p className="text-sm text-muted-foreground max-w-xs">
              No pending hotel approvals at this time.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {hotels.map((hotel) => {
            const urgency = urgencyLevel(hotel.createdAt);
            const urg = URGENCY_CONFIG[urgency];
            const isProcessing =
              approvingId === hotel.id || rejectingId === hotel.id;

            return (
              <Card
                key={hotel.id}
                className={cn(
                  "overflow-hidden transition-shadow hover:shadow-md border-l-4",
                  urg.border
                )}
              >
                <CardContent className="p-0">
                  <div className="flex gap-0">
                    {/* Placeholder image / gradient */}
                    <div className="w-36 md:w-44 shrink-0 bg-gradient-to-br from-muted to-muted/60 flex items-center justify-center relative overflow-hidden">
                      {hotel.photos[0] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={hotel.photos[0]}
                          alt={hotel.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <>
                          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-primary/5" />
                          <Building2 className="w-10 h-10 text-primary/30 relative z-10" />
                        </>
                      )}
                    </div>

                    {/* Details */}
                    <div className="flex-1 p-4 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        {/* Left: hotel info */}
                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-base leading-tight">
                              {hotel.name}
                            </h3>
                            {/* Star rating */}
                            <div className="flex items-center gap-0.5">
                              {Array.from({ length: hotel.starRating }).map(
                                (_, i) => (
                                  <Star
                                    key={i}
                                    className="w-3 h-3 fill-amber-400 text-amber-400"
                                  />
                                )
                              )}
                            </div>
                            <Badge className={cn("text-xs h-5", urg.cls)}>
                              {urg.label}
                            </Badge>
                          </div>

                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <MapPin className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">
                              {hotel.address}, {hotel.city}, {hotel.country}
                            </span>
                          </div>

                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              Owner: {hotel.ownerId}
                            </span>
                            <span className="flex items-center gap-1">
                              <Bed className="w-3 h-3" />
                              {hotel.totalRooms} rooms
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {timeAgo(hotel.createdAt)}
                            </span>
                          </div>

                          {/* Amenity chips */}
                          {hotel.amenities.length > 0 && (
                            <div className="flex flex-wrap gap-1 pt-1">
                              {hotel.amenities.slice(0, 5).map((a) => (
                                <span
                                  key={a}
                                  className="text-[11px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground"
                                >
                                  {a}
                                </span>
                              ))}
                              {hotel.amenities.length > 5 && (
                                <span className="text-[11px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                                  +{hotel.amenities.length - 5}
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Right: price + actions */}
                        <div className="shrink-0 flex flex-col items-end gap-2">
                          <div className="text-right">
                            <p className="text-lg font-bold text-foreground">
                              ${hotel.averagePrice}
                            </p>
                            <p className="text-xs text-muted-foreground">per night</p>
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <Button
                              size="sm"
                              className="bg-emerald-600 hover:bg-emerald-700 text-white w-28"
                              onClick={() => approveMutation.mutate(hotel.id)}
                              disabled={isProcessing}
                            >
                              <CheckCircle className="w-3.5 h-3.5 mr-1.5" />
                              {approvingId === hotel.id
                                ? "Approving…"
                                : "Approve"}
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              className="w-28"
                              onClick={() => rejectMutation.mutate(hotel.id)}
                              disabled={isProcessing}
                            >
                              <XCircle className="w-3.5 h-3.5 mr-1.5" />
                              {rejectingId === hotel.id
                                ? "Rejecting…"
                                : "Reject"}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="w-28 text-muted-foreground"
                              asChild
                            >
                              <Link href={`/admin/hotels/${hotel.id}`}>
                                <Eye className="w-3.5 h-3.5 mr-1.5" />
                                Full Review
                              </Link>
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
