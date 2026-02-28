import { apiClient } from "./api";
import type {
  Hotel,
  Room,
  InventoryDay,
  CreateHotelDto,
  UpdateHotelDto,
  CreateRoomDto,
  UpdateRoomDto,
  UpdateInventoryDto,
} from "@/types/hotel.types";
import type { ApiResponse, PaginatedResponse } from "@/types/api.types";

// ── Owner Hotel APIs ─────────────────────────────────────────────────────────

export const hotelService = {
  // Hotels
  getMyHotels: (params?: { page?: number; limit?: number; search?: string }) =>
    apiClient
      .get<PaginatedResponse<Hotel>>("/owner/hotels", { params })
      .then((r) => r.data),

  getHotel: (id: string) =>
    apiClient.get<ApiResponse<Hotel>>(`/owner/hotels/${id}`).then((r) => r.data),

  createHotel: (dto: CreateHotelDto) =>
    apiClient.post<ApiResponse<Hotel>>("/owner/hotels", dto).then((r) => r.data),

  updateHotel: (id: string, dto: UpdateHotelDto) =>
    apiClient
      .put<ApiResponse<Hotel>>(`/owner/hotels/${id}`, dto)
      .then((r) => r.data),

  deleteHotel: (id: string) =>
    apiClient
      .delete<ApiResponse<null>>(`/owner/hotels/${id}`)
      .then((r) => r.data),

  uploadHotelPhoto: (id: string, file: File) => {
    const form = new FormData();
    form.append("photo", file);
    return apiClient
      .post<ApiResponse<{ url: string }>>(`/owner/hotels/${id}/photos`, form, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      .then((r) => r.data);
  },

  // Rooms
  getRooms: (hotelId: string) =>
    apiClient
      .get<ApiResponse<Room[]>>(`/owner/hotels/${hotelId}/rooms`)
      .then((r) => r.data),

  getRoom: (roomId: string) =>
    apiClient
      .get<ApiResponse<Room>>(`/owner/rooms/${roomId}`)
      .then((r) => r.data),

  createRoom: (hotelId: string, dto: CreateRoomDto) =>
    apiClient
      .post<ApiResponse<Room>>(`/owner/hotels/${hotelId}/rooms`, dto)
      .then((r) => r.data),

  updateRoom: (roomId: string, dto: UpdateRoomDto) =>
    apiClient
      .put<ApiResponse<Room>>(`/owner/rooms/${roomId}`, dto)
      .then((r) => r.data),

  deleteRoom: (roomId: string) =>
    apiClient
      .delete<ApiResponse<null>>(`/owner/rooms/${roomId}`)
      .then((r) => r.data),

  // Inventory
  getInventory: (roomId: string, from: string, to: string) =>
    apiClient
      .get<ApiResponse<InventoryDay[]>>(`/owner/rooms/${roomId}/inventory`, {
        params: { from, to },
      })
      .then((r) => r.data),

  updateInventory: (roomId: string, dto: UpdateInventoryDto) =>
    apiClient
      .put<ApiResponse<InventoryDay>>(`/owner/rooms/${roomId}/inventory`, dto)
      .then((r) => r.data),

  bulkUpdateInventory: (roomId: string, updates: UpdateInventoryDto[]) =>
    apiClient
      .put<ApiResponse<InventoryDay[]>>(
        `/owner/rooms/${roomId}/inventory/bulk`,
        { updates }
      )
      .then((r) => r.data),
};
