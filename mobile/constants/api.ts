const API_BASE_URL = `${process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:8080"}/api/v1`;
const WS_BASE_URL = process.env.EXPO_PUBLIC_WS_URL ?? "ws://localhost:8080";

export const API = {
  BASE_URL: API_BASE_URL,
  WS_URL: WS_BASE_URL,

  AUTH: {
    LOGIN: "/auth/login",
    REGISTER: "/auth/register",
    REFRESH: "/auth/refresh",
    ME: "/auth/me",
    LOGOUT: "/auth/logout",
  },

  HOTELS: {
    SEARCH: "/hotels/search",
    DETAIL: (id: string) => `/hotels/${id}`,
    ROOMS: (id: string) => `/hotels/${id}/rooms`,
  },

  BOOKINGS: {
    CREATE: "/bookings",
    LIST: "/bookings",
    DETAIL: (id: string) => `/bookings/${id}`,
    STATUS: (id: string) => `/bookings/${id}/status`,
    CANCEL: (id: string) => `/bookings/${id}`,
  },

  PAYMENTS: {
    CHECKOUT: "/checkout",
    STATUS: (id: string) => `/payments/${id}`,
  },

  OWNER: {
    HOTELS: "/owner/hotels",
    HOTEL_DETAIL: (id: string) => `/owner/hotels/${id}`,
    ROOMS: (hotelId: string) => `/owner/hotels/${hotelId}/rooms`,
    ROOM_INVENTORY: (roomId: string) => `/owner/rooms/${roomId}/inventory`,
    RESERVATIONS: "/owner/reservations",
  },

  ADMIN: {
    USERS: "/admin/users",
    USER_ROLE: (id: string) => `/admin/users/${id}/role`,
    PENDING_HOTELS: "/admin/hotels/pending",
    APPROVE_HOTEL: (id: string) => `/admin/hotels/${id}/approve`,
    SYSTEM_HEALTH: "/admin/system/health",
    EVENT_DLQ: "/admin/events/dlq",
  },

  WS: {
    BOOKINGS: "/ws/bookings",
    NOTIFICATIONS: "/ws/notifications",
  },
} as const;
