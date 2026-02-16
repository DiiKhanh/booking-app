import { useEffect } from "react";
import { View, ActivityIndicator } from "react-native";

import { useAuth } from "@/hooks/useAuth";

export default function IndexScreen() {
  const { isAuthenticated, isLoading, checkAuth, navigateToRoleHome } =
    useAuth();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      return;
    }

    navigateToRoleHome();
  }, [isAuthenticated, isLoading, navigateToRoleHome]);

  return (
    <View className="flex-1 items-center justify-center bg-primary-500">
      <ActivityIndicator size="large" color="#FFFFFF" />
    </View>
  );
}
