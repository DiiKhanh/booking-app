"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  ArrowLeft,
  MapPin,
  Star,
  BedDouble,
  Users,
  CheckCircle,
  XCircle,
  Building2,
  Calendar,
  DollarSign,
  Wifi,
  Coffee,
  Car,
  Waves,
  Dumbbell,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { adminService } from "@/services/admin.service";
import type { Hotel } from "@/types/hotel.types";

const MOCK_HOTEL: Hotel = {
  id: "h1",
  name: "Grand Palace Hotel",
  description:
    "A magnificent 5-star luxury hotel nestled in the heart of Ho Chi Minh City. Featuring world-class amenities, stunning city views, and exceptional service that redefines the art of hospitality in Vietnam.",
  address: "123 Nguyen Hue Boulevard",
  city: "Ho Chi Minh City",
  country: "Vietnam",
  starRating: 5,
  status: "pending",
  ownerId: "owner-1",
  photos: [],
  amenities: [
    "WiFi",
    "Pool",
    "Spa",
    "Gym",
    "Restaurant",
    "Bar",
    "Parking",
    "Conference Room",
  ],
  totalRooms: 120,
  availableRooms: 120,
  averagePrice: 180,
  occupancyRate: 0,
  totalRevenue: 0,
  rating: 0,
  reviewCount: 0,
  createdAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
  updatedAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
};

const AMENITY_ICONS: Record<string, React.ElementType> = {
  WiFi: Wifi,
  Pool: Waves,
  Gym: Dumbbell,
  Parking: Car,
  Restaurant: Coffee,
};

export default function HotelReviewPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const id = params.id as string;
  const [rejectReason, setRejectReason] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-hotel", id],
    queryFn: () => adminService.getHotel(id),
    placeholderData: { success: true, data: MOCK_HOTEL, error: null },
  });

  const approveMutation = useMutation({
    mutationFn: () => adminService.approveHotel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pending-hotels"] });
      toast.success("Hotel approved successfully");
      router.push("/admin/hotels");
    },
    onError: () => toast.error("Failed to approve hotel"),
  });

  const rejectMutation = useMutation({
    mutationFn: () =>
      adminService.rejectHotel(
        id,
        rejectReason || "Does not meet quality standards",
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pending-hotels"] });
      toast.success("Hotel rejected");
      router.push("/admin/hotels");
    },
    onError: () => toast.error("Failed to reject hotel"),
  });

  const hotel = data?.data ?? MOCK_HOTEL;

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-5xl">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-64" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-72 lg:col-span-2" />
          <Skeleton className="h-72" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Back + Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
            className="cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight">
                {hotel.name}
              </h1>
              <Badge
                variant={
                  hotel.status === "pending"
                    ? "secondary"
                    : hotel.status === "approved"
                      ? "default"
                      : "destructive"
                }
                className="capitalize"
              >
                {hotel.status}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              Submitted{" "}
              {format(new Date(hotel.createdAt), "MMM d, yyyy 'at' h:mm a")}
            </p>
          </div>
        </div>

        {hotel.status === "pending" && (
          <div className="flex items-center gap-2 shrink-0">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive border-destructive/40 hover:bg-destructive/10 cursor-pointer"
                >
                  <XCircle className="h-4 w-4 mr-1.5" />
                  Reject
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Reject Hotel Application</AlertDialogTitle>
                  <AlertDialogDescription>
                    The hotel owner will be notified with your reason.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="px-1 pb-2">
                  <Label className="text-sm">Rejection reason</Label>
                  <Textarea
                    className="mt-1.5"
                    placeholder="Does not meet quality standards..."
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    rows={3}
                  />
                </div>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => rejectMutation.mutate()}
                    className="bg-destructive hover:bg-destructive/90"
                  >
                    Reject Hotel
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <Button
              size="sm"
              onClick={() => approveMutation.mutate()}
              disabled={approveMutation.isPending}
              className="cursor-pointer"
            >
              <CheckCircle className="h-4 w-4 mr-1.5" />
              Approve Hotel
            </Button>
          </div>
        )}
      </div>

      {/* Photo gallery placeholder */}
      <div className="grid grid-cols-4 gap-2 h-56">
        <div className="col-span-2 row-span-2 rounded-xl bg-muted flex items-center justify-center border border-border">
          <div className="text-center text-muted-foreground">
            <Building2 className="h-10 w-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No photos uploaded</p>
          </div>
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl bg-muted/60 border border-border"
          />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main details */}
        <div className="lg:col-span-2 space-y-4">
          {/* Overview */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary" />
                Property Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground leading-relaxed">
                {hotel.description}
              </p>

              <Separator />

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Location</p>
                    <p className="font-medium">
                      {hotel.city}, {hotel.country}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {hotel.address}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Star Rating</p>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: hotel.starRating }).map((_, i) => (
                        <Star
                          key={i}
                          className="h-3.5 w-3.5 fill-amber-400 text-amber-400"
                        />
                      ))}
                      <span className="ml-1 text-xs text-muted-foreground">
                        {hotel.starRating}-star
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <BedDouble className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Total Rooms</p>
                    <p className="font-medium">{hotel.totalRooms} rooms</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Average Price
                    </p>
                    <p className="font-medium font-heading">
                      ${hotel.averagePrice}/night
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Amenities */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Amenities</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {hotel.amenities.map((amenity) => {
                  const Icon = AMENITY_ICONS[amenity];
                  return (
                    <div
                      key={amenity}
                      className="flex items-center gap-1.5 rounded-lg border border-border bg-muted/40 px-3 py-1.5 text-sm"
                    >
                      {Icon && (
                        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                      {amenity}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Review checklist */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Review Checklist</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2.5">
                {[
                  { label: "Valid business registration", checked: true },
                  {
                    label: "Hotel photos uploaded",
                    checked: hotel.photos.length > 0,
                  },
                  {
                    label: "Room descriptions complete",
                    checked: hotel.totalRooms > 0,
                  },
                  {
                    label: "Pricing information set",
                    checked: hotel.averagePrice > 0,
                  },
                  {
                    label: "Address & location verified",
                    checked: !!hotel.city,
                  },
                  {
                    label: "Amenities listed",
                    checked: hotel.amenities.length > 0,
                  },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-2.5 text-sm">
                    {item.checked ? (
                      <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-400 shrink-0" />
                    )}
                    <span
                      className={
                        item.checked
                          ? "text-foreground"
                          : "text-muted-foreground"
                      }
                    >
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Owner info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                Owner Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold">
                  O
                </div>
                <div>
                  <p className="font-medium">Owner Account</p>
                  <p className="text-xs text-muted-foreground">
                    ID: {hotel.ownerId}
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full cursor-pointer"
                onClick={() => router.push(`/admin/users/${hotel.ownerId}`)}
              >
                View Owner Profile
              </Button>
            </CardContent>
          </Card>

          {/* Submission info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                Submission Info
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Submitted</span>
                <span>{format(new Date(hotel.createdAt), "MMM d, yyyy")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Time in queue</span>
                <span>2 hours</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status</span>
                <Badge variant="secondary" className="capitalize">
                  {hotel.status}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
