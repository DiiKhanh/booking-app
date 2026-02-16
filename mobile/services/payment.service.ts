import { apiClient } from "./api";
import { API } from "@/constants/api";
import type { Payment, CheckoutRequest } from "@/types";

export const paymentService = {
  async checkout(data: CheckoutRequest): Promise<Payment> {
    const response = await apiClient.post<Payment>(
      API.PAYMENTS.CHECKOUT,
      data,
    );
    return response.data;
  },

  async getStatus(paymentId: string): Promise<Payment> {
    const response = await apiClient.get<Payment>(
      API.PAYMENTS.STATUS(paymentId),
    );
    return response.data;
  },
};
