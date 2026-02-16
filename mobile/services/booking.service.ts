import { apiClient } from "./api";
import { API } from "@/constants/api";
import type { Booking, CreateBookingRequest, BookingStatus } from "@/types";

export const bookingService = {
  async create(data: CreateBookingRequest): Promise<Booking> {
    const response = await apiClient.post<Booking>(API.BOOKINGS.CREATE, data);
    return response.data;
  },

  async list(page = 1, limit = 20): Promise<readonly Booking[]> {
    const response = await apiClient.get<readonly Booking[]>(
      API.BOOKINGS.LIST,
      { params: { page, limit } },
    );
    return response.data;
  },

  async getById(id: string): Promise<Booking> {
    const response = await apiClient.get<Booking>(API.BOOKINGS.DETAIL(id));
    return response.data;
  },

  async getStatus(id: string): Promise<{ status: BookingStatus }> {
    const response = await apiClient.get<{ status: BookingStatus }>(
      API.BOOKINGS.STATUS(id),
    );
    return response.data;
  },

  async cancel(id: string): Promise<void> {
    await apiClient.delete(API.BOOKINGS.CANCEL(id));
  },
};
