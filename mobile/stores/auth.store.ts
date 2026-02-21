import { create } from "zustand";
import type { User, UserRole } from "@/types";

interface AuthState {
  readonly user: User | null;
  readonly isAuthenticated: boolean;
  readonly isLoading: boolean;
}

interface AuthActions {
  setUser: (user: User) => void;
  clearUser: () => void;
  setLoading: (loading: boolean) => void;
}

type AuthStore = AuthState & AuthActions;

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
};

export const useAuthStore = create<AuthStore>()((set) => ({
  ...initialState,

  setUser: (user) => set({ user, isAuthenticated: true, isLoading: false }),

  clearUser: () => set({ ...initialState, isLoading: false }),

  setLoading: (isLoading) => set({ isLoading }),
}));

export function useUserRole(): UserRole | null {
  return useAuthStore((state) => state.user?.role ?? null);
}
