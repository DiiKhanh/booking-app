"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  ArrowLeft,
  Bed,
  DollarSign,
  Users,
  Edit,
  Trash2,
  Calendar,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import {
  type ColumnDef,
  flexRender,
} from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { RoomForm } from "@/components/owner/room-form";
import { hotelService } from "@/services/hotel.service";
import { useDataTable } from "@/hooks/use-data-table";
import type { Room, CreateRoomDto } from "@/types/hotel.types";

// Mock data
const MOCK_ROOMS: Room[] = [
  {
    id: "r1",
    hotelId: "1",
    name: "Standard Twin",
    type: "standard",
    description: "Comfortable twin room with garden view",
    capacity: 2,
    bedType: "Twin",
    size: 22,
    basePrice: 89,
    photos: [],
    amenities: ["WiFi", "TV", "Air Conditioning"],
    isActive: true,
    createdAt: "2024-01-15",
    updatedAt: "2024-06-01",
  },
  {
    id: "r2",
    hotelId: "1",
    name: "Deluxe Ocean View",
    type: "deluxe",
    description: "Spacious room with breathtaking ocean views",
    capacity: 2,
    bedType: "King",
    size: 38,
    basePrice: 165,
    photos: [],
    amenities: ["WiFi", "TV", "Mini Bar", "Balcony", "Ocean View"],
    isActive: true,
    createdAt: "2024-01-15",
    updatedAt: "2024-06-01",
  },
  {
    id: "r3",
    hotelId: "1",
    name: "Executive Suite",
    type: "suite",
    description: "Luxurious suite with separate living area",
    capacity: 3,
    bedType: "Super King",
    size: 72,
    basePrice: 320,
    photos: [],
    amenities: ["WiFi", "TV", "Mini Bar", "Bathtub", "Balcony", "Ocean View", "Sofa"],
    isActive: true,
    createdAt: "2024-02-20",
    updatedAt: "2024-06-01",
  },
  {
    id: "r4",
    hotelId: "1",
    name: "Standard Double",
    type: "standard",
    description: "Cozy double room for couples",
    capacity: 2,
    bedType: "Double",
    size: 20,
    basePrice: 79,
    photos: [],
    amenities: ["WiFi", "TV", "Air Conditioning"],
    isActive: false,
    createdAt: "2024-03-10",
    updatedAt: "2024-06-01",
  },
];

const ROOM_TYPE_COLORS: Record<string, string> = {
  standard: "secondary",
  deluxe: "default",
  suite: "outline",
  penthouse: "default",
};

