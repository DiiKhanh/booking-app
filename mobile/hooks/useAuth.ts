import { useCallback } from "react";
import { useRouter } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useAuthStore } from "@/stores/auth.store";
import { authService } from "@/services/auth.service";
import { normalizeError } from "@/utils/error";
import type { LoginRequest, RegisterRequest, UserRole } from "@/types";

function navigateByRole(
  router: ReturnType<typeof useRouter>,
  role: string,
) {
  switch (role) {
    case "owner":
      router.replace("/(owner)/(dashboard)/");
      break;
    case "admin":
      router.replace("/(admin)/(overview)/");
      break;
    default:
      router.replace("/(guest)/(home)/");
      break;
  }
}

export function useAuth() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, isAuthenticated, isLoading, setUser, clearUser } =
    useAuthStore();

  const loginMutation = useMutation({
    mutationFn: (data: LoginRequest) => authService.login(data),
    onSuccess: (data) => {
      setUser(data.user);
      navigateByRole(router, data.user.role);
    },
  });

  const registerMutation = useMutation({
    mutationFn: (data: RegisterRequest) => authService.register(data),
    onSuccess: (data) => {
      setUser(data.user);
      router.replace("/(auth)/onboarding");
    },
  });

  const checkAuth = useCallback(async () => {
    try {
      const me = await authService.getMe();
      setUser(me);
    } catch {
      clearUser();
    }
  }, [setUser, clearUser]);

  const logout = useCallback(async () => {
    await authService.logout();
    clearUser();
    queryClient.clear();
    router.replace("/(auth)/login");
  }, [clearUser, queryClient, router]);

  const navigateToRoleHome = useCallback(() => {
    const role = useAuthStore.getState().user?.role;
    if (role) {
      navigateByRole(router, role);
    }
  }, [router]);

  const errorMessage = loginMutation.error
    ? normalizeError(loginMutation.error).message
    : registerMutation.error
      ? normalizeError(registerMutation.error).message
      : null;

  return {
    user,
    role: user?.role ?? null as UserRole | null,
    userName: user?.name ?? "",
    isAuthenticated,
    isLoading,

    login: loginMutation.mutate,
    register: registerMutation.mutate,
    checkAuth,
    logout,
    navigateToRoleHome,

    loginPending: loginMutation.isPending,
    registerPending: registerMutation.isPending,
    errorMessage,
  };
}
