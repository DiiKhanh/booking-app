"use client";

import { apiClient } from "./api";
import type { ApiResponse } from "@/types/api.types";
import type { User, AuthTokens } from "@/types/user.types";

// Backend response shapes (Go, snake_case)
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

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  full_name: string;
  phone?: string;
}

interface AuthResult {
  user: User;
  tokens: AuthTokens;
}

function mapUser(u: BackendUser): User {
  return {
    id: u.id,
    name: u.full_name,
    email: u.email,
    role: u.role,
    phone: u.phone,
    avatar: u.avatar_url,
    createdAt: new Date().toISOString(),
  };
}

function mapTokens(t: BackendTokens): AuthTokens {
  return {
    accessToken: t.access_token,
    refreshToken: t.refresh_token,
    expiresAt: Date.now() + t.expires_in * 1000,
  };
}

async function fetchMe(accessToken: string): Promise<User> {
  const res = await apiClient.get<ApiResponse<BackendUser>>("/auth/me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.data.success || !res.data.data) {
    throw new Error(res.data.error ?? "Failed to fetch user profile");
  }
  return mapUser(res.data.data);
}

function setCookies(role: string) {
  if (typeof document === "undefined") return;
  // 7 days — matches refresh token lifetime
  document.cookie = `stayease-role=${role}; path=/; max-age=604800; SameSite=Lax`;
}

function clearCookies() {
  if (typeof document === "undefined") return;
  document.cookie = "stayease-role=; path=/; max-age=0";
}

async function login(data: LoginRequest): Promise<AuthResult> {
  const res = await apiClient.post<ApiResponse<BackendTokens>>(
    "/auth/login",
    data,
  );
  if (!res.data.success || !res.data.data) {
    throw new Error(res.data.error ?? "Invalid credentials");
  }
  const t = res.data.data;
  const user = await fetchMe(t.access_token);
  setCookies(user.role);
  return { user, tokens: mapTokens(t) };
}

async function register(data: RegisterRequest): Promise<AuthResult> {
  const res = await apiClient.post<ApiResponse<BackendTokens>>(
    "/auth/register",
    data,
  );
  if (!res.data.success || !res.data.data) {
    throw new Error(res.data.error ?? "Registration failed");
  }
  const t = res.data.data;
  const user = await fetchMe(t.access_token);
  setCookies(user.role);
  return { user, tokens: mapTokens(t) };
}

async function logout(): Promise<void> {
  try {
    await apiClient.post("/auth/logout");
  } catch {
    // best-effort
  }
  clearCookies();
}

async function getMe(): Promise<User | null> {
  try {
    const res = await apiClient.get<ApiResponse<BackendUser>>("/auth/me");
    if (!res.data.success || !res.data.data) return null;
    return mapUser(res.data.data);
  } catch {
    return null;
  }
}

export const authService = { login, register, logout, getMe };
