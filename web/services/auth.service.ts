"use client";

import { apiClient } from "./api";
import type { ApiResponse } from "@/types/api.types";
import type { User } from "@/types/user.types";

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

// fetchMe uses the access_token from the login response body for the initial call.
// Subsequent calls use the HttpOnly cookie sent automatically by the browser.
async function fetchMe(accessToken?: string): Promise<User> {
  const headers = accessToken
    ? { Authorization: `Bearer ${accessToken}` }
    : undefined;
  const res = await apiClient.get<ApiResponse<BackendUser>>("/auth/me", {
    headers,
  });
  if (!res.data.success || !res.data.data) {
    throw new Error(res.data.error ?? "Failed to fetch user profile");
  }
  return mapUser(res.data.data);
}

// setRoleCookie writes a JavaScript-readable role cookie used by Next.js middleware
// for server-side role-based routing. The JWT itself stays in an HttpOnly cookie.
function setRoleCookie(role: string) {
  if (typeof document === "undefined") return;
  document.cookie = `stayease-role=${role}; path=/; max-age=604800; SameSite=Lax`;
}

function clearRoleCookie() {
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
  // Backend sets HttpOnly access_token + refresh_token cookies.
  // Use the access_token from the body for the immediate /auth/me call.
  const user = await fetchMe(res.data.data.access_token);
  setRoleCookie(user.role);
  return { user };
}

async function register(data: RegisterRequest): Promise<AuthResult> {
  const res = await apiClient.post<ApiResponse<BackendTokens>>(
    "/auth/register",
    data,
  );
  if (!res.data.success || !res.data.data) {
    throw new Error(res.data.error ?? "Registration failed");
  }
  const user = await fetchMe(res.data.data.access_token);
  setRoleCookie(user.role);
  return { user };
}

async function logout(): Promise<void> {
  try {
    await apiClient.post("/auth/logout");
  } catch {
    // best-effort — server also clears cookies on 401
  }
  clearRoleCookie();
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
