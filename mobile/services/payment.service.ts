import { apiClient } from "./api";
import { API } from "@/constants/api";
import type { Payment, CheckoutRequest, ApiResponse } from "@/types";

export const paymentService = {
  async checkout(data: CheckoutRequest): Promise<Payment> {
    const response = await apiClient.post<ApiResponse<Payment>>(
      API.PAYMENTS.CHECKOUT,
      data,
    );
    return response.data.data!;
  },

  async getStatus(paymentId: string): Promise<Payment> {
    const response = await apiClient.get<ApiResponse<Payment>>(
      API.PAYMENTS.STATUS(paymentId),
    );
    return response.data.data!;
  },
};
