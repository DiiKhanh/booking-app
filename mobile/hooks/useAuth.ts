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
  const { user, isAuthenticated, isLoading } =
    useAuthStore();
  const setUser = useAuthStore((s) => s.setUser);
  const clearUser = useAuthStore((s) => s.clearUser);

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

  const logout = useCallback(async () => {
    await authService.logout();
    clearUser();
    queryClient.clear();
    router.replace("/(auth)/login");
  }, [clearUser, queryClient, router]);

  const errorMessage = loginMutation.error
    ? normalizeError(loginMutation.error).message
    : registerMutation.error
      ? normalizeError(registerMutation.error).message
      : null;

  return {
    user,
    role: (user?.role ?? null) as UserRole | null,
    userName: user?.name ?? "",
    isAuthenticated,
    isLoading,

    login: loginMutation.mutate,
    register: registerMutation.mutate,
    logout,

    loginPending: loginMutation.isPending,
    registerPending: registerMutation.isPending,
    errorMessage,
  };
}
