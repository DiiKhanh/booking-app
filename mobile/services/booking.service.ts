import { apiClient } from "./api";
import { API } from "@/constants/api";
import type { Booking, CreateBookingRequest, BookingStatus, ApiResponse } from "@/types";

export const bookingService = {
  async create(data: CreateBookingRequest): Promise<Booking> {
    const response = await apiClient.post<ApiResponse<Booking>>(API.BOOKINGS.CREATE, data);
    return response.data.data!;
  },

  async list(page = 1, limit = 20): Promise<readonly Booking[]> {
    const response = await apiClient.get<ApiResponse<readonly Booking[]>>(
      API.BOOKINGS.LIST,
      { params: { page, limit } },
    );
    return response.data.data ?? [];
  },

  async getById(id: string): Promise<Booking> {
    const response = await apiClient.get<ApiResponse<Booking>>(API.BOOKINGS.DETAIL(id));
    return response.data.data!;
  },

  async getStatus(id: string): Promise<{ status: BookingStatus }> {
    const response = await apiClient.get<ApiResponse<{ status: BookingStatus }>>(
      API.BOOKINGS.STATUS(id),
    );
    return response.data.data!;
  },

  async cancel(id: string): Promise<void> {
    await apiClient.delete(API.BOOKINGS.CANCEL(id));
  },
};
