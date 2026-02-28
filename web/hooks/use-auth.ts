import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth.store";
import { apiClient } from "@/services/api";
import type { UserRole } from "@/types/user.types";

export function useAuth() {
  const router = useRouter();
  const { user, tokens, isAuthenticated, isLoading, setUser, setTokens, setLoading, signOut } =
    useAuthStore();

  const login = useCallback(
    async (email: string, password: string) => {
      setLoading(true);
      try {
        const { data } = await apiClient.post<{
          data: {
            user: NonNullable<typeof user>;
            accessToken: string;
            refreshToken: string;
            expiresAt: number;
          };
        }>("/auth/login", { email, password });

        const { user: u, accessToken, refreshToken, expiresAt } = data.data;
        setUser(u);
        setTokens({ accessToken, refreshToken, expiresAt });

        if (u.role === "admin") router.push("/admin/dashboard");
        else if (u.role === "owner") router.push("/owner/dashboard");
        else router.push("/");
      } finally {
        setLoading(false);
      }
    },
    [router, setLoading, setTokens, setUser]
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
    tokens,
    isAuthenticated,
    isLoading,
    login,
    logout,
    hasRole,
  };
}
