import { useSearchStore } from "@/stores/search.store";
import type { MapBounds } from "@/types";

export function useSearch() {
  const query = useSearchStore((s) => s.query);
  const checkIn = useSearchStore((s) => s.checkIn);
  const checkOut = useSearchStore((s) => s.checkOut);
  const guests = useSearchStore((s) => s.guests);
  const priceMin = useSearchStore((s) => s.priceMin);
  const priceMax = useSearchStore((s) => s.priceMax);
  const amenities = useSearchStore((s) => s.amenities);
  const mapBounds = useSearchStore((s) => s.mapBounds);
  const sortBy = useSearchStore((s) => s.sortBy);

  const setQuery = useSearchStore((s) => s.setQuery);
  const setDates = useSearchStore((s) => s.setDates);
  const setGuests = useSearchStore((s) => s.setGuests);
  const setPriceRange = useSearchStore((s) => s.setPriceRange);
  const setAmenities = useSearchStore((s) => s.setAmenities);
  const setMapBounds = useSearchStore((s) => s.setMapBounds);
  const setSortBy = useSearchStore((s) => s.setSortBy);
  const resetFilters = useSearchStore((s) => s.resetFilters);

  return {
    query,
    checkIn,
    checkOut,
    guests,
    priceMin,
    priceMax,
    amenities,
    mapBounds,
    sortBy,

    setQuery,
    setDates,
    setGuests,
    setPriceRange,
    setAmenities,
    setMapBounds,
    setSortBy,
    resetFilters,
  };
}
