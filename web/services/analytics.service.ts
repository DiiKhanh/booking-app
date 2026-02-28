import { apiClient } from "./api";
import type { OwnerAnalytics, AdminAnalytics } from "@/types/analytics.types";
import type { ApiResponse } from "@/types/api.types";

export const analyticsService = {
  getOwnerAnalytics: (period: "week" | "month" | "year" = "month") =>
    apiClient
      .get<ApiResponse<OwnerAnalytics>>("/owner/analytics", {
        params: { period },
      })
      .then((r) => r.data),

  getAdminAnalytics: () =>
    apiClient
      .get<ApiResponse<AdminAnalytics>>("/admin/analytics")
      .then((r) => r.data),

  getAdminDashboard: () =>
    apiClient
      .get<ApiResponse<AdminAnalytics>>("/admin/dashboard")
      .then((r) => r.data),
};
