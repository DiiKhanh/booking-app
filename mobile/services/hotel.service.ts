import { apiClient } from "./api";
import { API } from "@/constants/api";
import type { Hotel, Room, HotelSearchParams, ApiResponse } from "@/types";

export const hotelService = {
  async search(
    params: HotelSearchParams,
  ): Promise<ApiResponse<readonly Hotel[]>> {
    const response = await apiClient.get(API.HOTELS.SEARCH, { params });
    return response.data;
  },

  async getById(id: string): Promise<Hotel> {
    const response = await apiClient.get<Hotel>(API.HOTELS.DETAIL(id));
    return response.data;
  },

  async getRooms(
    hotelId: string,
    checkIn?: string,
    checkOut?: string,
  ): Promise<readonly Room[]> {
    const response = await apiClient.get<readonly Room[]>(
      API.HOTELS.ROOMS(hotelId),
      { params: { start_date: checkIn, end_date: checkOut } },
    );
    return response.data;
  },
};
