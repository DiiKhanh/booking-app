export type BookingStatus =
  | "pending"
  | "awaiting_payment"
  | "processing"
  | "confirmed"
  | "failed"
  | "cancelled"
  | "completed";

export interface Booking {
  readonly id: string;
  readonly userId: string;
  readonly hotelId: string;
  readonly roomId: string;
  readonly checkIn: string;
  readonly checkOut: string;
  readonly guests: number;
  readonly totalPrice: number;
  readonly currency: string;
  readonly status: BookingStatus;
  readonly hotelName: string;
  readonly roomName: string;
  readonly hotelImage?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CreateBookingRequest {
  readonly roomId: string;
  readonly checkIn: string;
  readonly checkOut: string;
  readonly guests: number;
}

export interface BookingConflictError {
  readonly message: string;
  readonly code: 409;
  readonly suggestedRooms?: readonly string[];
}
