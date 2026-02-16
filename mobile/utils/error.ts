import type { ApiError } from "@/types/api.types";
import { AxiosError } from "axios";

export function normalizeError(error: unknown): ApiError {
  if (error instanceof AxiosError) {
    const data = error.response?.data as
      | { error?: string; message?: string; details?: Record<string, string[]> }
      | undefined;
    return {
      message: data?.error ?? data?.message ?? "Something went wrong",
      code: error.response?.status ?? 500,
      details: data?.details,
    };
  }

  if (error instanceof Error) {
    return {
      message: error.message,
      code: 500,
    };
  }

  return {
    message: "An unexpected error occurred",
    code: 500,
  };
}

export function isConflictError(error: unknown): boolean {
  if (error instanceof AxiosError) {
    return error.response?.status === 409;
  }
  return false;
}

export function isUnauthorizedError(error: unknown): boolean {
  if (error instanceof AxiosError) {
    return error.response?.status === 401;
  }
  return false;
}
