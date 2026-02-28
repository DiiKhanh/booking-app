"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Search,
  SlidersHorizontal,
  ExternalLink,
  BookOpen,
  Clock,
  CheckCircle,
  XCircle,
  LogIn,
  LogOut,
  AlertCircle,
  Calendar,
  DollarSign,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { bookingService } from "@/services/booking.service";
import type { Booking, BookingStatus } from "@/types/booking.types";

const MOCK_BOOKINGS: Booking[] = [
  { id: "b1", roomId: "r1", hotelId: "h1", hotelName: "Grand Palace Hotel", roomName: "Deluxe Suite", guest: { id: "g1", name: "John Smith", email: "john@example.com", phone: "+84901234567" }, checkIn: "2026-03-01", checkOut: "2026-03-05", nights: 4, guests: 2, totalAmount: 660, status: "confirmed", createdAt: "2026-02-15T10:30:00Z", updatedAt: "2026-02-15T10:30:00Z" },
  { id: "b2", roomId: "r2", hotelId: "h1", hotelName: "Grand Palace Hotel", roomName: "Executive Suite", guest: { id: "g2", name: "Sarah Lee", email: "sarah@example.com", phone: "+84907654321" }, checkIn: "2026-03-10", checkOut: "2026-03-14", nights: 4, guests: 2, totalAmount: 1280, status: "pending", createdAt: "2026-02-20T09:00:00Z", updatedAt: "2026-02-20T09:00:00Z" },
  { id: "b3", roomId: "r3", hotelId: "h2", hotelName: "Sunrise Beach Resort", roomName: "Ocean View", guest: { id: "g3", name: "David Nguyen", email: "david@example.com", phone: "+84912345678" }, checkIn: "2026-02-28", checkOut: "2026-03-02", nights: 2, guests: 2, totalAmount: 178, status: "checked_in", createdAt: "2026-02-10T14:00:00Z", updatedAt: "2026-02-28T14:00:00Z" },
  { id: "b4", roomId: "r4", hotelId: "h3", hotelName: "Mountain View Lodge", roomName: "Standard Room", guest: { id: "g4", name: "Emily Chen", email: "emily@example.com", phone: "+84923456789" }, checkIn: "2026-02-20", checkOut: "2026-02-24", nights: 4, guests: 1, totalAmount: 660, status: "checked_out", createdAt: "2026-02-01T11:00:00Z", updatedAt: "2026-02-24T12:00:00Z" },
  { id: "b5", roomId: "r5", hotelId: "h1", hotelName: "Grand Palace Hotel", roomName: "Standard Twin", guest: { id: "g5", name: "Michael Wang", email: "michael@example.com", phone: "+84934567890" }, checkIn: "2026-03-20", checkOut: "2026-03-23", nights: 3, guests: 2, totalAmount: 267, status: "cancelled", createdAt: "2026-02-18T16:00:00Z", updatedAt: "2026-02-22T10:00:00Z" },
  { id: "b6", roomId: "r6", hotelId: "h2", hotelName: "Sunrise Beach Resort", roomName: "Deluxe Pool View", guest: { id: "g6", name: "Anna Tran", email: "anna@example.com", phone: "+84945678901" }, checkIn: "2026-03-05", checkOut: "2026-03-08", nights: 3, guests: 2, totalAmount: 480, status: "disputed", createdAt: "2026-02-25T08:00:00Z", updatedAt: "2026-02-26T09:00:00Z" },
];

