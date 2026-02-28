"use client";

import { useState } from "react";
import { format } from "date-fns";
import {
  type ColumnDef,
  flexRender,
} from "@tanstack/react-table";
import {
  Search,
  SlidersHorizontal,
  ExternalLink,
  CheckCircle,
  XCircle,
  Clock,
  LogIn,
  LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useDataTable } from "@/hooks/use-data-table";
import type { Booking, BookingStatus } from "@/types/booking.types";

const STATUS_CONFIG: Record<
  BookingStatus,
  { label: string; icon: React.ElementType; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  pending: { label: "Pending", icon: Clock, variant: "secondary" },
  confirmed: { label: "Confirmed", icon: CheckCircle, variant: "default" },
  checked_in: { label: "Checked In", icon: LogIn, variant: "default" },
  checked_out: { label: "Checked Out", icon: LogOut, variant: "outline" },
  cancelled: { label: "Cancelled", icon: XCircle, variant: "destructive" },
  disputed: { label: "Disputed", icon: XCircle, variant: "destructive" },
};

interface BookingTableProps {
  bookings: Booking[];
  onViewBooking?: (id: string) => void;
  onUpdateStatus?: (id: string, status: BookingStatus) => void;
  isLoading?: boolean;
}

export function BookingTable({
  bookings,
  onViewBooking,
  onUpdateStatus,
  isLoading,
}: BookingTableProps) {
  const [statusFilter, setStatusFilter] = useState<BookingStatus | "all">("all");

  const filtered = statusFilter === "all"
    ? bookings
    : bookings.filter((b) => b.status === statusFilter);

  const columns: ColumnDef<Booking>[] = [
    {
      accessorKey: "guest",
      header: "Guest",
      cell: ({ row }) => {
        const guest = row.original.guest;
        return (
          <div className="flex items-center gap-2">
            <Avatar className="w-8 h-8">
              <AvatarFallback className="text-xs">
                {guest.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium">{guest.name}</p>
              <p className="text-xs text-muted-foreground">{guest.email}</p>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "roomName",
      header: "Room",
      cell: ({ row }) => (
        <div>
          <p className="text-sm font-medium">{row.original.roomName}</p>
          <p className="text-xs text-muted-foreground">{row.original.hotelName}</p>
        </div>
      ),
    },
    {
      accessorKey: "checkIn",
      header: "Check In",
      cell: ({ row }) => (
        <span className="text-sm">
          {format(new Date(row.original.checkIn), "MMM d, yyyy")}
        </span>
      ),
    },
    {
      accessorKey: "checkOut",
      header: "Check Out",
      cell: ({ row }) => (
        <span className="text-sm">
          {format(new Date(row.original.checkOut), "MMM d, yyyy")}
        </span>
      ),
    },
    {
      accessorKey: "nights",
      header: "Nights",
      cell: ({ row }) => (
        <span className="text-sm">{row.original.nights}n</span>
      ),
    },
    {
      accessorKey: "totalAmount",
      header: "Total",
      cell: ({ row }) => (
        <span className="text-sm font-semibold">
          ${row.original.totalAmount.toLocaleString()}
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const cfg = STATUS_CONFIG[row.original.status];
        const Icon = cfg.icon;
        return (
          <Badge variant={cfg.variant} className="flex items-center gap-1 w-fit">
            <Icon className="w-3 h-3" />
            {cfg.label}
          </Badge>
        );
      },
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          {row.original.status === "pending" && (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-emerald-600 hover:text-emerald-700 cursor-pointer"
                onClick={() =>
                  onUpdateStatus?.(row.original.id, "confirmed")
                }
              >
                Accept
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-destructive hover:text-destructive cursor-pointer"
                onClick={() =>
                  onUpdateStatus?.(row.original.id, "cancelled")
                }
              >
                Decline
              </Button>
            </>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 cursor-pointer"
            onClick={() => onViewBooking?.(row.original.id)}
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  const { table, globalFilter, setGlobalFilter } = useDataTable({
    data: filtered,
    columns,
    pageSize: 10,
  });

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search guest, room..."
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-muted-foreground" />
          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as BookingStatus | "all")}
          >
            <SelectTrigger className="w-36">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {(Object.keys(STATUS_CONFIG) as BookingStatus[]).map((s) => (
                <SelectItem key={s} value={s}>
                  {STATUS_CONFIG[s].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="border border-border rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id} className="bg-muted/30">
                {hg.headers.map((h) => (
                  <TableHead
                    key={h.id}
                    className="cursor-pointer select-none"
                    onClick={h.column.getToggleSortingHandler()}
                  >
                    <div className="flex items-center gap-1">
                      {h.isPlaceholder
                        ? null
                        : flexRender(h.column.columnDef.header, h.getContext())}
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} className="hover:bg-muted/20">
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="text-center py-12 text-muted-foreground"
                >
                  No reservations found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <p>
          Showing {table.getRowModel().rows.length} of{" "}
          {table.getFilteredRowModel().rows.length} reservation(s)
        </p>
        <div className="flex items-center gap-2">
          <span>
            Page {table.getState().pagination.pageIndex + 1} of{" "}
            {table.getPageCount()}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
