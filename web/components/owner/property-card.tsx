"use client";

import Link from "next/link";
import { Building2, MapPin, Star, TrendingUp, Bed } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { Hotel, HotelStatus } from "@/types/hotel.types";

const STATUS_CONFIG: Record<
  HotelStatus,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  approved: { label: "Approved", variant: "default" },
  pending: { label: "Pending Review", variant: "secondary" },
  rejected: { label: "Rejected", variant: "destructive" },
  suspended: { label: "Suspended", variant: "outline" },
};

interface PropertyCardProps {
  hotel: Hotel;
  view?: "grid" | "list";
}

export function PropertyCard({ hotel, view = "grid" }: PropertyCardProps) {
  const statusCfg = STATUS_CONFIG[hotel.status];
  const occupancyColor =
    hotel.occupancyRate >= 80
      ? "text-emerald-600 dark:text-emerald-400"
      : hotel.occupancyRate >= 50
        ? "text-amber-600 dark:text-amber-400"
        : "text-red-600 dark:text-red-400";

  if (view === "list") {
    return (
      <Card className="flex flex-row items-center gap-4 p-4 hover:shadow-md transition-shadow cursor-pointer group">
        {/* Thumbnail */}
        <div className="w-24 h-20 rounded-lg overflow-hidden shrink-0 bg-muted flex items-center justify-center">
          {hotel.photos[0] ? (
            <img
              src={hotel.photos[0]}
              alt={hotel.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <Building2 className="w-8 h-8 text-muted-foreground" />
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">
              {hotel.name}
            </h3>
            <Badge variant={statusCfg.variant} className="shrink-0">
              {statusCfg.label}
            </Badge>
          </div>
          <div className="flex items-center gap-1 text-sm text-muted-foreground mb-1">
            <MapPin className="w-3.5 h-3.5" />
            <span className="truncate">{hotel.city}, {hotel.country}</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="flex items-center gap-1">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              {hotel.starRating}-star
            </span>
            <span className="flex items-center gap-1 text-muted-foreground">
              <Bed className="w-3.5 h-3.5" />
              {hotel.totalRooms} rooms
            </span>
          </div>
        </div>

        {/* Stats */}
        <div className="hidden sm:flex items-center gap-6 shrink-0">
          <div className="text-center">
            <p className={`text-lg font-bold ${occupancyColor}`}>
              {hotel.occupancyRate}%
            </p>
            <p className="text-xs text-muted-foreground">Occupancy</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-foreground">
              ${hotel.averagePrice}
            </p>
            <p className="text-xs text-muted-foreground">Avg/night</p>
          </div>
        </div>

        {/* Actions */}
        <div className="shrink-0 flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={`/owner/properties/${hotel.id}`}>Manage</Link>
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer group">
      {/* Photo */}
      <div className="relative h-44 bg-muted overflow-hidden">
        {hotel.photos[0] ? (
          <img
            src={hotel.photos[0]}
            alt={hotel.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Building2 className="w-12 h-12 text-muted-foreground" />
          </div>
        )}
        <div className="absolute top-3 left-3">
          <Badge variant={statusCfg.variant}>{statusCfg.label}</Badge>
        </div>
        <div className="absolute top-3 right-3">
          <div className="flex items-center gap-1 bg-black/60 text-white text-xs px-2 py-1 rounded-full">
            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
            {hotel.starRating}
          </div>
        </div>
      </div>

      <CardContent className="p-4">
        <h3 className="font-semibold text-foreground mb-1 truncate group-hover:text-primary transition-colors">
          {hotel.name}
        </h3>
        <div className="flex items-center gap-1 text-sm text-muted-foreground mb-3">
          <MapPin className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">{hotel.city}, {hotel.country}</span>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-2 py-3 border-t border-border">
          <div className="text-center">
            <p className={`font-bold text-sm ${occupancyColor}`}>
              {hotel.occupancyRate}%
            </p>
            <p className="text-xs text-muted-foreground">Occupancy</p>
          </div>
          <div className="text-center border-x border-border">
            <p className="font-bold text-sm text-foreground">
              {hotel.totalRooms}
            </p>
            <p className="text-xs text-muted-foreground">Rooms</p>
          </div>
          <div className="text-center">
            <p className="font-bold text-sm text-foreground">
              ${hotel.averagePrice}
            </p>
            <p className="text-xs text-muted-foreground">Avg/night</p>
          </div>
        </div>

        {/* Revenue */}
        <div className="flex items-center gap-1.5 mt-2 text-sm">
          <TrendingUp className="w-4 h-4 text-emerald-500" />
          <span className="text-muted-foreground">Revenue:</span>
          <span className="font-semibold text-foreground">
            ${hotel.totalRevenue.toLocaleString()}
          </span>
        </div>
      </CardContent>

      <CardFooter className="p-4 pt-0 gap-2">
        <Button asChild className="flex-1" size="sm">
          <Link href={`/owner/properties/${hotel.id}`}>Manage</Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href={`/owner/properties/${hotel.id}/rooms`}>Rooms</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
