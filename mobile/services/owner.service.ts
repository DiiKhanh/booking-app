import { apiClient } from "./api";
import { API } from "@/constants/api";
import type { Hotel, ApiResponse } from "@/types";

export interface CreateHotelInput {
  readonly name: string;
  readonly description: string;
  readonly address: string;
  readonly city: string;
  readonly country: string;
  readonly latitude: number;
  readonly longitude: number;
  readonly starRating: number;
  readonly amenities: readonly string[];
}

export interface UpdateHotelInput extends Partial<CreateHotelInput> {}

export const ownerService = {
  async getMyHotels(): Promise<readonly Hotel[]> {
    const response = await apiClient.get<ApiResponse<readonly Hotel[]>>(API.OWNER.HOTELS);
    return response.data.data ?? [];
  },

  async createHotel(input: CreateHotelInput): Promise<Hotel> {
    const response = await apiClient.post<ApiResponse<Hotel>>(API.OWNER.HOTELS, {
      name: input.name,
      description: input.description,
      address: input.address,
      city: input.city,
      country: input.country,
      latitude: input.latitude,
      longitude: input.longitude,
      star_rating: input.starRating,
      amenities: input.amenities,
    });
    return response.data.data!;
  },

  async updateHotel(id: string, input: UpdateHotelInput): Promise<Hotel> {
    const body: Record<string, unknown> = {};
    if (input.name !== undefined) body.name = input.name;
    if (input.description !== undefined) body.description = input.description;
    if (input.address !== undefined) body.address = input.address;
    if (input.city !== undefined) body.city = input.city;
    if (input.country !== undefined) body.country = input.country;
    if (input.latitude !== undefined) body.latitude = input.latitude;
    if (input.longitude !== undefined) body.longitude = input.longitude;
    if (input.starRating !== undefined) body.star_rating = input.starRating;
    if (input.amenities !== undefined) body.amenities = input.amenities;

    const response = await apiClient.put<ApiResponse<Hotel>>(API.OWNER.HOTEL_DETAIL(id), body);
    return response.data.data!;
  },

  async deleteHotel(id: string): Promise<void> {
    await apiClient.delete(API.OWNER.HOTEL_DETAIL(id));
  },
};
