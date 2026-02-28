import { useState } from "react";
import { View, Text, FlatList, TouchableOpacity, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";

import { useBookingsList } from "@/hooks/useBookings";
import { formatCurrency, formatDateRange } from "@/utils/format";
import type { Booking } from "@/types";

type FilterKey = "all" | "pending" | "confirmed" | "cancelled";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "confirmed", label: "Confirmed" },
  { key: "cancelled", label: "Cancelled" },
];

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: keyof typeof Ionicons.glyphMap }> = {
  confirmed: { label: "Confirmed", color: "#10B981", bg: "#D1FAE5", icon: "checkmark-circle-outline" },
  pending: { label: "Pending", color: "#F59E0B", bg: "#FEF3C7", icon: "time-outline" },
  awaiting_payment: { label: "Awaiting Payment", color: "#3B82F6", bg: "#DBEAFE", icon: "card-outline" },
  processing: { label: "Processing", color: "#8B5CF6", bg: "#EDE9FE", icon: "reload-outline" },
  cancelled: { label: "Cancelled", color: "#EF4444", bg: "#FEE2E2", icon: "close-circle-outline" },
  failed: { label: "Failed", color: "#EF4444", bg: "#FEE2E2", icon: "alert-circle-outline" },
};

function BookingCard({ booking, index }: { booking: Booking; index: number }) {
  const router = useRouter();
  const config = STATUS_CONFIG[booking.status ?? "pending"] ?? STATUS_CONFIG.pending;

  return (
    <Animated.View entering={FadeInDown.delay(index * 60).duration(350)}>
      <TouchableOpacity
        onPress={() => router.push(`/(owner)/(reservations)/${booking.id}`)}
        className="bg-white rounded-2xl mx-6 mb-3 p-4"
        style={{
          shadowColor: "#0F172A",
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.04,
          shadowRadius: 6,
          elevation: 1,
        }}
        activeOpacity={0.8}
      >
        {/* Top row */}
        <View className="flex-row items-start justify-between mb-3">
          <View className="flex-1 mr-3">
            <Text
              className="text-sm text-neutral-900"
              style={{ fontFamily: "PlusJakartaSans-SemiBold" }}
              numberOfLines={1}
            >
              Booking #{booking.id.slice(-8).toUpperCase()}
            </Text>
            <Text
              className="text-xs mt-0.5"
              style={{ fontFamily: "Inter-Regular", color: "#94A3B8" }}
            >
              Guest · {booking.guests ?? 1} {(booking.guests ?? 1) > 1 ? "guests" : "guest"}
            </Text>
          </View>
          <View className="rounded-full px-2.5 py-1" style={{ backgroundColor: config.bg }}>
            <Text className="text-xs" style={{ fontFamily: "Inter-Medium", color: config.color }}>
              {config.label}
            </Text>
          </View>
        </View>

        {/* Dates row */}
        <View className="flex-row items-center gap-4 mb-3">
          <View className="flex-row items-center gap-1.5">
            <Ionicons name="calendar-outline" size={14} color="#94A3B8" />
            <Text className="text-sm" style={{ fontFamily: "Inter-Medium", color: "#334155" }}>
              {formatDateRange(booking.checkIn, booking.checkOut)}
            </Text>
          </View>
        </View>

        {/* Bottom row */}
        <View className="flex-row items-center justify-between pt-3 border-t border-neutral-50">
          <View className="flex-row items-center gap-1">
            <Ionicons name={config.icon} size={14} color={config.color} />
            <Text className="text-xs" style={{ fontFamily: "Inter-Regular", color: config.color }}>
              {config.label}
            </Text>
          </View>
          <Text className="text-base" style={{ fontFamily: "DMSans-Bold", color: "#FF5733" }}>
            {formatCurrency(booking.totalPrice ?? 0, "USD")}
          </Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function ReservationsScreen() {
  const insets = useSafeAreaInsets();
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");

  const { data: bookings = [], isLoading, refetch, isRefetching } = useBookingsList();

  const filtered = activeFilter === "all"
    ? bookings
    : bookings.filter((b) => {
        if (activeFilter === "cancelled") return b.status === "cancelled" || b.status === "failed";
        return b.status === activeFilter || b.status === `awaiting_${activeFilter}`;
      });

  return (
    <View className="flex-1 bg-neutral-50">
      {/* Header */}
      <View
        className="bg-white border-b border-neutral-100 pb-3"
        style={{ paddingTop: insets.top + 16 }}
      >
        <View className="px-6 mb-4">
          <Text className="text-xs uppercase tracking-wide" style={{ fontFamily: "Inter-Medium", color: "#94A3B8" }}>
            Reservations
          </Text>
          <Text className="text-2xl" style={{ fontFamily: "PlusJakartaSans-Bold", color: "#1A3A6B" }}>
            All Bookings
          </Text>
        </View>

        {/* Filters */}
        <View className="flex-row px-4 gap-2">
          {FILTERS.map((f) => {
            const count = f.key === "all"
              ? bookings.length
              : bookings.filter((b) => b.status?.startsWith(f.key)).length;
            const isActive = f.key === activeFilter;
            return (
              <TouchableOpacity
                key={f.key}
                onPress={() => setActiveFilter(f.key)}
                className="rounded-full px-4 py-1.5 flex-row items-center gap-1"
                style={{
                  backgroundColor: isActive ? "#1A3A6B" : "#F1F5F9",
                }}
              >
                <Text
                  className="text-xs"
                  style={{
                    fontFamily: "Inter-Medium",
                    color: isActive ? "#fff" : "#64748B",
                  }}
                >
                  {f.label}
                </Text>
                {count > 0 && (
                  <View
                    className="h-4 w-4 rounded-full items-center justify-center"
                    style={{ backgroundColor: isActive ? "rgba(255,255,255,0.25)" : "#E2E8F0" }}
                  >
                    <Text
                      className="text-xs"
                      style={{ fontFamily: "Inter-Medium", color: isActive ? "#fff" : "#64748B", fontSize: 9 }}
                    >
                      {count}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => <BookingCard booking={item} index={index} />}
        contentContainerStyle={{ paddingTop: 16, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#FF5733" />
        }
        ListEmptyComponent={
          !isLoading ? (
            <View className="items-center justify-center py-20">
              <Ionicons name="receipt-outline" size={48} color="#CBD5E1" />
              <Text className="mt-4 text-base" style={{ fontFamily: "PlusJakartaSans-SemiBold", color: "#94A3B8" }}>
                No {activeFilter === "all" ? "" : activeFilter} bookings
              </Text>
            </View>
          ) : null
        }
      />
    </View>
  );
}