export default function RoomsPage() {
  const { id: hotelId } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [editRoom, setEditRoom] = useState<Room | null>(null);
  const [deleteRoom, setDeleteRoom] = useState<Room | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["rooms", hotelId],
    queryFn: () => hotelService.getRooms(hotelId),
    placeholderData: { success: true, data: MOCK_ROOMS, error: null },
  });

  const rooms = data?.data ?? MOCK_ROOMS;

  const createMutation = useMutation({
    mutationFn: (dto: CreateRoomDto) => hotelService.createRoom(hotelId, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rooms", hotelId] });
      setAddOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: CreateRoomDto }) =>
      hotelService.updateRoom(id, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rooms", hotelId] });
      setEditRoom(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (roomId: string) => hotelService.deleteRoom(roomId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rooms", hotelId] });
      setDeleteRoom(null);
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      hotelService.updateRoom(id, { isActive }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["rooms", hotelId] }),
  });

  const columns: ColumnDef<Room>[] = [
    {
      accessorKey: "name",
      header: "Room",
      cell: ({ row }) => (
        <div>
          <p className="font-medium">{row.original.name}</p>
          <p className="text-xs text-muted-foreground truncate max-w-48">
            {row.original.description}
          </p>
        </div>
      ),
    },
    {
      accessorKey: "type",
      header: "Type",
      cell: ({ row }) => (
        <Badge variant={ROOM_TYPE_COLORS[row.original.type] as never}>
          {row.original.type.charAt(0).toUpperCase() + row.original.type.slice(1)}
        </Badge>
      ),
    },
    {
      accessorKey: "capacity",
      header: "Capacity",
      cell: ({ row }) => (
        <div className="flex items-center gap-1 text-sm">
          <Users className="w-3.5 h-3.5 text-muted-foreground" />
          {row.original.capacity} guests
        </div>
      ),
    },
    {
      accessorKey: "bedType",
      header: "Bed",
      cell: ({ row }) => (
        <div className="flex items-center gap-1 text-sm">
          <Bed className="w-3.5 h-3.5 text-muted-foreground" />
          {row.original.bedType}
        </div>
      ),
    },
    {
      accessorKey: "basePrice",
      header: "Price",
      cell: ({ row }) => (
        <div className="flex items-center gap-1 font-semibold">
          <DollarSign className="w-3.5 h-3.5 text-muted-foreground" />
          {row.original.basePrice}/night
        </div>
      ),
    },
    {
      accessorKey: "isActive",
      header: "Status",
      cell: ({ row }) => (
        <button
          onClick={() =>
            toggleMutation.mutate({
              id: row.original.id,
              isActive: !row.original.isActive,
            })
          }
          className="cursor-pointer flex items-center gap-1.5"
        >
          {row.original.isActive ? (
            <>
              <ToggleRight className="w-5 h-5 text-emerald-500" />
              <span className="text-xs text-emerald-600 font-medium">Active</span>
            </>
          ) : (
            <>
              <ToggleLeft className="w-5 h-5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Inactive</span>
            </>
          )}
        </button>
      ),
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 cursor-pointer"
            asChild
          >
            <Link href={`/owner/properties/${hotelId}/rooms/${row.original.id}/inventory`}>
              <Calendar className="w-3.5 h-3.5" />
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 cursor-pointer"
            onClick={() => setEditRoom(row.original)}
          >
            <Edit className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive cursor-pointer hover:text-destructive"
            onClick={() => setDeleteRoom(row.original)}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  const { table, globalFilter, setGlobalFilter } = useDataTable({ data: rooms, columns });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/owner/properties/${hotelId}`}>
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Room Management</h1>
            <p className="text-muted-foreground text-sm">
              {rooms.length} rooms • {rooms.filter((r) => r.isActive).length} active
            </p>
          </div>
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Room
        </Button>
      </div>

      {/* Search */}
      <Input
        placeholder="Search rooms..."
        value={globalFilter}
        onChange={(e) => setGlobalFilter(e.target.value)}
        className="max-w-sm"
      />

      {/* Table */}
      <div className="border border-border rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id} className="bg-muted/30">
                {hg.headers.map((h) => (
                  <TableHead key={h.id}>
                    {h.isPlaceholder
                      ? null
                      : flexRender(h.column.columnDef.header, h.getContext())}
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
                  No rooms found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <p>
          {table.getFilteredRowModel().rows.length} room(s)
        </p>
        <div className="flex gap-2">
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

      {/* Add Room Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Room</DialogTitle>
          </DialogHeader>
          <RoomForm
            onSubmit={(dto) => createMutation.mutate(dto)}
            isLoading={createMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Room Dialog */}
      <Dialog open={!!editRoom} onOpenChange={(o) => !o && setEditRoom(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Room — {editRoom?.name}</DialogTitle>
          </DialogHeader>
          {editRoom && (
            <RoomForm
              room={editRoom}
              onSubmit={(dto) =>
                updateMutation.mutate({ id: editRoom.id, dto })
              }
              isLoading={updateMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog
        open={!!deleteRoom}
        onOpenChange={(o) => !o && setDeleteRoom(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Room</AlertDialogTitle>
            <AlertDialogDescription>
              Delete &quot;{deleteRoom?.name}&quot;? This will also remove all inventory
              records for this room.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteRoom && deleteMutation.mutate(deleteRoom.id)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
