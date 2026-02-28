import { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useQuery } from "@tanstack/react-query";

import { adminService } from "@/services/admin.service";

type ServiceStatus = {
  name: string;
  status: "ok" | "degraded" | "down" | "unknown";
  latency?: number;
  details?: string;
};

type HealthData = {
  status?: string;
  database?: string;
  redis?: string;
  uptime?: number;
  services?: Record<string, unknown>;
};

function ServiceCard({ service, index }: { service: ServiceStatus; index: number }) {
  const statusConfig = {
    ok: { label: "Operational", color: "#10B981", bg: "#D1FAE5", icon: "checkmark-circle" as const },
    degraded: { label: "Degraded", color: "#F59E0B", bg: "#FEF3C7", icon: "warning" as const },
    down: { label: "Down", color: "#EF4444", bg: "#FEE2E2", icon: "close-circle" as const },
    unknown: { label: "Unknown", color: "#94A3B8", bg: "#F1F5F9", icon: "help-circle" as const },
  };
  const config = statusConfig[service.status] ?? statusConfig.unknown;

  return (
    <Animated.View entering={FadeInDown.delay(index * 60).duration(350)}>
      <View
        className="bg-white rounded-2xl mx-6 mb-3 p-4"
        style={{ shadowColor: "#0F172A", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 }}
      >
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-3">
            <View
              className="h-10 w-10 items-center justify-center rounded-xl"
              style={{ backgroundColor: config.bg }}
            >
              <Ionicons name={config.icon} size={20} color={config.color} />
            </View>
            <View>
              <Text className="text-sm text-neutral-900" style={{ fontFamily: "Inter-Medium" }}>
                {service.name}
              </Text>
              {service.details && (
                <Text className="text-xs mt-0.5" style={{ fontFamily: "Inter-Regular", color: "#94A3B8" }}>
                  {service.details}
                </Text>
              )}
            </View>
          </View>
          <View className="items-end gap-1">
            <View className="rounded-full px-2.5 py-1" style={{ backgroundColor: config.bg }}>
              <Text className="text-xs" style={{ fontFamily: "Inter-Medium", color: config.color }}>
                {config.label}
              </Text>
            </View>
            {service.latency !== undefined && (
              <Text className="text-xs" style={{ fontFamily: "Inter-Regular", color: "#94A3B8" }}>
                {service.latency}ms
              </Text>
            )}
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

export default function SystemHealthScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  const { data, refetch } = useQuery({
    queryKey: ["admin", "health"],
    queryFn: () => adminService.getSystemHealth() as Promise<HealthData>,
    refetchInterval: 15000,
  });

  const health = data as HealthData | undefined;

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const statusStr = (s?: string): "ok" | "degraded" | "down" | "unknown" => {
    if (!s) return "unknown";
    if (s === "ok" || s === "healthy" || s === "connected") return "ok";
    if (s === "degraded" || s === "slow") return "degraded";
    if (s === "down" || s === "error" || s === "disconnected") return "down";
    return "unknown";
  };

  const services: ServiceStatus[] = [
    {
      name: "API Server",
      status: statusStr(health?.status),
      details: health?.uptime ? `Uptime: ${Math.floor((health.uptime ?? 0) / 3600)}h ${Math.floor(((health.uptime ?? 0) % 3600) / 60)}m` : undefined,
    },
    {
      name: "PostgreSQL",
      status: statusStr(health?.database),
      details: "Primary database",
    },
    {
      name: "Redis",
      status: statusStr(health?.redis),
      details: "Cache & distributed lock",
    },
  ];

  const isAllHealthy = services.every((s) => s.status === "ok");

  return (
    <View className="flex-1 bg-neutral-50">
      {/* Header */}
      <View
        className="flex-row items-center px-4 pb-3 bg-white border-b border-neutral-100"
        style={{ paddingTop: insets.top + 8 }}
      >
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#1E293B" />
        </TouchableOpacity>
        <Text className="ml-4 text-lg text-neutral-900" style={{ fontFamily: "PlusJakartaSans-SemiBold" }}>
          System Health
        </Text>
        <View className="flex-1" />
        <TouchableOpacity onPress={handleRefresh}>
          <Ionicons name="refresh-outline" size={22} color="#64748B" />
        </TouchableOpacity>
      </View>

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#FF5733" />
        }
      >
        {/* Overall status */}
        <Animated.View
          entering={FadeInDown.duration(350)}
          className="mx-6 mt-5 mb-5 rounded-2xl p-5"
          style={{ backgroundColor: isAllHealthy ? "#D1FAE5" : "#FEF3C7" }}
        >
          <View className="flex-row items-center gap-3">
            <View
              className="h-14 w-14 items-center justify-center rounded-full"
              style={{ backgroundColor: isAllHealthy ? "#10B981" + "22" : "#F59E0B" + "22" }}
            >
              <Ionicons
                name={isAllHealthy ? "checkmark-circle" : "alert-circle"}
                size={32}
                color={isAllHealthy ? "#10B981" : "#F59E0B"}
              />
            </View>
            <View>
              <Text
                className="text-lg"
                style={{ fontFamily: "PlusJakartaSans-Bold", color: isAllHealthy ? "#065F46" : "#92400E" }}
              >
                {isAllHealthy ? "All Systems Operational" : "Partial Degradation"}
              </Text>
              <Text
                className="text-sm mt-0.5"
                style={{ fontFamily: "Inter-Regular", color: isAllHealthy ? "#047857" : "#B45309" }}
              >
                {isAllHealthy
                  ? "All services running normally"
                  : "Some services may be experiencing issues"}
              </Text>
            </View>
          </View>
        </Animated.View>

        {/* Service cards */}
        <Text
          className="mx-6 mb-3 text-xs uppercase tracking-wide"
          style={{ fontFamily: "Inter-Medium", color: "#94A3B8" }}
        >
          Services
        </Text>
        {services.map((service, idx) => (
          <ServiceCard key={service.name} service={service} index={idx} />
        ))}

        {/* Raw health data */}
        {health && (
          <Animated.View
            entering={FadeInDown.delay(300).duration(380)}
            className="mx-6 mt-4 mb-8 rounded-2xl p-4 bg-neutral-800"
          >
            <Text className="text-xs uppercase tracking-wide mb-3" style={{ fontFamily: "Inter-Medium", color: "#94A3B8" }}>
              Raw Health Data
            </Text>
            <Text className="text-xs" style={{ fontFamily: "DMSans-Bold", color: "#94A3B8", lineHeight: 20 }}>
              {JSON.stringify(health, null, 2)}
            </Text>
          </Animated.View>
        )}
      </ScrollView>
    </View>
  );
}
