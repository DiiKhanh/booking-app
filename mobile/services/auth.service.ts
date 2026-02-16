import { apiClient, storeTokens, clearTokens } from "./api";
import { API } from "@/constants/api";
import type { User, LoginRequest, RegisterRequest, AuthTokens } from "@/types";

interface AuthResponse {
  user: User;
  tokens: AuthTokens;
}

export const authService = {
  async login(data: LoginRequest): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>(API.AUTH.LOGIN, data);
    await storeTokens(
      response.data.tokens.accessToken,
      response.data.tokens.refreshToken,
    );
    return response.data;
  },

  async register(data: RegisterRequest): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>(
      API.AUTH.REGISTER,
      data,
    );
    await storeTokens(
      response.data.tokens.accessToken,
      response.data.tokens.refreshToken,
    );
    return response.data;
  },

  async getMe(): Promise<User> {
    const response = await apiClient.get<User>(API.AUTH.ME);
    return response.data;
  },

  async logout(): Promise<void> {
    await clearTokens();
  },
};
