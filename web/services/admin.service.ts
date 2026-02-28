import { apiClient } from "./api";
import type { Hotel, HotelStatus } from "@/types/hotel.types";
import type { User, UserRole } from "@/types/user.types";
import type { ApiResponse, PaginatedResponse } from "@/types/api.types";

export const adminService = {
  // Hotel management
  getPendingHotels: (params?: { page?: number; limit?: number }) =>
    apiClient
      .get<PaginatedResponse<Hotel>>("/admin/hotels/pending", { params })
      .then((r) => r.data),

  getAllHotels: (params?: { page?: number; limit?: number; search?: string; status?: HotelStatus }) =>
    apiClient
      .get<PaginatedResponse<Hotel>>("/admin/hotels", { params })
      .then((r) => r.data),

  getHotel: (id: string) =>
    apiClient.get<ApiResponse<Hotel>>(`/admin/hotels/${id}`).then((r) => r.data),

  approveHotel: (id: string) =>
    apiClient
      .put<ApiResponse<Hotel>>(`/admin/hotels/${id}/approve`)
      .then((r) => r.data),

  rejectHotel: (id: string, reason: string) =>
    apiClient
      .put<ApiResponse<Hotel>>(`/admin/hotels/${id}/reject`, { reason })
      .then((r) => r.data),

  // User management
  getUsers: (params?: { page?: number; limit?: number; search?: string; role?: UserRole }) =>
    apiClient
      .get<PaginatedResponse<User>>("/admin/users", { params })
      .then((r) => r.data),

  getUser: (id: string) =>
    apiClient.get<ApiResponse<User>>(`/admin/users/${id}`).then((r) => r.data),

  updateUserRole: (id: string, role: UserRole) =>
    apiClient
      .put<ApiResponse<User>>(`/admin/users/${id}/role`, { role })
      .then((r) => r.data),

  banUser: (id: string) =>
    apiClient
      .put<ApiResponse<User>>(`/admin/users/${id}/ban`)
      .then((r) => r.data),

  unbanUser: (id: string) =>
    apiClient
      .put<ApiResponse<User>>(`/admin/users/${id}/unban`)
      .then((r) => r.data),
};
