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
  Building2,
  TrendingUp,
  BedDouble,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

const STATUS_TABS: { value: HotelStatus | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "approved", label: "Active" },
  { value: "pending", label: "Pending" },
  { value: "rejected", label: "Rejected" },
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
    sortBy
  );

  const counts = {
    all: hotels.length,
    approved: hotels.filter((h) => h.status === "approved").length,
    pending: hotels.filter((h) => h.status === "pending").length,
    rejected: hotels.filter((h) => h.status === "rejected").length,
  };

  const totalRooms = hotels.reduce((s, h) => s + h.totalRooms, 0);
  const totalRevenue = hotels.reduce((s, h) => s + h.totalRevenue, 0);
  const avgOccupancy = hotels.length
    ? Math.round(hotels.reduce((s, h) => s + h.occupancyRate, 0) / hotels.length)
    : 0;
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* ── Page header ────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold font-heading tracking-tight">My Properties</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Manage your hotels and accommodations
          </p>
        </div>
        <Button asChild className="shrink-0">
          <Link href="/owner/properties/new">
            <Plus className="w-4 h-4 mr-2" />
            Add Property
          </Link>
        </Button>
      </div>

      {/* ── Portfolio stats strip ──────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          {
            label: "Properties",
            value: hotels.length,
            icon: Building2,
            color: "text-primary",
            bg: "bg-primary/8",
          },
          {
            label: "Total Rooms",
            value: totalRooms,
            icon: BedDouble,
            color: "text-blue-600",
            bg: "bg-blue-50 dark:bg-blue-950/30",
          },
          {
            label: "Avg Occupancy",
            value: `${avgOccupancy}%`,
            icon: TrendingUp,
            color: "text-emerald-600",
            bg: "bg-emerald-50 dark:bg-emerald-950/30",
          },
          {
            label: "Total Revenue",
            value: `$${(totalRevenue / 1000).toFixed(0)}k`,
            icon: Star,
            color: "text-amber-600",
            bg: "bg-amber-50 dark:bg-amber-950/30",
          },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3"
            >
              <div className={`p-2 rounded-lg shrink-0 ${stat.bg}`}>
                <Icon className={`w-4 h-4 ${stat.color}`} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
                <p className="text-lg font-bold leading-tight">{stat.value}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Status filter tabs ────────────────────────────── */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {STATUS_TABS.map((tab) => {
          const count = counts[tab.value as keyof typeof counts];
          const active = statusFilter === tab.value;
          return (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium transition-all duration-150 cursor-pointer ${
                active
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted text-muted-foreground hover:bg-muted/70 hover:text-foreground"
              }`}
            >
              {tab.label}
              <span
                className={`text-xs rounded-full px-1.5 py-0.5 min-w-5 text-center ${
                  active
                    ? "bg-white/20 text-white"
                    : "bg-background/60 text-muted-foreground"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Toolbar ──────────────────────────────────────── */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or city…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-background"
          />
        </div>

        <div className="flex items-center gap-1.5">
          <SlidersHorizontal className="w-4 h-4 text-muted-foreground" />
          <Select
            value={sortBy}
            onValueChange={(v) => setSortBy(v as SortOption)}
          >
            <SelectTrigger className="w-36 cursor-pointer">
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
        <div className="flex items-center border border-border rounded-lg overflow-hidden bg-background">
          <button
            onClick={() => setView("grid")}
            title="Grid view"
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
            title="List view"
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

      {/* ── Results count ────────────────────────────────── */}
      <p className="text-sm text-muted-foreground -mt-2">
        Showing{" "}
        <span className="font-semibold text-foreground">{filtered.length}</span>{" "}
        {filtered.length === 1 ? "property" : "properties"}
        {search && (
          <span>
            {" "}
            for &ldquo;<span className="text-foreground">{search}</span>&rdquo;
          </span>
        )}
      </p>

      {/* ── Content ──────────────────────────────────────── */}
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
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
            <Building2 className="w-7 h-7 text-muted-foreground" />
          </div>
          <h3 className="font-semibold text-lg mb-1">No properties found</h3>
          <p className="text-muted-foreground text-sm mb-6 max-w-xs">
            {search
              ? `No results for "${search}". Try a different search.`
              : "Get started by adding your first property."}
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
