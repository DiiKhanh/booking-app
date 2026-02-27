import axios, { type InternalAxiosRequestConfig, type AxiosError } from "axios";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api/v1";

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15_000,
  headers: {
    "Content-Type": "application/json",
  },
});

// ── Request interceptor: attach Bearer token ─────────────────────────
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (typeof window !== "undefined") {
      const raw = localStorage.getItem("stayease-auth");
      if (raw) {
        try {
          const { state } = JSON.parse(raw) as {
            state: { tokens?: { accessToken?: string } };
          };
          const token = state?.tokens?.accessToken;
          if (token) {
            config.headers.Authorization = `Bearer ${token}`;
          }
        } catch {
          // ignore parse errors
        }
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response interceptor: handle 401 refresh ─────────────────────────
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const raw = localStorage.getItem("stayease-auth");
        if (raw) {
          const { state } = JSON.parse(raw) as {
            state: { tokens?: { refreshToken?: string } };
          };
          const refreshToken = state?.tokens?.refreshToken;
          if (refreshToken) {
            const { data } = await axios.post(`${API_BASE_URL}/auth/refresh`, {
              refreshToken,
            });
            const newToken = data?.data?.accessToken;
            if (newToken && original.headers) {
              original.headers.Authorization = `Bearer ${newToken}`;
            }
            return apiClient(original);
          }
        }
      } catch {
        // refresh failed — sign out
        if (typeof window !== "undefined") {
          localStorage.removeItem("stayease-auth");
          window.location.href = "/login";
        }
      }
    }
    return Promise.reject(error);
  }
);
