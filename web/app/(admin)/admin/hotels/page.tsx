"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Filter, Clock, CheckCircle, XCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { HotelApprovalCard } from "@/components/admin/hotel-approval-card";
import { adminService } from "@/services/admin.service";
import type { Hotel } from "@/types/hotel.types";

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
    createdAt: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
  },
];

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
    mutationFn: (id: string) => adminService.rejectHotel(id, "Does not meet quality standards"),
    onMutate: (id) => setRejectingId(id),
    onSettled: () => {
      setRejectingId(null);
      queryClient.invalidateQueries({ queryKey: ["pending-hotels"] });
    },
  });

  const hotels = data?.data ?? MOCK_PENDING;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Hotel Approvals</h1>
          <p className="text-muted-foreground mt-1">
            Review and approve hotel registration requests
          </p>
        </div>
        <Button variant="outline" size="sm">
          <Filter className="w-4 h-4 mr-2" />
          Filter
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Pending Review", value: hotels.length, icon: Clock, color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-950/30" },
          { label: "Approved Today", value: 4, icon: CheckCircle, color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950/30" },
          { label: "Rejected Today", value: 1, icon: XCircle, color: "text-red-600", bg: "bg-red-50 dark:bg-red-950/30" },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`p-2 rounded-lg ${stat.bg}`}>
                  <Icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                  <p className="font-bold text-lg">{stat.value}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Pending hotels list */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <h2 className="font-semibold">Pending Review</h2>
          <Badge variant="secondary">{hotels.length}</Badge>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-36 rounded-xl" />
            ))}
          </div>
        ) : hotels.length === 0 ? (
          <div className="text-center py-16">
            <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
            <h3 className="font-semibold mb-1">All caught up!</h3>
            <p className="text-sm text-muted-foreground">
              No pending hotel approvals at this time
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {hotels.map((hotel) => (
              <HotelApprovalCard
                key={hotel.id}
                hotel={hotel}
                onApprove={(id) => approveMutation.mutate(id)}
                onReject={(id) => rejectMutation.mutate(id)}
                isApproving={approvingId === hotel.id}
                isRejecting={rejectingId === hotel.id}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
