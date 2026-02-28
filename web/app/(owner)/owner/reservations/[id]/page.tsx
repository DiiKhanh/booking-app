"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  ArrowLeft,
  CalendarDays,
  Clock,
  CheckCircle,
  XCircle,
  LogIn,
  LogOut,
  User,
  Mail,
  Phone,
  BedDouble,
  Building2,
  DollarSign,
  Users,
  MessageSquare,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import { bookingService } from "@/services/booking.service";
import type { Booking, BookingStatus } from "@/types/booking.types";
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

const MOCK_BOOKING: Booking = {
  id: "b1",
  roomId: "r2",
  hotelId: "1",
  hotelName: "Grand Palace Hotel",
  roomName: "Deluxe Ocean View",
  guest: {
    id: "g1",
    name: "John Smith",
    email: "john.smith@example.com",
    phone: "+84 901 234 567",
  },
  checkIn: "2026-03-01",
  checkOut: "2026-03-05",
  nights: 4,
  guests: 2,
  totalAmount: 660,
  status: "confirmed",
  specialRequests: "Late check-in requested. Non-smoking room preferred.",
  createdAt: "2026-02-15T10:30:00Z",
  updatedAt: "2026-02-15T10:30:00Z",
};

const STATUS_CONFIG: Record<
  BookingStatus,
  {
    label: string;
    icon: React.ElementType;
    variant: "default" | "secondary" | "destructive" | "outline";
    className: string;
  }
> = {
  pending: {
    label: "Pending Review",
    icon: Clock,
    variant: "secondary",
    className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  },
  confirmed: {
    label: "Confirmed",
    icon: CheckCircle,
    variant: "default",
    className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  },
  checked_in: {
    label: "Checked In",
    icon: LogIn,
    variant: "default",
    className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  },
  checked_out: {
    label: "Checked Out",
    icon: LogOut,
    variant: "outline",
    className: "bg-muted text-muted-foreground",
  },
  cancelled: {
    label: "Cancelled",
    icon: XCircle,
    variant: "destructive",
    className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  },
  disputed: {
    label: "Disputed",
    icon: AlertCircle,
    variant: "destructive",
    className: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  },
};

const TIMELINE_EVENTS = [
  { label: "Booking Created", icon: CalendarDays, date: "2026-02-15 10:30", desc: "Guest submitted booking request" },
  { label: "Payment Processed", icon: DollarSign, date: "2026-02-15 10:32", desc: "Payment of $660.00 confirmed" },
  { label: "Booking Confirmed", icon: CheckCircle, date: "2026-02-15 10:32", desc: "Booking automatically confirmed" },
];

