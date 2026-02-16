import { useAuthStore } from "@/stores/auth.store";
import type { UserRole } from "@/types";

export function useRole(): UserRole | null {
  return useAuthStore((state) => state.user?.role ?? null);
}

export function useIsRole(role: UserRole): boolean {
  const currentRole = useRole();
  return currentRole === role;
}
