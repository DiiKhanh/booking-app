import { apiClient, storeTokens, clearTokens } from "./api";
import { API } from "@/constants/api";
import type { User, LoginRequest, RegisterRequest, AuthTokens } from "@/types";

// Backend response shapes (Go uses snake_case)
interface BackendTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

interface BackendUser {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  avatar_url?: string;
  role: "guest" | "owner" | "admin";
  is_active: boolean;
}

interface BackendEnvelope<T> {
  success: boolean;
  data: T | null;
  error: string | null;
}

interface AuthResponse {
  user: User;
  tokens: AuthTokens;
}

function mapUser(u: BackendUser): User {
  return {
    id: u.id,
    email: u.email,
    name: u.full_name,
    phone: u.phone,
    avatar: u.avatar_url,
    role: u.role,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

async function fetchMe(accessToken: string): Promise<User> {
  const res = await apiClient.get<BackendEnvelope<BackendUser>>(API.AUTH.ME, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.data.success || !res.data.data) {
    throw new Error(res.data.error ?? "Failed to fetch user profile");
  }
  return mapUser(res.data.data);
}

export const authService = {
  async login(data: LoginRequest): Promise<AuthResponse> {
    const res = await apiClient.post<BackendEnvelope<BackendTokens>>(
      API.AUTH.LOGIN,
      data,
    );
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.error ?? "Login failed");
    }
    const t = res.data.data;
    await storeTokens(t.access_token, t.refresh_token);
    const user = await fetchMe(t.access_token);
    return {
      user,
      tokens: { accessToken: t.access_token, refreshToken: t.refresh_token },
    };
  },

  async register(data: RegisterRequest): Promise<AuthResponse> {
    // Backend expects full_name, not name; ignores role (always creates as guest)
    const payload = {
      email: data.email,
      password: data.password,
      full_name: data.name,
      phone: data.phone ?? "",
    };
    const res = await apiClient.post<BackendEnvelope<BackendTokens>>(
      API.AUTH.REGISTER,
      payload,
    );
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.error ?? "Registration failed");
    }
    const t = res.data.data;
    await storeTokens(t.access_token, t.refresh_token);
    const user = await fetchMe(t.access_token);
    return {
      user,
      tokens: { accessToken: t.access_token, refreshToken: t.refresh_token },
    };
  },

  async getMe(): Promise<User> {
    const res = await apiClient.get<BackendEnvelope<BackendUser>>(API.AUTH.ME);
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.error ?? "Failed to fetch user profile");
    }
    return mapUser(res.data.data);
  },

  async logout(): Promise<void> {
    try {
      await apiClient.post(API.AUTH.LOGOUT ?? "/auth/logout");
    } catch {
      // best-effort — always clear tokens
    }
    await clearTokens();
  },
};
