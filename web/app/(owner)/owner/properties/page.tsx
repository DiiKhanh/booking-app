"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Plus,
  LayoutGrid,
  List,
  Search,
  SlidersHorizontal,
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
import { Skeleton } from "@/components/ui/skeleton";
import { PropertyCard } from "@/components/owner/property-card";
import { hotelService } from "@/services/hotel.service";
import type { Hotel, HotelStatus } from "@/types/hotel.types";

// Mock data for development
const MOCK_HOTELS: Hotel[] = [
  {
    id: "1",
    name: "Grand Palace Hotel",
    description: "Luxurious 5-star hotel in the heart of the city",
    address: "123 Main St",
    city: "Ho Chi Minh City",
    country: "Vietnam",
    starRating: 5,
    status: "approved",
    ownerId: "owner-1",
    photos: [],
    amenities: ["pool", "spa", "gym", "restaurant"],
    totalRooms: 120,
    availableRooms: 34,
    averagePrice: 180,
    occupancyRate: 72,
    totalRevenue: 245800,
    rating: 4.8,
    reviewCount: 342,
    createdAt: "2024-01-15",
    updatedAt: "2024-06-01",
  },
  {
    id: "2",
    name: "Sunrise Beach Resort",
    description: "Beautiful beachfront resort with stunning ocean views",
    address: "456 Beach Rd",
    city: "Da Nang",
    country: "Vietnam",
    starRating: 4,
    status: "approved",
    ownerId: "owner-1",
    photos: [],
    amenities: ["beach", "pool", "restaurant", "bar"],
    totalRooms: 85,
    availableRooms: 12,
    averagePrice: 135,
    occupancyRate: 86,
    totalRevenue: 178400,
    rating: 4.6,
    reviewCount: 218,
    createdAt: "2024-03-20",
    updatedAt: "2024-06-01",
  },
  {
    id: "3",
    name: "Mountain View Lodge",
    description: "Cozy boutique hotel with panoramic mountain views",
    address: "789 Highland Ave",
    city: "Da Lat",
    country: "Vietnam",
    starRating: 3,
    status: "pending",
    ownerId: "owner-1",
    photos: [],
    amenities: ["restaurant", "bar", "hiking"],
    totalRooms: 32,
    availableRooms: 28,
    averagePrice: 75,
    occupancyRate: 28,
    totalRevenue: 42600,
    rating: 4.2,
    reviewCount: 89,
    createdAt: "2024-05-10",
    updatedAt: "2024-06-01",
  },
];

type ViewMode = "grid" | "list";
type SortOption = "name" | "revenue" | "occupancy" | "created";

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "name", label: "Name" },
  { value: "revenue", label: "Revenue" },
  { value: "occupancy", label: "Occupancy" },
  { value: "created", label: "Newest" },
];

function sortHotels(hotels: Hotel[], sort: SortOption): Hotel[] {
  return [...hotels].sort((a, b) => {
    switch (sort) {
      case "name":
        return a.name.localeCompare(b.name);
      case "revenue":
        return b.totalRevenue - a.totalRevenue;
      case "occupancy":
        return b.occupancyRate - a.occupancyRate;
      case "created":
        return (
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      default:
        return 0;
    }
  });
}

export default function PropertiesPage() {
  const [view, setView] = useState<ViewMode>("grid");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<HotelStatus | "all">("all");
  const [sortBy, setSortBy] = useState<SortOption>("name");

  const { data, isLoading } = useQuery({
    queryKey: ["owner-hotels", search],
    queryFn: () => hotelService.getMyHotels({ search }),
    // Fall back to mock data if backend unavailable
    placeholderData: {
      success: true,
      data: MOCK_HOTELS,
      error: null,
      meta: { total: MOCK_HOTELS.length, page: 1, limit: 20, totalPages: 1 },
    },
  });

  const hotels = data?.data ?? MOCK_HOTELS;

  const filtered = sortHotels(
    hotels.filter((h) => {
      const matchesSearch =
        !search ||
        h.name.toLowerCase().includes(search.toLowerCase()) ||
        h.city.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === "all" || h.status === statusFilter;
      return matchesSearch && matchesStatus;
    }),
    sortBy,
  );

  const counts = {
    all: hotels.length,
    approved: hotels.filter((h) => h.status === "approved").length,
    pending: hotels.filter((h) => h.status === "pending").length,
    rejected: hotels.filter((h) => h.status === "rejected").length,
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Properties</h1>
          <p className="text-muted-foreground mt-1">
            Manage your hotels and accommodations
          </p>
        </div>
        <Button asChild>
          <Link href="/owner/properties/new">
            <Plus className="w-4 h-4 mr-2" />
            Add Property
          </Link>
        </Button>
      </div>

      {/* Status tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        {(["all", "approved", "pending", "rejected"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors cursor-pointer ${
              statusFilter === s
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
            <span className="ml-1.5 text-xs opacity-70">{counts[s]}</span>
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search properties..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-muted-foreground" />
          <Select
            value={sortBy}
            onValueChange={(v) => setSortBy(v as SortOption)}
          >
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* View toggle */}
        <div className="flex items-center border border-border rounded-lg overflow-hidden">
          <button
            onClick={() => setView("grid")}
            className={`p-2 transition-colors cursor-pointer ${
              view === "grid"
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted text-muted-foreground"
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setView("list")}
            className={`p-2 transition-colors cursor-pointer ${
              view === "list"
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted text-muted-foreground"
            }`}
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Results count */}
      <p className="text-sm text-muted-foreground">
        Showing{" "}
        <span className="font-medium text-foreground">{filtered.length}</span>{" "}
        {filtered.length === 1 ? "property" : "properties"}
      </p>

      {/* Hotel grid/list */}
      {isLoading ? (
        <div
          className={
            view === "grid"
              ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
              : "flex flex-col gap-3"
          }
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <Plus className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="font-semibold mb-1">No properties found</h3>
          <p className="text-muted-foreground text-sm mb-4">
            {search
              ? `No results for "${search}"`
              : "Get started by adding your first property"}
          </p>
          {!search && (
            <Button asChild>
              <Link href="/owner/properties/new">
                <Plus className="w-4 h-4 mr-2" />
                Add Property
              </Link>
            </Button>
          )}
        </div>
      ) : (
        <div
          className={
            view === "grid"
              ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
              : "flex flex-col gap-3"
          }
        >
          {filtered.map((hotel) => (
            <PropertyCard key={hotel.id} hotel={hotel} view={view} />
          ))}
        </div>
      )}
    </div>
  );
}
