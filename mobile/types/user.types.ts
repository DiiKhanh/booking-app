export type UserRole = "guest" | "owner" | "admin";

export interface User {
  readonly id: string;
  readonly email: string;
  readonly name: string;
  readonly phone?: string;
  readonly avatar?: string;
  readonly role: UserRole;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface AuthTokens {
  readonly accessToken: string;
  readonly refreshToken: string;
}

export interface LoginRequest {
  readonly email: string;
  readonly password: string;
}

export interface RegisterRequest {
  readonly email: string;
  readonly password: string;
  readonly name: string;
  readonly phone?: string;
  readonly role: UserRole;
}
