import { apiClient } from "./api";
import type { ApiResponse, PaginatedResponse } from "@/types/api.types";

export interface SystemHealth {
  postgres: ServiceStatus;
  redis: ServiceStatus;
  rabbitmq: ServiceStatus;
  elasticsearch: ServiceStatus;
  api: ServiceStatus;
}

export interface ServiceStatus {
  status: "healthy" | "degraded" | "down";
  latency: number;
  uptime: number;
  details: string;
}

export interface EventLog {
  id: string;
  level: "info" | "warn" | "error" | "debug";
  service: string;
  message: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface DLQMessage {
  id: string;
  queue: string;
  routingKey: string;
  payload: string;
  error: string;
  retryCount: number;
  failedAt: string;
  originalTimestamp: string;
}

export const systemService = {
  getHealth: () =>
    apiClient
      .get<ApiResponse<SystemHealth>>("/admin/system/health")
      .then((r) => r.data),

  getLogs: (params?: {
    level?: string;
    service?: string;
    page?: number;
    limit?: number;
    search?: string;
  }) =>
    apiClient
      .get<PaginatedResponse<EventLog>>("/admin/events/logs", { params })
      .then((r) => r.data),

  getDLQ: (params?: { queue?: string; page?: number; limit?: number }) =>
    apiClient
      .get<PaginatedResponse<DLQMessage>>("/admin/events/dlq", { params })
      .then((r) => r.data),

  replayDLQMessage: (id: string) =>
    apiClient
      .post<ApiResponse<void>>(`/admin/events/dlq/${id}/replay`)
      .then((r) => r.data),

  deleteDLQMessage: (id: string) =>
    apiClient
      .delete<ApiResponse<void>>(`/admin/events/dlq/${id}`)
      .then((r) => r.data),
};
