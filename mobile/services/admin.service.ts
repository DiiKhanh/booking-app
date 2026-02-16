import { apiClient } from "./api";
import { API } from "@/constants/api";
import type { User } from "@/types";

export const adminService = {
  async getUsers(page = 1, limit = 20): Promise<readonly User[]> {
    const response = await apiClient.get<readonly User[]>(API.ADMIN.USERS, {
      params: { page, limit },
    });
    return response.data;
  },

  async updateUserRole(userId: string, role: string): Promise<void> {
    await apiClient.put(API.ADMIN.USER_ROLE(userId), { role });
  },

  async getPendingHotels(): Promise<unknown[]> {
    const response = await apiClient.get(API.ADMIN.PENDING_HOTELS);
    return response.data as unknown[];
  },

  async approveHotel(hotelId: string, approved: boolean): Promise<void> {
    await apiClient.put(API.ADMIN.APPROVE_HOTEL(hotelId), { approved });
  },

  async getSystemHealth(): Promise<unknown> {
    const response = await apiClient.get(API.ADMIN.SYSTEM_HEALTH);
    return response.data;
  },

  async getDeadLetterQueue(): Promise<unknown[]> {
    const response = await apiClient.get(API.ADMIN.EVENT_DLQ);
    return response.data as unknown[];
  },
};
