import type { MapBounds } from "@/types/search.types";

export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371e3;
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLon = (lon2 - lon1) * rad;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * rad) *
      Math.cos(lat2 * rad) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function getBoundsRadius(bounds: MapBounds): number {
  const centerLat =
    (bounds.northEast.latitude + bounds.southWest.latitude) / 2;
  const centerLng =
    (bounds.northEast.longitude + bounds.southWest.longitude) / 2;
  return calculateDistance(
    centerLat,
    centerLng,
    bounds.northEast.latitude,
    bounds.northEast.longitude,
  );
}

export function getBoundsCenter(bounds: MapBounds) {
  return {
    latitude: (bounds.northEast.latitude + bounds.southWest.latitude) / 2,
    longitude: (bounds.northEast.longitude + bounds.southWest.longitude) / 2,
  };
}
