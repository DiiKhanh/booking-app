export type PaymentStatus =
  | "pending"
  | "processing"
  | "succeeded"
  | "failed"
  | "refunded";

export interface Payment {
  readonly id: string;
  readonly bookingId: string;
  readonly amount: number;
  readonly currency: string;
  readonly status: PaymentStatus;
  readonly method: string;
  readonly createdAt: string;
}

export interface CheckoutRequest {
  readonly bookingId: string;
  readonly paymentMethod: string;
}
