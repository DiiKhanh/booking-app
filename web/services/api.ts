import axios, { type AxiosError } from "axios";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api/v1";

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15_000,
  withCredentials: true, // send HttpOnly auth cookies automatically
  headers: {
    "Content-Type": "application/json",
  },
});

// ── Response interceptor: handle 401 refresh ─────────────────────────
// The browser automatically sends the HttpOnly refresh_token cookie with this request.
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as typeof error.config & {
      _retry?: boolean;
    };
    if (error.response?.status === 401 && original && !original._retry) {
      original._retry = true;
      try {
        // Refresh tokens — cookies are sent/received automatically.
        await axios.post(
          `${API_BASE_URL}/auth/refresh`,
          {},
          { withCredentials: true },
        );
        // Retry the original request with the updated access_token cookie.
        return apiClient(original);
      } catch {
        // Refresh failed — redirect to login.
        if (typeof window !== "undefined") {
          window.location.href = "/login";
        }
      }
    }
    return Promise.reject(error);
  },
);
