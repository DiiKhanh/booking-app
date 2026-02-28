import { useAuthStore } from "@/stores/auth.store";
import type { UserRole } from "@/types/user.types";

export function useRole() {
  const user = useAuthStore((s) => s.user);

  const isOwner = user?.role === "owner";
  const isAdmin = user?.role === "admin";
  const isGuest = user?.role === "guest";

  const hasRole = (role: UserRole) => user?.role === role;
  const hasAnyRole = (...roles: UserRole[]) =>
    roles.some((r) => user?.role === r);

  return { user, isOwner, isAdmin, isGuest, hasRole, hasAnyRole };
}
