"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Building2,
  MapPin,
  Star,
  Bed,
  Edit,
  Trash2,
  ExternalLink,
  TrendingUp,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { hotelService } from "@/services/hotel.service";
import type { Hotel } from "@/types/hotel.types";

// Mock hotel data
const MOCK_HOTEL: Hotel = {
  id: "1",
  name: "Grand Palace Hotel",
  description:
    "A magnificent 5-star establishment nestled in the heart of Ho Chi Minh City. Offering unparalleled luxury, world-class dining, and impeccable service since 1995.",
  address: "123 Nguyen Hue Blvd",
  city: "Ho Chi Minh City",
  country: "Vietnam",
  starRating: 5,
  status: "approved",
  ownerId: "owner-1",
  photos: [],
  amenities: ["WiFi", "Pool", "Spa", "Gym", "Restaurant", "Bar", "Parking", "Concierge"],
  totalRooms: 120,
  availableRooms: 34,
  averagePrice: 180,
  occupancyRate: 72,
  totalRevenue: 245800,
  rating: 4.8,
  reviewCount: 342,
  createdAt: "2024-01-15",
  updatedAt: "2024-06-01",
};

const STATUS_COLORS = {
  approved: "default",
  pending: "secondary",
  rejected: "destructive",
  suspended: "outline",
} as const;

export default function HotelDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [deleteOpen, setDeleteOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["hotel", id],
    queryFn: () => hotelService.getHotel(id),
    placeholderData: { success: true, data: MOCK_HOTEL, error: null },
  });

  const hotel = data?.data ?? MOCK_HOTEL;

  const deleteMutation = useMutation({
    mutationFn: () => hotelService.deleteHotel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["owner-hotels"] });
      router.push("/owner/properties");
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 rounded-xl" />
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back + title */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/owner/properties">
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{hotel.name}</h1>
              <Badge variant={STATUS_COLORS[hotel.status]}>
                {hotel.status}
              </Badge>
            </div>
            <div className="flex items-center gap-1 text-sm text-muted-foreground mt-0.5">
              <MapPin className="w-3.5 h-3.5" />
              {hotel.address}, {hotel.city}, {hotel.country}
            </div>
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/owner/properties/${id}/settings`}>
              <Edit className="w-4 h-4 mr-1.5" />
              Edit
            </Link>
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="w-4 h-4 mr-1.5" />
            Delete
          </Button>
        </div>
      </div>

      {/* Photo gallery placeholder */}
      <div className="grid grid-cols-4 gap-2 h-52">
        <div className="col-span-2 rounded-xl bg-muted flex items-center justify-center border-2 border-dashed border-border">
          <Building2 className="w-12 h-12 text-muted-foreground" />
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl bg-muted flex items-center justify-center"
          />
        ))}
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          {
            label: "Total Rooms",
            value: hotel.totalRooms,
            icon: Bed,
            color: "text-blue-600",
          },
          {
            label: "Occupancy Rate",
            value: `${hotel.occupancyRate}%`,
            icon: Users,
            color:
              hotel.occupancyRate >= 70
                ? "text-emerald-600"
                : "text-amber-600",
          },
          {
            label: "Average Price",
            value: `$${hotel.averagePrice}/night`,
            icon: Star,
            color: "text-amber-600",
          },
          {
            label: "Total Revenue",
            value: `$${hotel.totalRevenue.toLocaleString()}`,
            icon: TrendingUp,
            color: "text-emerald-600",
          },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`${stat.color} bg-current/10 p-2 rounded-lg`}>
                    <Icon className={`w-5 h-5 ${stat.color}`} />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                    <p className="font-bold">{stat.value}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="rooms" asChild>
            <Link href={`/owner/properties/${id}/rooms`}>Rooms</Link>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">About This Property</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground leading-relaxed">
                {hotel.description}
              </p>

              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border text-sm">
                <div>
                  <p className="text-muted-foreground mb-1">Star Rating</p>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: hotel.starRating }).map((_, i) => (
                      <Star
                        key={i}
                        className="w-4 h-4 fill-amber-400 text-amber-400"
                      />
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">Guest Rating</p>
                  <p className="font-semibold">
                    {hotel.rating}/5.0 ({hotel.reviewCount} reviews)
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Amenities</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {hotel.amenities.map((a) => (
                  <Badge key={a} variant="secondary">
                    {a}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Quick actions */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <Button asChild variant="outline" className="h-auto py-3">
              <Link href={`/owner/properties/${id}/rooms`}>
                <div className="text-center">
                  <Bed className="w-5 h-5 mx-auto mb-1" />
                  <p className="text-sm font-medium">Manage Rooms</p>
                </div>
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-auto py-3">
              <Link href="/owner/reservations">
                <div className="text-center">
                  <ExternalLink className="w-5 h-5 mx-auto mb-1" />
                  <p className="text-sm font-medium">View Bookings</p>
                </div>
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-auto py-3">
              <Link href="/owner/analytics">
                <div className="text-center">
                  <TrendingUp className="w-5 h-5 mx-auto mb-1" />
                  <p className="text-sm font-medium">Analytics</p>
                </div>
              </Link>
            </Button>
          </div>
        </TabsContent>
      </Tabs>

      {/* Delete dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Property</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{hotel.name}&quot;? This action cannot be
              undone and will remove all associated rooms and inventory.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
