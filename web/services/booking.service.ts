import { apiClient } from "./api";
import type { Booking, BookingFilters } from "@/types/booking.types";
import type { ApiResponse, PaginatedResponse } from "@/types/api.types";

export const bookingService = {
  getReservations: (filters?: BookingFilters) =>
    apiClient
      .get<PaginatedResponse<Booking>>("/owner/reservations", {
        params: filters,
      })
      .then((r) => r.data),

  getReservation: (id: string) =>
    apiClient
      .get<ApiResponse<Booking>>(`/owner/reservations/${id}`)
      .then((r) => r.data),

  updateStatus: (id: string, status: string) =>
    apiClient
      .put<ApiResponse<Booking>>(`/owner/reservations/${id}/status`, { status })
      .then((r) => r.data),

  // Admin
  getAllBookings: (filters?: BookingFilters) =>
    apiClient
      .get<PaginatedResponse<Booking>>("/admin/bookings", { params: filters })
      .then((r) => r.data),

  getBooking: (id: string) =>
    apiClient
      .get<ApiResponse<Booking>>(`/admin/bookings/${id}`)
      .then((r) => r.data),
};