export default function ReservationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const id = params.id as string;

  const { data, isLoading } = useQuery({
    queryKey: ["reservation", id],
    queryFn: () => bookingService.getReservation(id),
    placeholderData: { success: true, data: MOCK_BOOKING, error: null },
  });

  const statusMutation = useMutation({
    mutationFn: (status: BookingStatus) =>
      bookingService.updateStatus(id, status),
    onSuccess: (_, status) => {
      queryClient.invalidateQueries({ queryKey: ["reservation", id] });
      queryClient.invalidateQueries({ queryKey: ["owner-reservations"] });
      toast.success(`Booking ${status === "confirmed" ? "accepted" : "cancelled"} successfully`);
    },
    onError: () => toast.error("Failed to update booking status"),
  });

  const booking = data?.data ?? MOCK_BOOKING;
  const cfg = STATUS_CONFIG[booking.status];
  const StatusIcon = cfg.icon;

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-5xl">
        <Skeleton className="h-9 w-48" />
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
      <div className="flex items-start justify-between gap-4">
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
                Reservation #{id}
              </h1>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium ${cfg.className}`}
              >
                <StatusIcon className="h-3.5 w-3.5" />
                {cfg.label}
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              Created {format(new Date(booking.createdAt), "MMM d, yyyy 'at' h:mm a")}
            </p>
          </div>
        </div>

        {/* Actions */}
        {booking.status === "pending" && (
          <div className="flex items-center gap-2 shrink-0">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="text-destructive border-destructive/40 hover:bg-destructive/10 cursor-pointer">
                  <XCircle className="h-4 w-4 mr-1.5" />
                  Decline
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Decline this booking?</AlertDialogTitle>
                  <AlertDialogDescription>
                    The guest will be notified and refunded. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Keep Booking</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => statusMutation.mutate("cancelled")}
                    className="bg-destructive hover:bg-destructive/90"
                  >
                    Decline Booking
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <Button
              size="sm"
              onClick={() => statusMutation.mutate("confirmed")}
              disabled={statusMutation.isPending}
              className="cursor-pointer"
            >
              <CheckCircle className="h-4 w-4 mr-1.5" />
              Accept Booking
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main info */}
        <div className="lg:col-span-2 space-y-4">
          {/* Stay details */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-primary" />
                Stay Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Check-in</p>
                  <p className="font-semibold">
                    {format(new Date(booking.checkIn), "EEE, MMM d, yyyy")}
                  </p>
                  <p className="text-xs text-muted-foreground">From 2:00 PM</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Check-out</p>
                  <p className="font-semibold">
                    {format(new Date(booking.checkOut), "EEE, MMM d, yyyy")}
                  </p>
                  <p className="text-xs text-muted-foreground">Before 12:00 PM</p>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-muted-foreground text-xs">Duration</p>
                    <p className="font-medium">{booking.nights} night{booking.nights !== 1 ? "s" : ""}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-muted-foreground text-xs">Guests</p>
                    <p className="font-medium">{booking.guests} guest{booking.guests !== 1 ? "s" : ""}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-muted-foreground text-xs">Total</p>
                    <p className="font-medium font-heading">${booking.totalAmount.toLocaleString()}</p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Property & Room */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-start gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-muted-foreground text-xs">Property</p>
                    <p className="font-medium">{booking.hotelName}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <BedDouble className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-muted-foreground text-xs">Room</p>
                    <p className="font-medium">{booking.roomName}</p>
                  </div>
                </div>
              </div>

              {/* Pricing breakdown */}
              <div className="rounded-lg bg-muted/40 border border-border/60 p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    ${(booking.totalAmount / booking.nights).toFixed(0)} × {booking.nights} nights
                  </span>
                  <span>${booking.totalAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Service fee</span>
                  <span>$0</span>
                </div>
                <Separator />
                <div className="flex justify-between font-semibold">
                  <span>Total</span>
                  <span className="font-heading">${booking.totalAmount.toLocaleString()}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Special requests */}
          {booking.specialRequests && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-primary" />
                  Special Requests
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {booking.specialRequests}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Timeline */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative space-y-0">
                {TIMELINE_EVENTS.map((event, i) => {
                  const Icon = event.icon;
                  return (
                    <div key={i} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                          <Icon className="h-3.5 w-3.5" />
                        </div>
                        {i < TIMELINE_EVENTS.length - 1 && (
                          <div className="w-px h-8 bg-border my-0.5" />
                        )}
                      </div>
                      <div className="pb-4">
                        <p className="text-sm font-medium">{event.label}</p>
                        <p className="text-xs text-muted-foreground">{event.desc}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{event.date}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Guest sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <User className="h-4 w-4 text-primary" />
                Guest Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12">
                  <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                    {booking.guest.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold">{booking.guest.name}</p>
                  <p className="text-xs text-muted-foreground">Guest</p>
                </div>
              </div>

              <Separator />

              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="h-4 w-4 shrink-0" />
                  <span className="truncate">{booking.guest.email}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="h-4 w-4 shrink-0" />
                  <span>{booking.guest.phone}</span>
                </div>
              </div>

              <Button variant="outline" size="sm" className="w-full cursor-pointer">
                <MessageSquare className="h-4 w-4 mr-2" />
                Message Guest
              </Button>
            </CardContent>
          </Card>

          {/* Payment summary */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-primary" />
                Payment
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Status</span>
                <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                  Paid
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Amount</span>
                <span className="font-semibold font-heading">
                  ${booking.totalAmount.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Method</span>
                <span className="text-sm">Credit Card</span>
              </div>
            </CardContent>
          </Card>

          {/* Booking metadata */}
          <Card>
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Booking ID</span>
                <span className="font-mono">{booking.id}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Last updated</span>
                <span>{format(new Date(booking.updatedAt), "MMM d, h:mm a")}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
