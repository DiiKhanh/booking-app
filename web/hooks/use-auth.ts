import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth.store";
import { apiClient } from "@/services/api";
import type { UserRole } from "@/types/user.types";

export function useAuth() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, setUser, setLoading, signOut } =
    useAuthStore();

  const login = useCallback(
    async (email: string, password: string) => {
      setLoading(true);
      try {
        const { data } = await apiClient.post<{
          data: { user: NonNullable<typeof user> };
        }>("/auth/login", { email, password });

        const { user: u } = data.data;
        setUser(u);

        if (u.role === "admin") router.push("/admin/dashboard");
        else if (u.role === "owner") router.push("/owner/dashboard");
        else router.push("/");
      } finally {
        setLoading(false);
      }
    },
    [router, setLoading, setUser]
  );

  const logout = useCallback(() => {
    signOut();
    router.push("/login");
  }, [router, signOut]);

  const hasRole = useCallback(
    (role: UserRole) => user?.role === role,
    [user]
  );

  return {
    user,
    isAuthenticated,
    isLoading,
    login,
    logout,
    hasRole,
  };
}
