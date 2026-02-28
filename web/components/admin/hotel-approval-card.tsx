"use client";

import Link from "next/link";
import { MapPin, Building2, Star, User, Clock, CheckCircle, XCircle, Eye } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Hotel } from "@/types/hotel.types";

interface HotelApprovalCardProps {
  hotel: Hotel;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  isApproving?: boolean;
  isRejecting?: boolean;
}

export function HotelApprovalCard({
  hotel,
  onApprove,
  onReject,
  isApproving,
  isRejecting,
}: HotelApprovalCardProps) {
  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <CardContent className="p-0">
        <div className="flex gap-0">
          {/* Photo */}
          <div className="w-48 shrink-0 bg-muted flex items-center justify-center">
            {hotel.photos[0] ? (
              <img
                src={hotel.photos[0]}
                alt={hotel.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <Building2 className="w-10 h-10 text-muted-foreground" />
            )}
          </div>

          {/* Details */}
          <div className="flex-1 p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-lg leading-tight">{hotel.name}</h3>
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: hotel.starRating }).map((_, i) => (
                      <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <MapPin className="w-3.5 h-3.5" />
                  {hotel.address}, {hotel.city}, {hotel.country}
                </div>

                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <User className="w-3.5 h-3.5" />
                  Owner ID: {hotel.ownerId}
                </div>

                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Clock className="w-3.5 h-3.5" />
                  Submitted {new Date(hotel.createdAt).toLocaleDateString()}
                </div>

                {hotel.amenities.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {hotel.amenities.slice(0, 4).map((a) => (
                      <Badge key={a} variant="secondary" className="text-xs">
                        {a}
                      </Badge>
                    ))}
                    {hotel.amenities.length > 4 && (
                      <Badge variant="outline" className="text-xs">
                        +{hotel.amenities.length - 4}
                      </Badge>
                    )}
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2 shrink-0">
                <Button
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={() => onApprove(hotel.id)}
                  disabled={isApproving || isRejecting}
                >
                  <CheckCircle className="w-3.5 h-3.5 mr-1.5" />
                  {isApproving ? "Approving..." : "Approve"}
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => onReject(hotel.id)}
                  disabled={isApproving || isRejecting}
                >
                  <XCircle className="w-3.5 h-3.5 mr-1.5" />
                  {isRejecting ? "Rejecting..." : "Reject"}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  asChild
                >
                  <Link href={`/admin/hotels/${hotel.id}`}>
                    <Eye className="w-3.5 h-3.5 mr-1.5" />
                    Review
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
