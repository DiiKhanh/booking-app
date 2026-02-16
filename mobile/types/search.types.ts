import type { HotelSearchParams } from "./hotel.types";

export interface MapBounds {
  readonly northEast: {
    readonly latitude: number;
    readonly longitude: number;
  };
  readonly southWest: {
    readonly latitude: number;
    readonly longitude: number;
  };
}

export interface SearchFilters extends HotelSearchParams {
  readonly mapBounds?: MapBounds;
}

export interface SearchSuggestion {
  readonly id: string;
  readonly text: string;
  readonly type: "city" | "hotel" | "area";
}
