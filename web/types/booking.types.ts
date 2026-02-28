export type BookingStatus =
  | "pending"
  | "confirmed"
  | "checked_in"
  | "checked_out"
  | "cancelled"
  | "disputed";

export interface Guest {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatar?: string;
}

export interface Booking {
  id: string;
  roomId: string;
  hotelId: string;
  hotelName: string;
  roomName: string;
  guest: Guest;
  checkIn: string;
  checkOut: string;
  nights: number;
  guests: number;
  totalAmount: number;
  status: BookingStatus;
  specialRequests?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BookingFilters {
  status?: BookingStatus;
  hotelId?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  page?: number;
  limit?: number;
}