const STATUS_CONFIG: Record<BookingStatus, { label: string; icon: React.ElementType; className: string }> = {
  pending: { label: "Pending", icon: Clock, className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  confirmed: { label: "Confirmed", icon: CheckCircle, className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
  checked_in: { label: "Checked In", icon: LogIn, className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  checked_out: { label: "Checked Out", icon: LogOut, className: "bg-muted text-muted-foreground" },
  cancelled: { label: "Cancelled", icon: XCircle, className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  disputed: { label: "Disputed", icon: AlertCircle, className: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" },
};

const SUMMARY = [
  { label: "Total Bookings", value: MOCK_BOOKINGS.length, icon: BookOpen, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950/30" },
  { label: "Active Today", value: MOCK_BOOKINGS.filter(b => b.status === "checked_in").length, icon: LogIn, color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950/30" },
  { label: "Pending Review", value: MOCK_BOOKINGS.filter(b => b.status === "pending").length, icon: Clock, color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-950/30" },
  { label: "Disputes", value: MOCK_BOOKINGS.filter(b => b.status === "disputed").length, icon: AlertCircle, color: "text-orange-600", bg: "bg-orange-50 dark:bg-orange-950/30" },
];

export default function AdminBookingsPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<BookingStatus | "all">("all");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-bookings"],
    queryFn: () => bookingService.getAllBookings(),
    placeholderData: {
      success: true,
      data: MOCK_BOOKINGS,
      error: null,
      meta: { total: MOCK_BOOKINGS.length, page: 1, limit: 20, totalPages: 1 },
    },
  });

  const bookings = data?.data ?? MOCK_BOOKINGS;

  const filtered = bookings.filter((b) => {
    const matchStatus = statusFilter === "all" || b.status === statusFilter;
    const matchSearch =
      !search ||
      b.guest.name.toLowerCase().includes(search.toLowerCase()) ||
      b.hotelName.toLowerCase().includes(search.toLowerCase()) ||
      b.id.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const totalRevenue = bookings
    .filter((b) => b.status !== "cancelled")
    .reduce((s, b) => s + b.totalAmount, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">All Bookings</h1>
          <p className="text-muted-foreground mt-1">
            Platform-wide booking oversight and management
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground rounded-lg border border-border px-3 py-1.5">
          <DollarSign className="h-4 w-4" />
          <span>Total Revenue: <span className="font-semibold text-foreground font-heading">${totalRevenue.toLocaleString()}</span></span>
        </div>
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
          {SUMMARY.map((stat) => {
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
      )}

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-52">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search guest, hotel, booking ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-muted-foreground" />
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as BookingStatus | "all")}>
            <SelectTrigger className="w-40 cursor-pointer">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {(Object.keys(STATUS_CONFIG) as BookingStatus[]).map((s) => (
                <SelectItem key={s} value={s}>{STATUS_CONFIG[s].label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <p className="text-sm text-muted-foreground ml-auto">
          {filtered.length} of {bookings.length} bookings
        </p>
      </div>

      {/* Table */}
      {isLoading ? (
        <Skeleton className="h-96 rounded-xl" />
      ) : (
        <div className="border border-border rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead>Guest</TableHead>
                <TableHead>Property / Room</TableHead>
                <TableHead>Dates</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    No bookings found
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((booking) => {
                  const cfg = STATUS_CONFIG[booking.status];
                  const StatusIcon = cfg.icon;
                  return (
                    <TableRow
                      key={booking.id}
                      className="hover:bg-muted/20 cursor-pointer"
                      onClick={() => router.push(`/admin/bookings/${booking.id}`)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="w-7 h-7">
                            <AvatarFallback className="text-xs">
                              {booking.guest.name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium">{booking.guest.name}</p>
                            <p className="text-xs text-muted-foreground">{booking.guest.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm font-medium">{booking.hotelName}</p>
                        <p className="text-xs text-muted-foreground">{booking.roomName}</p>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                          <span>{format(new Date(booking.checkIn), "MMM d")} – {format(new Date(booking.checkOut), "MMM d")}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">{booking.nights} nights</p>
                      </TableCell>
                      <TableCell>
                        <span className="font-semibold font-heading text-sm">
                          ${booking.totalAmount.toLocaleString()}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${cfg.className}`}>
                          <StatusIcon className="h-3 w-3" />
                          {cfg.label}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(booking.createdAt), "MMM d, yyyy")}
                        </span>
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-7 w-7 cursor-pointer" onClick={() => router.push(`/admin/bookings/${booking.id}`)}>
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
