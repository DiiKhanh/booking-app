import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown, FadeInRight } from "react-native-reanimated";

import { useBookingsList } from "@/hooks/useBookings";
import { formatCurrency } from "@/utils/format";

function BarChart({ data }: { data: { label: string; value: number; max: number }[] }) {
  return (
    <View className="flex-row items-end gap-2 h-32">
      {data.map((item, idx) => {
        const heightPct = item.max > 0 ? (item.value / item.max) * 100 : 0;
        return (
          <View key={item.label} className="flex-1 items-center">
            <Animated.View
              entering={FadeInRight.delay(idx * 80).duration(400)}
              className="w-full rounded-t-lg"
              style={{
                height: `${Math.max(heightPct, 4)}%`,
                backgroundColor: idx === data.length - 1 ? "#FF5733" : "#1A3A6B",
                opacity: idx === data.length - 1 ? 1 : 0.4 + (idx / data.length) * 0.4,
              }}
            />
            <Text
              className="text-xs mt-1"
              style={{ fontFamily: "Inter-Regular", color: "#94A3B8" }}
            >
              {item.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

function MetricCard({
  label,
  value,
  sub,
  icon,
  color,
  index,
}: {
  label: string;
  value: string;
  sub: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  index: number;
}) {
  return (
    <Animated.View
      entering={FadeInDown.delay(index * 80).duration(380)}
      className="flex-1 rounded-2xl bg-white p-4 m-1"
      style={{
        shadowColor: "#0F172A",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
        elevation: 1,
      }}
    >
      <Ionicons name={icon} size={20} color={color} />
      <Text className="text-xl mt-2" style={{ fontFamily: "DMSans-Bold", color: "#1E293B" }}>
        {value}
      </Text>
      <Text className="text-xs" style={{ fontFamily: "Inter-Regular", color: "#64748B" }}>
        {label}
      </Text>
      <Text className="text-xs mt-1" style={{ fontFamily: "Inter-Regular", color }}>
        {sub}
      </Text>
    </Animated.View>
  );
}

export default function AnalyticsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data: bookings = [] } = useBookingsList();

  const confirmed = bookings.filter((b) => b.status === "confirmed");
  const cancelled = bookings.filter((b) => b.status === "cancelled" || b.status === "failed");
  const totalRevenue = confirmed.reduce((s, b) => s + (b.totalPrice ?? 0), 0);
  const avgBookingValue = confirmed.length > 0 ? totalRevenue / confirmed.length : 0;
  const conversionRate = bookings.length > 0
    ? Math.round((confirmed.length / bookings.length) * 100)
    : 0;

  const months = ["Aug", "Sep", "Oct", "Nov", "Dec", "Jan"];
  const mockValues = [12, 19, 8, 24, 17, confirmed.length || 22];
  const maxVal = Math.max(...mockValues, 1);
  const chartData = months.map((label, i) => ({ label, value: mockValues[i], max: maxVal }));

  const metrics = [
    {
      label: "Total Revenue",
      value: formatCurrency(totalRevenue, "USD"),
      sub: `${confirmed.length} confirmed`,
      icon: "cash-outline" as const,
      color: "#10B981",
    },
    {
      label: "Avg. Booking",
      value: formatCurrency(avgBookingValue, "USD"),
      sub: "per confirmed stay",
      icon: "trending-up-outline" as const,
      color: "#3B82F6",
    },
    {
      label: "Conversion",
      value: `${conversionRate}%`,
      sub: "bookings confirmed",
      icon: "checkmark-done-outline" as const,
      color: "#8B5CF6",
    },
    {
      label: "Cancellations",
      value: String(cancelled.length),
      sub: "total cancelled",
      icon: "close-circle-outline" as const,
      color: "#EF4444",
    },
  ];

  return (
    <View className="flex-1 bg-neutral-50">
      <View
        className="flex-row items-center px-4 pb-3 bg-white border-b border-neutral-100"
        style={{ paddingTop: insets.top + 8 }}
      >
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#1E293B" />
        </TouchableOpacity>
        <Text className="ml-4 text-lg text-neutral-900" style={{ fontFamily: "PlusJakartaSans-SemiBold" }}>
          Analytics
        </Text>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Revenue Chart */}
        <Animated.View
          entering={FadeInDown.duration(400)}
          className="bg-white rounded-2xl p-5 mb-4"
          style={{ shadowColor: "#0F172A", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 1 }}
        >
          <Text className="text-sm uppercase tracking-wide mb-4" style={{ fontFamily: "Inter-Medium", color: "#94A3B8" }}>
            Bookings — Last 6 Months
          </Text>
          <BarChart data={chartData} />
        </Animated.View>

        {/* Metric Cards */}
        <View className="flex-row flex-wrap -m-1">
          {metrics.map((m, idx) => (
            <View key={m.label} className="w-1/2">
              <MetricCard {...m} index={idx} />
            </View>
          ))}
        </View>

        {/* Status Breakdown */}
        <Animated.View
          entering={FadeInDown.delay(300).duration(400)}
          className="mt-4 bg-white rounded-2xl p-5"
          style={{ shadowColor: "#0F172A", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 }}
        >
          <Text className="text-sm uppercase tracking-wide mb-4" style={{ fontFamily: "Inter-Medium", color: "#94A3B8" }}>
            Booking Status Breakdown
          </Text>
          {[
            { label: "Confirmed", count: confirmed.length, color: "#10B981" },
            { label: "Pending", count: bookings.filter((b) => b.status === "pending").length, color: "#F59E0B" },
            { label: "Processing", count: bookings.filter((b) => b.status === "processing").length, color: "#3B82F6" },
            { label: "Cancelled / Failed", count: cancelled.length, color: "#EF4444" },
          ].map((item) => {
            const pct = bookings.length > 0 ? (item.count / bookings.length) * 100 : 0;
            return (
              <View key={item.label} className="mb-3">
                <View className="flex-row items-center justify-between mb-1">
                  <Text className="text-sm" style={{ fontFamily: "Inter-Regular", color: "#64748B" }}>
                    {item.label}
                  </Text>
                  <Text className="text-sm" style={{ fontFamily: "Inter-Medium", color: "#334155" }}>
                    {item.count} ({Math.round(pct)}%)
                  </Text>
                </View>
                <View className="h-2 rounded-full bg-neutral-100 overflow-hidden">
                  <View
                    className="h-2 rounded-full"
                    style={{ width: `${pct}%`, backgroundColor: item.color }}
                  />
                </View>
              </View>
            );
          })}
        </Animated.View>
      </ScrollView>
    </View>
  );
}
