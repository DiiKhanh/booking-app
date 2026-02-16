import { useQuery } from "@tanstack/react-query";

import { hotelService } from "@/services/hotel.service";
import type { HotelSearchParams } from "@/types";

export function useTrendingHotels() {
  return useQuery({
    queryKey: ["hotels", "trending"],
    queryFn: () => hotelService.search({ sortBy: "rating", limit: 10 }),
  });
}

export function useSearchHotels(params: HotelSearchParams, enabled = true) {
  return useQuery({
    queryKey: ["hotels", "search", params],
    queryFn: () => hotelService.search(params),
    enabled,
  });
}

export function useHotelDetail(id: string) {
  return useQuery({
    queryKey: ["hotel", id],
    queryFn: () => hotelService.getById(id),
    enabled: !!id,
  });
}

export function useHotelRooms(
  hotelId: string,
  checkIn?: string,
  checkOut?: string,
) {
  return useQuery({
    queryKey: ["hotel", hotelId, "rooms", checkIn, checkOut],
    queryFn: () => hotelService.getRooms(hotelId, checkIn, checkOut),
    enabled: !!hotelId,
  });
}
