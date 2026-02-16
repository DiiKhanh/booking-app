import { create } from "zustand";
import type { MapBounds } from "@/types";

interface SearchState {
  readonly query: string;
  readonly checkIn: string;
  readonly checkOut: string;
  readonly guests: number;
  readonly priceMin?: number;
  readonly priceMax?: number;
  readonly amenities: readonly string[];
  readonly mapBounds?: MapBounds;
  readonly sortBy: "price" | "rating" | "distance";
}

interface SearchActions {
  setQuery: (query: string) => void;
  setDates: (checkIn: string, checkOut: string) => void;
  setGuests: (guests: number) => void;
  setPriceRange: (min?: number, max?: number) => void;
  setAmenities: (amenities: readonly string[]) => void;
  setMapBounds: (bounds: MapBounds) => void;
  setSortBy: (sortBy: "price" | "rating" | "distance") => void;
  resetFilters: () => void;
}

type SearchStore = SearchState & SearchActions;

const initialState: SearchState = {
  query: "",
  checkIn: "",
  checkOut: "",
  guests: 1,
  priceMin: undefined,
  priceMax: undefined,
  amenities: [],
  mapBounds: undefined,
  sortBy: "rating",
};

export const useSearchStore = create<SearchStore>()((set) => ({
  ...initialState,

  setQuery: (query) => set({ query }),
  setDates: (checkIn, checkOut) => set({ checkIn, checkOut }),
  setGuests: (guests) => set({ guests }),
  setPriceRange: (priceMin, priceMax) => set({ priceMin, priceMax }),
  setAmenities: (amenities) => set({ amenities }),
  setMapBounds: (mapBounds) => set({ mapBounds }),
  setSortBy: (sortBy) => set({ sortBy }),
  resetFilters: () => set(initialState),
}));
