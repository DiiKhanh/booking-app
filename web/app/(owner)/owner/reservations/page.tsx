"use client";

import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Calendar, TrendingUp, Clock, CheckCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BookingTable } from "@/components/owner/booking-table";
import { bookingService } from "@/services/booking.service";
import type { Booking, BookingStatus } from "@/types/booking.types";

// Mock data
const MOCK_BOOKINGS: Booking[] = [
  {
    id: "b1",
    roomId: "r2",
    hotelId: "1",
    hotelName: "Grand Palace Hotel",
    roomName: "Deluxe Ocean View",
    guest: {
      id: "g1",
      name: "John Smith",
      email: "john@example.com",
      phone: "+84901234567",
    },
    checkIn: "2026-03-01",
    checkOut: "2026-03-05",
    nights: 4,
    guests: 2,
    totalAmount: 660,
    status: "confirmed",
    createdAt: "2026-02-15",
    updatedAt: "2026-02-15",
  },
  {
    id: "b2",
    roomId: "r3",
    hotelId: "1",
    hotelName: "Grand Palace Hotel",
    roomName: "Executive Suite",
    guest: {
      id: "g2",
      name: "Sarah Lee",
      email: "sarah@example.com",
      phone: "+84907654321",
    },
    checkIn: "2026-03-10",
    checkOut: "2026-03-14",
    nights: 4,
    guests: 2,
    totalAmount: 1280,
    status: "pending",
    createdAt: "2026-02-20",
    updatedAt: "2026-02-20",
  },
  {
    id: "b3",
    roomId: "r1",
    hotelId: "2",
    hotelName: "Sunrise Beach Resort",
    roomName: "Standard Twin",
    guest: {
      id: "g3",
      name: "David Nguyen",
      email: "david@example.com",
      phone: "+84912345678",
    },
    checkIn: "2026-02-28",
    checkOut: "2026-03-02",
    nights: 2,
    guests: 2,
    totalAmount: 178,
    status: "checked_in",
    createdAt: "2026-02-10",
    updatedAt: "2026-02-28",
  },
  {
    id: "b4",
    roomId: "r2",
    hotelId: "2",
    hotelName: "Sunrise Beach Resort",
    roomName: "Deluxe Ocean View",
    guest: {
      id: "g4",
      name: "Emily Chen",
      email: "emily@example.com",
      phone: "+84923456789",
    },
    checkIn: "2026-02-20",
    checkOut: "2026-02-24",
    nights: 4,
    guests: 1,
    totalAmount: 660,
    status: "checked_out",
    createdAt: "2026-02-01",
    updatedAt: "2026-02-24",
  },
  {
    id: "b5",
    roomId: "r1",
    hotelId: "1",
    hotelName: "Grand Palace Hotel",
    roomName: "Standard Twin",
    guest: {
      id: "g5",
      name: "Michael Wang",
      email: "michael@example.com",
      phone: "+84934567890",
    },
    checkIn: "2026-03-20",
    checkOut: "2026-03-23",
    nights: 3,
    guests: 2,
    totalAmount: 267,
    status: "cancelled",
    createdAt: "2026-02-18",
    updatedAt: "2026-02-22",
  },
];

const SUMMARY_STATS = [
  {
    label: "Total Bookings",
    value: 5,
    icon: Calendar,
    color: "text-blue-600",
    bg: "bg-blue-50 dark:bg-blue-950/30",
  },
  {
    label: "Pending Review",
    value: 1,
    icon: Clock,
    color: "text-amber-600",
    bg: "bg-amber-50 dark:bg-amber-950/30",
  },
  {
    label: "Confirmed",
    value: 1,
    icon: CheckCircle,
    color: "text-emerald-600",
    bg: "bg-emerald-50 dark:bg-emerald-950/30",
  },
  {
    label: "Revenue This Month",
    value: "$2,385",
    icon: TrendingUp,
    color: "text-purple-600",
    bg: "bg-purple-50 dark:bg-purple-950/30",
  },
];

export default function ReservationsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["owner-reservations"],
    queryFn: () => bookingService.getReservations(),
    placeholderData: {
      success: true,
      data: MOCK_BOOKINGS,
      error: null,
      meta: { total: MOCK_BOOKINGS.length, page: 1, limit: 20, totalPages: 1 },
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: BookingStatus }) =>
      bookingService.updateStatus(id, status),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["owner-reservations"] }),
  });

  const bookings = data?.data ?? MOCK_BOOKINGS;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Reservations</h1>
        <p className="text-muted-foreground mt-1">
          Manage all bookings across your properties
        </p>
      </div>

      {/* Summary stats */}
      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {SUMMARY_STATS.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.label}>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${stat.bg}`}>
                    <Icon className={`w-5 h-5 ${stat.color}`} />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">
                      {stat.label}
                    </p>
                    <p className="font-bold text-lg">{stat.value}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Bookings table */}
      {isLoading ? (
        <Skeleton className="h-96 rounded-xl" />
      ) : (
        <BookingTable
          bookings={bookings}
          onViewBooking={(id) => router.push(`/owner/reservations/${id}`)}
          onUpdateStatus={(id, status) => statusMutation.mutate({ id, status })}
        />
      )}
    </div>
  );
}
