import { useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useQuery } from "@tanstack/react-query";

import { adminService } from "@/services/admin.service";
import { useAuth } from "@/hooks/useAuth";

type StatCard = {
  label: string;
  value: string | number;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bg: string;
  onPress?: () => void;
};

function StatCard({ item, index }: { item: StatCard; index: number }) {
  return (
    <Animated.View entering={FadeInDown.delay(index * 70).duration(380)} className="w-1/2 p-1.5">
      <TouchableOpacity
        onPress={item.onPress}
        className="rounded-2xl p-4"
        style={{ backgroundColor: item.bg }}
        activeOpacity={item.onPress ? 0.7 : 1}
      >
        <View
          className="h-9 w-9 items-center justify-center rounded-xl mb-3"
          style={{ backgroundColor: item.color + "22" }}
        >
          <Ionicons name={item.icon} size={18} color={item.color} />
        </View>
        <Text className="text-2xl" style={{ fontFamily: "DMSans-Bold", color: item.color }}>
          {item.value}
        </Text>
        <Text className="text-xs mt-0.5" style={{ fontFamily: "Inter-Regular", color: "#64748B" }}>
          {item.label}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

type HealthStatus = { status?: string; redis?: string; database?: string; uptime?: number };

export default function AdminOverviewScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { userName, logout } = useAuth();

  const [refreshing, setRefreshing] = useState(false);

  const { data: health, refetch: refetchHealth } = useQuery({
    queryKey: ["admin", "health"],
    queryFn: () => adminService.getSystemHealth() as Promise<HealthStatus>,
    refetchInterval: 30000,
  });

  const { data: pendingHotels = [], refetch: refetchPending } = useQuery({
    queryKey: ["admin", "pending-hotels"],
    queryFn: () => adminService.getPendingHotels(),
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchHealth(), refetchPending()]);
    setRefreshing(false);
  };

  const healthStatus = (health as HealthStatus)?.status ?? "unknown";
  const isHealthy = healthStatus === "ok" || healthStatus === "healthy";

  const stats: StatCard[] = [
    {
      label: "Pending Approvals",
      value: pendingHotels.length,
      icon: "shield-checkmark-outline",
      color: "#F59E0B",
      bg: "#FFFBEB",
      onPress: () => router.push("/(admin)/(hotels)/"),
    },
    {
      label: "System Status",
      value: isHealthy ? "Healthy" : "Issue",
      icon: "pulse-outline",
      color: isHealthy ? "#10B981" : "#EF4444",
      bg: isHealthy ? "#F0FDF4" : "#FEF2F2",
      onPress: () => router.push("/(admin)/(system)/"),
    },
    {
      label: "Hotel Mgmt",
      value: "Manage",
      icon: "business-outline",
      color: "#3B82F6",
      bg: "#EFF6FF",
      onPress: () => router.push("/(admin)/(hotels)/"),
    },
    {
      label: "User Mgmt",
      value: "Manage",
      icon: "people-outline",
      color: "#8B5CF6",
      bg: "#F5F3FF",
      onPress: () => router.push("/(admin)/(users)/"),
    },
  ];

  return (
    <ScrollView
      className="flex-1 bg-neutral-50"
      contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: 32 }}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#FF5733" />
      }
    >
      {/* Header */}
      <View className="px-6 mb-6 flex-row items-center justify-between">
        <View>
          <Text className="text-xs uppercase tracking-wide" style={{ fontFamily: "Inter-Medium", color: "#94A3B8" }}>
            Admin Panel
          </Text>
          <Text className="text-2xl" style={{ fontFamily: "PlusJakartaSans-Bold", color: "#1A3A6B" }}>
            Overview
          </Text>
        </View>
        <TouchableOpacity
          onPress={logout}
          className="h-10 w-10 items-center justify-center rounded-full bg-neutral-100"
        >
          <Ionicons name="log-out-outline" size={20} color="#64748B" />
        </TouchableOpacity>
      </View>

      {/* System health banner */}
      <Animated.View
        entering={FadeInDown.duration(350)}
        className="mx-6 mb-5 rounded-2xl p-4 flex-row items-center gap-3"
        style={{ backgroundColor: isHealthy ? "#D1FAE5" : "#FEE2E2" }}
      >
        <View
          className="h-10 w-10 items-center justify-center rounded-full"
          style={{ backgroundColor: isHealthy ? "#10B981" + "22" : "#EF4444" + "22" }}
        >
          <Ionicons
            name={isHealthy ? "checkmark-circle" : "alert-circle"}
            size={22}
            color={isHealthy ? "#10B981" : "#EF4444"}
          />
        </View>
        <View className="flex-1">
          <Text className="text-sm" style={{ fontFamily: "PlusJakartaSans-SemiBold", color: isHealthy ? "#065F46" : "#991B1B" }}>
            {isHealthy ? "All Systems Operational" : "System Issue Detected"}
          </Text>
          <Text className="text-xs" style={{ fontFamily: "Inter-Regular", color: isHealthy ? "#047857" : "#B91C1C" }}>
            {(health as HealthStatus)?.database ? `DB: ${(health as HealthStatus).database}` : "Checking services..."}
            {(health as HealthStatus)?.redis ? ` · Redis: ${(health as HealthStatus).redis}` : ""}
          </Text>
        </View>
        <TouchableOpacity onPress={() => router.push("/(admin)/(system)/")}>
          <Ionicons name="chevron-forward" size={18} color={isHealthy ? "#10B981" : "#EF4444"} />
        </TouchableOpacity>
      </Animated.View>

      {/* Stats Grid */}
      <View className="flex-row flex-wrap px-4 mb-6">
        {stats.map((item, idx) => (
          <StatCard key={item.label} item={item} index={idx} />
        ))}
      </View>

      {/* Pending approvals */}
      {pendingHotels.length > 0 && (
        <View className="px-6 mb-6">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-sm uppercase tracking-wide" style={{ fontFamily: "Inter-Medium", color: "#94A3B8" }}>
              Pending Approvals
            </Text>
            <TouchableOpacity onPress={() => router.push("/(admin)/(hotels)/")}>
              <Text className="text-sm" style={{ fontFamily: "Inter-Medium", color: "#FF5733" }}>
                View All
              </Text>
            </TouchableOpacity>
          </View>
          {pendingHotels.slice(0, 3).map((hotel: unknown, idx: number) => {
            const h = hotel as { id?: string; name?: string; city?: string; ownerId?: string };
            return (
              <Animated.View key={h.id ?? idx} entering={FadeInDown.delay(400 + idx * 60).duration(350)}>
                <TouchableOpacity
                  onPress={() => router.push(`/(admin)/(hotels)/${h.id}`)}
                  className="bg-white rounded-2xl p-4 mb-2 flex-row items-center"
                  style={{ shadowColor: "#0F172A", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 }}
                >
                  <View
                    className="h-10 w-10 items-center justify-center rounded-xl mr-3"
                    style={{ backgroundColor: "#FEF3C7" }}
                  >
                    <Ionicons name="business-outline" size={20} color="#F59E0B" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm text-neutral-900" style={{ fontFamily: "PlusJakartaSans-SemiBold" }}>
                      {h.name ?? "Hotel"}
                    </Text>
                    <Text className="text-xs" style={{ fontFamily: "Inter-Regular", color: "#94A3B8" }}>
                      {h.city ?? "—"} · Awaiting review
                    </Text>
                  </View>
                  <View className="rounded-full px-2.5 py-1 bg-amber-50">
                    <Text className="text-xs" style={{ fontFamily: "Inter-Medium", color: "#F59E0B" }}>
                      Pending
                    </Text>
                  </View>
                </TouchableOpacity>
              </Animated.View>
            );
          })}
        </View>
      )}

      {/* Navigation shortcuts */}
      <View className="px-6">
        <Text className="text-sm uppercase tracking-wide mb-3" style={{ fontFamily: "Inter-Medium", color: "#94A3B8" }}>
          Admin Tools
        </Text>
        {[
          { label: "Hotel Approvals", sub: "Review & approve hotels", icon: "shield-checkmark-outline" as const, color: "#F59E0B", route: "/(admin)/(hotels)/" as const },
          { label: "User Management", sub: "Manage accounts & roles", icon: "people-outline" as const, color: "#3B82F6", route: "/(admin)/(users)/" as const },
          { label: "System Health", sub: "Monitor services", icon: "pulse-outline" as const, color: "#10B981", route: "/(admin)/(system)/" as const },
        ].map((item, idx) => (
          <Animated.View key={item.label} entering={FadeInDown.delay(500 + idx * 70).duration(350)}>
            <TouchableOpacity
              onPress={() => router.push(item.route)}
              className="bg-white rounded-2xl p-4 mb-2 flex-row items-center"
              style={{ shadowColor: "#0F172A", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 }}
            >
              <View
                className="h-10 w-10 items-center justify-center rounded-xl mr-3"
                style={{ backgroundColor: item.color + "15" }}
              >
                <Ionicons name={item.icon} size={20} color={item.color} />
              </View>
              <View className="flex-1">
                <Text className="text-sm text-neutral-900" style={{ fontFamily: "PlusJakartaSans-SemiBold" }}>
                  {item.label}
                </Text>
                <Text className="text-xs" style={{ fontFamily: "Inter-Regular", color: "#94A3B8" }}>
                  {item.sub}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#CBD5E1" />
            </TouchableOpacity>
          </Animated.View>
        ))}
      </View>
    </ScrollView>
  );
}
