export interface Hotel {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly address: string;
  readonly city: string;
  readonly country: string;
  readonly latitude: number;
  readonly longitude: number;
  readonly rating: number;
  readonly reviewCount: number;
  readonly images: readonly string[];
  readonly amenities: readonly string[];
  readonly priceRange: PriceRange;
  readonly ownerId: string;
  readonly status: HotelStatus;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface PriceRange {
  readonly min: number;
  readonly max: number;
  readonly currency: string;
}

export type HotelStatus = "pending" | "approved" | "rejected" | "suspended";

export interface Room {
  readonly id: string;
  readonly hotelId: string;
  readonly name: string;
  readonly description: string;
  readonly capacity: number;
  readonly pricePerNight: number;
  readonly currency: string;
  readonly images: readonly string[];
  readonly amenities: readonly string[];
  readonly isAvailable: boolean;
}

export interface HotelSearchParams {
  readonly query?: string;
  readonly latitude?: number;
  readonly longitude?: number;
  readonly radius?: number;
  readonly priceMin?: number;
  readonly priceMax?: number;
  readonly amenities?: readonly string[];
  readonly checkIn?: string;
  readonly checkOut?: string;
  readonly guests?: number;
  readonly page?: number;
  readonly limit?: number;
  readonly sortBy?: "price" | "rating" | "distance";
}
